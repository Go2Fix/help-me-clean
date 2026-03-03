package webhook

import (
	"fmt"
	"log"
	"net/http"

	"go2fix-backend/internal/service/whatsapp"
)

// WhatsAppHandler handles incoming WhatsApp webhook events.
type WhatsAppHandler struct {
	Svc *whatsapp.Service
}

// NewWhatsAppHandler creates a new WhatsApp webhook handler.
func NewWhatsAppHandler(svc *whatsapp.Service) *WhatsAppHandler {
	return &WhatsAppHandler{Svc: svc}
}

// Verify handles the GET verification handshake from Meta.
func (h *WhatsAppHandler) Verify(w http.ResponseWriter, r *http.Request) {
	mode := r.URL.Query().Get("hub.mode")
	token := r.URL.Query().Get("hub.verify_token")
	challenge := r.URL.Query().Get("hub.challenge")

	result, err := h.Svc.VerifyWebhook(mode, token, challenge)
	if err != nil {
		log.Printf("WhatsApp webhook verification failed: %v", err)
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, result)
}

// Handle processes incoming WhatsApp message events.
func (h *WhatsAppHandler) Handle(w http.ResponseWriter, r *http.Request) {
	log.Println("WhatsApp message received")
	w.WriteHeader(http.StatusOK)
}
