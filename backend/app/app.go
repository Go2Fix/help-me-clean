package app

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	chimiddleware "github.com/go-chi/cors"
	"github.com/joho/godotenv"
	"github.com/stripe/stripe-go/v81"

	"go2fix-backend/internal/auth"
	internaldb "go2fix-backend/internal/db"
	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/graph"
	"go2fix-backend/internal/graph/resolver"
	dochandler "go2fix-backend/internal/handler"
	custommiddleware "go2fix-backend/internal/middleware"
	"go2fix-backend/internal/service/email"
	"go2fix-backend/internal/service/invoice"
	"go2fix-backend/internal/service/payment"
	"go2fix-backend/internal/service/subscription"
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

	pool, err := internaldb.NewPool(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to connect to database: %w", err)
	}
	shutdown := func() { pool.Close() }

	queries := db.New(pool)

	paymentSvc := payment.NewService(queries)
	invoiceSvc := invoice.NewService(queries)
	emailSvc := email.NewService()
	subscriptionSvc := subscription.NewService(queries, pool, paymentSvc, invoiceSvc)

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
		EmailService:        emailSvc,
		SubscriptionService: subscriptionSvc,
		Storage:             store,
		AuthzHelper:         authzHelper,
	}

	// Wire auto-confirm callback: when payment webhook succeeds, create chat room.
	paymentSvc.OnBookingConfirmed = func(ctx context.Context, booking db.Booking) {
		res.CreateBookingChatFromPayment(ctx, booking)
	}

	// Wire auto-invoice callback: when payment succeeds, generate client service invoice.
	paymentSvc.OnPaymentSucceeded = func(ctx context.Context, booking db.Booking, txn db.PaymentTransaction) {
		if !booking.CompanyID.Valid {
			log.Printf("invoice: booking %s has no company, skipping auto-invoice", booking.ReferenceCode)
			return
		}
		company, err := queries.GetCompanyByID(ctx, booking.CompanyID)
		if err != nil {
			log.Printf("invoice: failed to load company for booking %s: %v", booking.ReferenceCode, err)
			return
		}
		_, err = invoiceSvc.GenerateClientServiceInvoice(ctx, booking, company, booking.ClientUserID)
		if err != nil {
			log.Printf("invoice: auto-generation failed for booking %s: %v", booking.ReferenceCode, err)
		}
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

	srv.Use(extension.FixedComplexityLimit(100))
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
func anafCompanyLookupHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		cuiStr := strings.TrimSpace(req.URL.Query().Get("cui"))
		cuiStr = strings.TrimPrefix(strings.ToUpper(cuiStr), "RO")
		cuiNum, err := strconv.Atoi(strings.TrimSpace(cuiStr))
		if err != nil || cuiNum <= 0 {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":"invalid cui"}`, http.StatusBadRequest)
			return
		}
		today := time.Now().Format("2006-01-02")
		payload, _ := json.Marshal([]map[string]interface{}{{"cui": cuiNum, "data": today}})
		resp, err := http.Post(
			"https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva",
			"application/json",
			bytes.NewReader(payload),
		)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":"anaf unreachable"}`, http.StatusServiceUnavailable)
			return
		}
		defer resp.Body.Close()
		var anafResp struct {
			Found []struct {
				DateGenerale struct {
					Denumire string `json:"denumire"`
					Adresa   string `json:"adresa"`
					Telefon  string `json:"telefon"`
					NrRegCom string `json:"nrRegCom"`
					CodCAEN  string `json:"cod_CAEN"`
				} `json:"date_generale"`
			} `json:"found"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&anafResp); err != nil || len(anafResp.Found) == 0 {
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"found":false}`)) //nolint:errcheck
			return
		}
		dg := anafResp.Found[0].DateGenerale
		city, county, streetAddr := parseANAFAddress(dg.Adresa)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{ //nolint:errcheck
			"found":         true,
			"companyName":   titleCaseRO(strings.TrimSpace(dg.Denumire)),
			"streetAddress": streetAddr,
			"city":          city,
			"county":        county,
			"contactPhone":  strings.TrimSpace(dg.Telefon),
			"nrRegCom":      strings.TrimSpace(dg.NrRegCom),
			"codCaen":       strings.TrimSpace(dg.CodCAEN),
		})
	}
}

// titleCaseRO converts an ALL-CAPS Romanian string to Title Case using unicode-safe rune ops.
func titleCaseRO(s string) string {
	words := strings.Fields(strings.ToLower(s))
	for i, w := range words {
		runes := []rune(w)
		if len(runes) > 0 {
			runes[0] = unicode.ToUpper(runes[0])
			words[i] = string(runes)
		}
	}
	return strings.Join(words, " ")
}

// parseANAFAddress splits the ANAF flat address string into city, county and street.
// ANAF format: "MUNICIPIUL BUCUREȘTI, SECTOR 1, STR. XYZ, NR. 1, ..."
//
//	"MUNICIPIUL CLUJ-NAPOCA, JUD. CLUJ, STR. XYZ, NR. 5"
func parseANAFAddress(adresa string) (city, county, street string) {
	parts := strings.SplitN(adresa, ", ", 3)
	if len(parts) == 0 {
		return "", "", adresa
	}

	cityRaw := strings.TrimSpace(parts[0])
	for _, pfx := range []string{"MUNICIPIUL ", "ORAȘ ", "ORAŞ ", "COMUNĂ ", "COMUNA ", "SAT ", "SECTOR "} {
		if strings.HasPrefix(cityRaw, pfx) {
			cityRaw = strings.TrimPrefix(cityRaw, pfx)
			break
		}
	}
	city = titleCaseRO(cityRaw)

	if len(parts) < 2 {
		return city, "", ""
	}

	countyRaw := strings.TrimSpace(parts[1])
	for _, pfx := range []string{"JUDEȚ ", "JUDET ", "JUDEȚUL ", "JUDETUL ", "JUD. ", "JUD "} {
		if strings.HasPrefix(countyRaw, pfx) {
			countyRaw = strings.TrimPrefix(countyRaw, pfx)
			break
		}
	}
	county = titleCaseRO(countyRaw)

	if len(parts) < 3 {
		return city, county, ""
	}

	street = titleCaseRO(strings.TrimSpace(parts[2]))
	return city, county, street
}
