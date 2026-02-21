package webhook

import (
	"io"
	"log"
	"net/http"

	"go2fix-backend/internal/service/payment"
)

// maxBodySize is the maximum allowed request body size for Stripe webhooks.
const maxBodySize = 65536

// StripeHandler handles incoming Stripe webhook HTTP requests.
// It reads the raw request body and delegates signature verification
// and event processing to the payment service.
type StripeHandler struct {
	paymentService *payment.Service
}

// NewStripeHandler creates a new StripeHandler with the given payment service.
func NewStripeHandler(paymentService *payment.Service) *StripeHandler {
	return &StripeHandler{paymentService: paymentService}
}

// ServeHTTP handles an incoming Stripe webhook request.
// It reads the raw body, extracts the Stripe-Signature header, and
// delegates to the payment service for verification and processing.
// Stripe expects a 200 response promptly; errors are logged but still
// return 200 to prevent unnecessary retries for application-level issues.
func (h *StripeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Only accept POST requests.
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	// Limit the request body to prevent abuse.
	r.Body = http.MaxBytesReader(w, r.Body, maxBodySize)

	payload, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("stripe webhook: failed to read request body: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"failed to read request body"}`))
		return
	}

	sigHeader := r.Header.Get("Stripe-Signature")
	if sigHeader == "" {
		log.Println("stripe webhook: missing Stripe-Signature header")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"missing Stripe-Signature header"}`))
		return
	}

	if err := h.paymentService.HandleWebhookEvent(r.Context(), payload, sigHeader); err != nil {
		// Log the error for observability but still return 200 to Stripe.
		// Signature verification failures are the exception -- they indicate
		// a tampered or replayed request, so we reject with 400.
		log.Printf("stripe webhook: error handling event: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"webhook processing failed"}`))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"received":true}`))
}
