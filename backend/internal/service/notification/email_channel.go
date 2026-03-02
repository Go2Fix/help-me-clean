package notification

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	resend "github.com/resend/resend-go/v2"
)

// emailTemplateEnvVars maps each Event to the name of the env var that holds
// the Resend broadcast/template ID for that event. When the env var is set,
// the channel builds the HTML from a pre-defined branded template; otherwise
// it falls back to an inline plain-HTML email.
//
// NOTE: resend-go/v2 SendEmailRequest has no TemplateName/Data field — Resend
// React-email templates are compiled offline. We therefore always send HTML
// directly and use template IDs only as a future hook (e.g. when switching to
// Resend Broadcasts or a proxy renderer). For now the env vars are read and
// stored but only the HTML fallback path is used in production.
var emailTemplateEnvVars = map[Event]string{
	EventOTPCode:                     "RESEND_TEMPLATE_OTP",
	EventWelcomeClient:               "RESEND_TEMPLATE_WELCOME_CLIENT",
	EventWelcomeCompanyAdmin:         "RESEND_TEMPLATE_WELCOME_COMPANY",
	EventWelcomeWorker:               "RESEND_TEMPLATE_WELCOME_WORKER",
	EventBookingConfirmedClient:      "RESEND_TEMPLATE_BOOKING_CONFIRMATION",
	EventBookingNewRequestCompany:    "RESEND_TEMPLATE_BOOKING_NEW_COMPANY",
	EventBookingWorkerAssignedClient: "RESEND_TEMPLATE_BOOKING_WORKER_ASSIGNED_CLIENT",
	EventJobAssignedWorker:           "RESEND_TEMPLATE_BOOKING_WORKER_ASSIGNED_WORKER",
	EventBookingCompleted:            "RESEND_TEMPLATE_BOOKING_COMPLETED",
	EventBookingCancelledByClient:    "RESEND_TEMPLATE_BOOKING_CANCELLED_CLIENT",
	EventBookingCancelledByAdmin:     "RESEND_TEMPLATE_BOOKING_CANCELLED_CLIENT",
	EventBookingRescheduled:          "RESEND_TEMPLATE_BOOKING_RESCHEDULED",
	EventCompanyApplicationReceived:  "RESEND_TEMPLATE_COMPANY_APPLICATION",
	EventCompanyApproved:             "RESEND_TEMPLATE_COMPANY_APPROVED",
	EventCompanyRejected:             "RESEND_TEMPLATE_COMPANY_REJECTED",
	EventCompanySuspended:            "RESEND_TEMPLATE_COMPANY_SUSPENDED",
	EventWorkerInvited:               "RESEND_TEMPLATE_WORKER_INVITATION",
	EventInvoiceReady:                "RESEND_TEMPLATE_INVOICE_READY",
	EventWaitlistJoined:              "RESEND_TEMPLATE_WAITLIST_CONFIRMATION",
	EventAccountSuspended:            "RESEND_TEMPLATE_ACCOUNT_SUSPENDED",
}

// emailSubjects provides Romanian-language subjects for every event.
var emailSubjects = map[Event]string{
	EventOTPCode:                     "Codul tău de autentificare Go2Fix",
	EventWelcomeClient:               "Bun venit pe Go2Fix!",
	EventWelcomeCompanyAdmin:         "Bun venit pe Go2Fix — contul companiei tale",
	EventWelcomeWorker:               "Bun venit în echipa Go2Fix!",
	EventBookingConfirmedClient:      "Rezervarea ta a fost confirmată",
	EventBookingNewRequestCompany:    "Rezervare nouă primită",
	EventBookingWorkerAssignedClient: "Lucrătorul tău a fost desemnat",
	EventJobAssignedWorker:           "Job nou asignat",
	EventBookingCompleted:            "Serviciul a fost finalizat — lasă o recenzie",
	EventBookingCancelledByClient:    "Rezervare anulată",
	EventBookingCancelledByAdmin:     "Rezervarea a fost anulată de platformă",
	EventBookingRescheduled:          "Rezervare reprogramată",
	EventCompanyApplicationReceived:  "Cererea ta a fost primită",
	EventCompanyApproved:             "Compania ta a fost aprobată pe Go2Fix!",
	EventCompanyRejected:             "Actualizare cerere companie",
	EventCompanySuspended:            "Contul companiei tale a fost suspendat",
	EventDocumentApproved:            "Documentul tău a fost aprobat",
	EventDocumentRejected:            "Documentul tău necesită atenție",
	EventWorkerInvited:               "Ești invitat să te alături echipei",
	EventWorkerAccepted:              "Lucrătorul a acceptat invitația",
	EventWorkerActivated:             "Contul tău a fost activat",
	EventInvoiceReady:                "Factura ta este disponibilă",
	EventInvoicePaid:                 "Factură marcată ca plătită",
	EventSubscriptionConfirmed:       "Abonamentul tău a fost creat",
	EventSubscriptionCancelled:       "Abonamentul tău a fost anulat",
	EventAccountSuspended:            "Contul tău a fost suspendat",
	EventAccountReactivated:          "Contul tău a fost reactivat",
	EventWaitlistJoined:              "Ești pe lista de așteptare Go2Fix!",
}

// EmailChannel delivers notifications via Resend.
type EmailChannel struct {
	client     *resend.Client
	from       string
	audienceID string
	// templates holds resolved event → template-ID pairs (informational only;
	// the v2 SDK sends raw HTML, not template references).
	templates map[Event]string
}

// NewEmailChannel reads RESEND_API_KEY and RESEND_FROM_EMAIL from env and resolves
// all template IDs. The audience ID is resolved automatically: if RESEND_AUDIENCE_ID
// is set it is used directly; otherwise the first existing Resend audience is used;
// if none exists a new "Go2Fix Users" audience is created. Returns nil if RESEND_API_KEY
// is not set.
func NewEmailChannel() *EmailChannel {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		log.Println("[notification/email] RESEND_API_KEY not set — email channel disabled")
		return nil
	}
	from := os.Getenv("RESEND_FROM_EMAIL")
	if from == "" {
		from = "Go2Fix <noreply@go2fix.ro>"
	}

	templates := make(map[Event]string)
	for event, envVar := range emailTemplateEnvVars {
		if id := os.Getenv(envVar); id != "" {
			templates[event] = id
		}
	}

	client := resend.NewClient(apiKey)
	audienceID := resolveAudienceID(client)

	return &EmailChannel{
		client:     client,
		from:       from,
		audienceID: audienceID,
		templates:  templates,
	}
}

// resolveAudienceID returns the audience ID to use for contact management.
// Priority: RESEND_AUDIENCE_ID env var → first existing audience → newly created audience.
func resolveAudienceID(client *resend.Client) string {
	if id := os.Getenv("RESEND_AUDIENCE_ID"); id != "" {
		return id
	}

	// List existing audiences — use the first one found.
	resp, err := client.Audiences.List()
	if err == nil && len(resp.Data) > 0 {
		id := resp.Data[0].Id
		log.Printf("[notification/email] using Resend audience id=%s name=%q", id, resp.Data[0].Name)
		return id
	}

	// No audience found — create one.
	created, err := client.Audiences.Create(&resend.CreateAudienceRequest{Name: "Go2Fix Users"})
	if err != nil {
		log.Printf("[notification/email] failed to create Resend audience: %v — contact upserts disabled", err)
		return ""
	}
	log.Printf("[notification/email] created Resend audience id=%s", created.Id)
	return created.Id
}

// Name implements Channel.
func (e *EmailChannel) Name() string { return "email" }

// Send implements Channel. Iterates over targets and sends one email per target.
// For EventWelcomeClient it also schedules day-3 and day-7 onboarding follow-ups.
func (e *EmailChannel) Send(ctx context.Context, event Event, payload Payload, targets []Target) error {
	if e == nil {
		return nil
	}
	for _, target := range targets {
		if target.Email == "" {
			continue
		}
		if err := e.sendToTarget(event, payload, target); err != nil {
			log.Printf("[notification/email] failed to send %s to %s: %v", event, target.Email, err)
		}
	}

	// Schedule onboarding sequence for new clients.
	if event == EventWelcomeClient {
		for _, target := range targets {
			e.scheduleOnboarding(target)
		}
	}
	return nil
}

// sendToTarget builds and sends a single email via the Resend API.
func (e *EmailChannel) sendToTarget(event Event, payload Payload, target Target) error {
	subject, ok := emailSubjects[event]
	if !ok {
		subject = "Notificare Go2Fix"
	}

	req := &resend.SendEmailRequest{
		From:    e.from,
		To:      []string{target.Email},
		Subject: subject,
		Html:    buildEventHTML(event, subject, target.Name, payload),
	}

	_, err := e.client.Emails.Send(req)
	return err
}

// scheduleOnboarding schedules day-3 and day-7 follow-up emails for new clients.
// Each follow-up is only sent when the corresponding env var template ID is set.
func (e *EmailChannel) scheduleOnboarding(target Target) {
	type onboardingStep struct {
		delay int
		env   string
	}
	steps := []onboardingStep{
		{3, "RESEND_TEMPLATE_ONBOARDING_DAY3"},
		{7, "RESEND_TEMPLATE_ONBOARDING_DAY7"},
	}

	for _, step := range steps {
		// Only schedule when the operator has configured a template ID.
		// Without it there is nothing meaningful to say, so we skip silently.
		if os.Getenv(step.env) == "" {
			continue
		}

		subject := fmt.Sprintf("Continuă să descoperi Go2Fix — ziua %d", step.delay)
		scheduledAt := time.Now().AddDate(0, 0, step.delay).Format(time.RFC3339)
		req := &resend.SendEmailRequest{
			From:        e.from,
			To:          []string{target.Email},
			Subject:     subject,
			Html:        buildFallbackHTML(subject, target.Name, nil),
			ScheduledAt: scheduledAt,
		}
		if _, err := e.client.Emails.Send(req); err != nil {
			log.Printf("[notification/email] failed to schedule day-%d onboarding for %s: %v", step.delay, target.Email, err)
		}
	}
}

// buildEventHTML returns branded HTML for a given event.
// For the OTP event it renders the full OTP code block; for all other events
// it renders a concise generic message.
func buildEventHTML(event Event, subject, name string, payload Payload) string {
	if event == EventOTPCode {
		code, _ := payload["code"].(string)
		return buildOTPHTML(name, code)
	}
	return buildFallbackHTML(subject, name, payload)
}

// buildOTPHTML renders the OTP-specific branded email template.
func buildOTPHTML(name, code string) string {
	greeting := name
	if greeting == "" {
		greeting = "utilizator"
	}
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAFBFC;font-family:'Inter',Arial,sans-serif;">
<div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:12px;padding:40px;border:1px solid #e5e7eb;">
  <div style="margin-bottom:24px;">
    <span style="font-size:24px;font-weight:800;color:#2563EB;">Go2Fix</span>
  </div>
  <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 8px 0;">
    Codul tău de autentificare
  </h2>
  <p style="color:#6B7280;font-size:14px;margin:0 0 24px 0;">
    Salut %s, folosește codul de mai jos pentru a te autentifica.<br>
    Codul este valabil <strong>10 minute</strong>.
  </p>
  <div style="background:#EFF6FF;border:2px solid #2563EB;border-radius:12px;padding:28px 24px;text-align:center;margin-bottom:24px;">
    <span style="font-size:40px;font-weight:900;letter-spacing:10px;color:#2563EB;font-family:'Courier New',monospace;">%s</span>
  </div>
  <p style="color:#9CA3AF;font-size:12px;margin:0;">
    Dacă nu ai solicitat acest cod, poți ignora acest email în siguranță.
  </p>
</div>
</body>
</html>`, greeting, code)
}

// buildFallbackHTML creates a minimal branded email for any event that lacks a
// dedicated template. The payload key-value pairs are rendered as a simple list.
func buildFallbackHTML(subject, name string, payload Payload) string {
	greeting := name
	if greeting == "" {
		greeting = "utilizator"
	}
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#FAFBFC;font-family:'Inter',Arial,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;padding:40px;border:1px solid #e5e7eb;">
  <div style="margin-bottom:24px;">
    <span style="font-size:24px;font-weight:800;color:#2563EB;">Go2Fix</span>
  </div>
  <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 16px 0;">%s</h2>
  <p style="color:#6B7280;font-size:14px;">Salut %s,</p>
  <div style="color:#6B7280;font-size:14px;">%s</div>
  <p style="color:#9CA3AF;font-size:12px;margin-top:32px;">Echipa Go2Fix</p>
</div>
</body>
</html>`, subject, greeting, buildPayloadLines(payload))
}

// buildPayloadLines renders payload key-value pairs as HTML lines.
func buildPayloadLines(payload Payload) string {
	if len(payload) == 0 {
		return ""
	}
	result := ""
	for k, v := range payload {
		result += fmt.Sprintf("<p><strong>%s:</strong> %v</p>", k, v)
	}
	return result
}
