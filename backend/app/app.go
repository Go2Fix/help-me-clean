package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	chimiddleware "github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/joho/godotenv"
	"github.com/stripe/stripe-go/v81"

	"go2fix-backend/internal/auth"
	internaldb "go2fix-backend/internal/db"
	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/graph"
	"go2fix-backend/internal/graph/resolver"
	dochandler "go2fix-backend/internal/handler"
	custommiddleware "go2fix-backend/internal/middleware"
	"go2fix-backend/internal/service/anaf"
	"go2fix-backend/internal/service/invoice"
	"go2fix-backend/internal/service/notification"
	"go2fix-backend/internal/service/payment"
	"go2fix-backend/internal/service/subscription"
	"go2fix-backend/internal/service/whatsapp"
	"go2fix-backend/internal/storage"
	"go2fix-backend/internal/webhook"
)

// NewHandler builds and returns the HTTP handler for the application plus a shutdown
// callback (which closes the database pool). Call shutdown() when the process exits.
//
// This is called both by cmd/server/main.go (long-lived server) and
// api/index.go (Vercel serverless, cached via sync.Once).
func NewHandler(ctx context.Context) (http.Handler, func(), error) {
	// Load .env in local development — no-op in production where env vars are injected.
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(custommiddleware.SecurityHeaders)

	// CORS — read from ALLOWED_ORIGINS env var (comma-separated).
	allowedOrigins := []string{"http://localhost:3000"}
	if originsEnv := os.Getenv("ALLOWED_ORIGINS"); originsEnv != "" {
		allowedOrigins = strings.Split(originsEnv, ",")
	}
	r.Use(chimiddleware.Handler(chimiddleware.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"status":"ok","version":"0.1.0"}`)
	})

	// Silence browser favicon requests to keep logs clean.
	noContent := func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusNoContent) }
	r.Get("/favicon.ico", noContent)
	r.Get("/favicon.png", noContent)

	pool, err := internaldb.NewPool(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to connect to database: %w", err)
	}
	shutdown := func() { pool.Close() }

	queries := db.New(pool)

	paymentSvc := payment.NewService(queries)
	invoiceSvc := invoice.NewService(queries)

	// Notification service — register all channels here; each returns nil if unconfigured.
	var notifChannels []notification.Channel
	if emailCh := notification.NewEmailChannel(); emailCh != nil {
		notifChannels = append(notifChannels, emailCh)
	}
	if slackCh := notification.NewSlackChannel(); slackCh != nil {
		notifChannels = append(notifChannels, slackCh)
	}
	notifChannels = append(notifChannels, notification.NewInAppChannel(queries))
	notifSvc := notification.NewService(notifChannels...)

	subscriptionSvc := subscription.NewService(queries, pool, paymentSvc, invoiceSvc)

	whatsappSvc := whatsapp.NewService()

	// File storage — always GCS.
	env := os.Getenv("ENVIRONMENT")
	gcsCredentials := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
	gcsBucket := os.Getenv("GCS_BUCKET")
	gcsProjectID := os.Getenv("GCS_PROJECT_ID")
	if gcsBucket == "" {
		return nil, shutdown, fmt.Errorf("GCS_BUCKET environment variable is required")
	}
	if gcsProjectID == "" {
		return nil, shutdown, fmt.Errorf("GCS_PROJECT_ID environment variable is required")
	}
	gcsStore, err := storage.NewGCSStorage(ctx, gcsBucket, gcsProjectID, gcsCredentials)
	if err != nil {
		return nil, shutdown, fmt.Errorf("failed to initialize GCS storage: %w", err)
	}
	store := gcsStore
	log.Printf("Using Google Cloud Storage: bucket=%s, project=%s", gcsBucket, gcsProjectID)

	// Stripe webhook — must be registered BEFORE auth middleware.
	stripeWebhook := webhook.NewStripeHandler(paymentSvc)
	r.Post("/webhook/stripe", stripeWebhook.ServeHTTP)

	// WhatsApp webhook — must be registered BEFORE auth middleware.
	if whatsappSvc != nil {
		waHandler := webhook.NewWhatsAppHandler(whatsappSvc)
		r.Get("/webhook/whatsapp", waHandler.Verify)
		r.Post("/webhook/whatsapp", waHandler.Handle)
	}

	// ANAF company lookup proxy — CORS-safe server-side relay for Romanian tax authority.
	r.Get("/api/company-lookup", anafCompanyLookupHandler())

	// Document download — public proxy that streams private files from GCS.
	// Security: document UUIDs (v4) are cryptographically unguessable.
	r.Get("/api/documents/{id}", dochandler.NewDocumentHandler(queries, store))

	authzHelper := custommiddleware.NewAuthzHelper(queries)

	res := &resolver.Resolver{
		Pool:                pool,
		Queries:             queries,
		PaymentService:      paymentSvc,
		InvoiceService:      invoiceSvc,
		NotifSvc:            notifSvc,
		SubscriptionService: subscriptionSvc,
		Storage:             store,
		AuthzHelper:         authzHelper,
		WhatsApp:            whatsappSvc,
	}

	// Wire subscription webhook callbacks.
	paymentSvc.OnSubscriptionInvoicePaid = func(ctx context.Context, stripeSubID string, periodStart, periodEnd int64) {
		if err := subscriptionSvc.HandleInvoicePaid(ctx, stripeSubID, periodStart, periodEnd); err != nil {
			log.Printf("subscription: invoice paid handler failed for %s: %v", stripeSubID, err)
		}
	}
	paymentSvc.OnSubscriptionInvoiceFailed = func(ctx context.Context, stripeSubID string) {
		if err := subscriptionSvc.HandleInvoicePaymentFailed(ctx, stripeSubID); err != nil {
			log.Printf("subscription: invoice failed handler failed for %s: %v", stripeSubID, err)
			return
		}
		// Notify client that their subscription payment failed.
		sub, sErr := queries.GetSubscriptionByStripeID(ctx, pgtype.Text{String: stripeSubID, Valid: true})
		if sErr == nil {
			if _, nErr := queries.CreateNotification(ctx, db.CreateNotificationParams{
				UserID: sub.ClientUserID,
				Type:   db.NotificationTypeSubscriptionCancelled,
				Title:  "Plată eșuată pentru abonament",
				Body:   "Nu am putut procesa plata pentru abonamentul tău. Te rugăm să actualizezi metoda de plată.",
				Data:   []byte(fmt.Sprintf(`{"subscriptionId":"%s"}`, sub.ID.String())),
			}); nErr != nil {
				log.Printf("subscription: failed to notify client of payment failure for %s: %v", stripeSubID, nErr)
			}
		}
	}
	paymentSvc.OnSubscriptionUpdated = func(ctx context.Context, stripeSubID string, status stripe.SubscriptionStatus, periodStart, periodEnd int64) {
		if err := subscriptionSvc.HandleSubscriptionUpdated(ctx, stripeSubID, status, periodStart, periodEnd); err != nil {
			log.Printf("subscription: update handler failed for %s: %v", stripeSubID, err)
		}
	}
	paymentSvc.OnSubscriptionDeleted = func(ctx context.Context, stripeSubID string) {
		if err := subscriptionSvc.HandleSubscriptionDeleted(ctx, stripeSubID); err != nil {
			log.Printf("subscription: delete handler failed for %s: %v", stripeSubID, err)
		}
	}

	srv := handler.New(graph.NewExecutableSchema(graph.Config{
		Resolvers: res,
	}))
	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.GET{})
	srv.AddTransport(transport.POST{})
	srv.AddTransport(transport.MultipartForm{})

	if env != "production" {
		srv.Use(extension.Introspection{})
	}

	srv.Use(extension.FixedComplexityLimit(200))
	srv.Use(custommiddleware.QueryDepthLimitExtension{
		MaxDepth: custommiddleware.MaxQueryDepth(),
	})
	srv.SetErrorPresenter(custommiddleware.ErrorPresenter())
	srv.SetRecoverFunc(custommiddleware.RecoverFunc())

	if env != "production" {
		r.Handle("/graphql", playground.Handler("Go2Fix GraphQL", "/query"))
	}

	r.With(
		auth.AuthMiddleware,
		custommiddleware.InjectResponseWriter,
	).Handle("/query", srv)

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		fmt.Fprintf(w, `<h1>Go2Fix API</h1><p>GraphQL playground: <a href="/graphql">/graphql</a></p>`)
	})

	return r, shutdown, nil
}

// anafCompanyLookupHandler returns the ANAF company lookup proxy handler.
// All ANAF communication is delegated to the anaf service package; this
// handler is only responsible for HTTP concerns (parsing the query param,
// mapping results to the JSON shape expected by the registration form, and
// returning appropriate HTTP status codes).
//
// GET /api/company-lookup?cui=<CUI>
//
// Response shapes:
//
//	200 {"found":true,  "companyName":..., "streetAddress":..., "city":..., "county":..., "contactPhone":..., "nrRegCom":..., "codCaen":...}
//	200 {"found":false}
//	400 {"error":"invalid cui"}     — CUI param is missing or non-numeric
//	503 {"error":"anaf unreachable"} — ANAF API is down / timed out
func anafCompanyLookupHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		cuiStr := strings.TrimSpace(req.URL.Query().Get("cui"))
		if cuiStr == "" {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":"invalid cui"}`, http.StatusBadRequest)
			return
		}

		result, err := anaf.Lookup(req.Context(), cuiStr)
		if err != nil {
			if errors.Is(err, anaf.ErrUnavailable) {
				w.Header().Set("Content-Type", "application/json")
				http.Error(w, `{"error":"anaf unreachable"}`, http.StatusServiceUnavailable)
				return
			}
			// Unexpected error — treat as service unavailable.
			log.Printf("anaf: unexpected error for cui=%s: %v", cuiStr, err)
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":"anaf unreachable"}`, http.StatusServiceUnavailable)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if !result.Found {
			w.Write([]byte(`{"found":false}`)) //nolint:errcheck
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{ //nolint:errcheck
			"found":         true,
			"companyName":   result.DenumireTitled,
			"streetAddress": result.StreetAddr,
			"city":          result.City,
			"county":        result.County,
			"contactPhone":  result.Telefon,
			"nrRegCom":      result.NrRegCom,
			"codCaen":       result.CodCAEN,
		})
	}
}
