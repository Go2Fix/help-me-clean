package whatsapp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

// Service handles WhatsApp Business Cloud API communication.
type Service struct {
	phoneNumberID string
	accessToken   string
	verifyToken   string
	client        *http.Client
}

// NewService creates a WhatsApp service from environment variables.
// Returns nil if required env vars are not set.
func NewService() *Service {
	phoneNumberID := os.Getenv("WHATSAPP_PHONE_NUMBER_ID")
	accessToken := os.Getenv("WHATSAPP_ACCESS_TOKEN")
	verifyToken := os.Getenv("WHATSAPP_VERIFY_TOKEN")

	if phoneNumberID == "" || accessToken == "" {
		log.Println("WhatsApp: WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not set — WhatsApp disabled")
		return nil
	}

	return &Service{
		phoneNumberID: phoneNumberID,
		accessToken:   accessToken,
		verifyToken:   verifyToken,
		client:        &http.Client{},
	}
}

// IncomingMessage represents a parsed incoming WhatsApp text message.
type IncomingMessage struct {
	From    string // E.164 without +, e.g. "40712345678"
	Content string
	WaID    string // WhatsApp message ID (for deduplication)
}

// VerifyWebhook validates the Meta webhook verification handshake.
// Returns the hub.challenge value if valid, error otherwise.
func (s *Service) VerifyWebhook(mode, token, challenge string) (string, error) {
	if mode != "subscribe" {
		return "", fmt.Errorf("invalid hub.mode: %s", mode)
	}
	if token != s.verifyToken {
		return "", fmt.Errorf("hub.verify_token mismatch")
	}
	return challenge, nil
}

// ParseWebhook parses a WhatsApp webhook POST payload and returns incoming text messages.
func (s *Service) ParseWebhook(body []byte) ([]IncomingMessage, error) {
	var payload struct {
		Object string `json:"object"`
		Entry  []struct {
			Changes []struct {
				Value struct {
					Messages []struct {
						From string `json:"from"`
						ID   string `json:"id"`
						Text struct {
							Body string `json:"body"`
						} `json:"text"`
						Type string `json:"type"`
					} `json:"messages"`
				} `json:"value"`
			} `json:"changes"`
		} `json:"entry"`
	}

	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("failed to parse webhook payload: %w", err)
	}

	var messages []IncomingMessage
	for _, entry := range payload.Entry {
		for _, change := range entry.Changes {
			for _, msg := range change.Value.Messages {
				if msg.Type != "text" {
					continue // Only handle text messages for now
				}
				messages = append(messages, IncomingMessage{
					From:    msg.From,
					Content: msg.Text.Body,
					WaID:    msg.ID,
				})
			}
		}
	}

	return messages, nil
}

// SendTextMessage sends a text message to a WhatsApp number.
// toPhone must be in E.164 format without + (e.g. "40712345678").
func (s *Service) SendTextMessage(ctx context.Context, toPhone, message string) error {
	url := fmt.Sprintf("https://graph.facebook.com/v21.0/%s/messages", s.phoneNumberID)

	payload := map[string]interface{}{
		"messaging_product": "whatsapp",
		"to":                toPhone,
		"type":              "text",
		"text":              map[string]string{"body": message},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.accessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send WhatsApp message: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("WhatsApp API returned status %d", resp.StatusCode)
	}

	return nil
}

// ─── Message Templates (defined but NOT activated — for future use) ───────────
//
// Submit these to Meta for approval before activating.
// Category: UTILITY
//
// Template: "go2fix_support_reply" | Language: ro
// Body: "Buna ziua, echipa Go2Fix va raspunde in curand la mesajul dumneavoastra."
//
// Template: "go2fix_support_followup" | Language: ro
// Body: "Buna ziua {{1}}, aveti intrebari suplimentare la care sa va ajutam?"
//
// Category: MARKETING
//
// Template: "go2fix_welcome" | Language: ro
// Body: "Bun venit la Go2Fix! Suntem Romania's first home services marketplace. Puteti contacta suportul nostru oricand."
//
// To activate: call SendTemplate(ctx, phone, templateName, "ro", components) after Meta approval.
