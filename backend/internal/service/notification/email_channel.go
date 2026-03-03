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

// emailHeader is the shared top bar used in every email.
const emailHeader = `
<table width="100%%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="background:#2563EB;padding:20px 40px;border-radius:16px 16px 0 0;">
      <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;font-family:'Inter',Arial,sans-serif;">Go2Fix</span>
    </td>
  </tr>
</table>`

// emailFooter is the shared bottom bar used in every email.
const emailFooter = `
<table width="100%%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 40px;border-radius:0 0 16px 16px;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;font-family:'Inter',Arial,sans-serif;">
        &copy; 2026 Go2Fix SRL &nbsp;&middot;&nbsp;
        <a href="https://go2fix.ro" style="color:#9CA3AF;text-decoration:none;">go2fix.ro</a>
      </p>
    </td>
  </tr>
</table>`

// emailWrapper wraps header + body + footer inside a centered card on a gray background.
// body is injected as-is between header and footer.
func emailWrapper(body string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Inter',Arial,sans-serif;">
<table width="100%%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 16px;">
  <tr>
    <td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #E5E7EB;">
        <tr><td>%s</td></tr>
        <tr><td>%s</td></tr>
        <tr><td>%s</td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`, emailHeader, body, emailFooter)
}

// buildOTPHTML renders the OTP-specific branded email template.
func buildOTPHTML(name, code string) string {
	greeting := name
	if greeting == "" {
		greeting = "utilizator"
	}
	body := fmt.Sprintf(`
<table width="100%%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding:40px 40px 36px 40px;">
      <!-- Hidden preheader -->
      <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
        Valabil 10 minute. Nu-l distribui nimănui.
      </span>

      <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:1.5px;">
        Autentificare
      </p>
      <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">
        Codul tău de verificare
      </h1>
      <p style="margin:0 0 32px 0;font-size:15px;color:#6B7280;line-height:1.7;">
        Salut <strong style="color:#111827;">%s</strong>, folosește codul de mai jos
        pentru a te autentifica în contul Go2Fix.<br>
        Codul expiră în <strong style="color:#111827;">10 minute</strong>.
      </p>

      <!-- OTP code box -->
      <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
        <tr>
          <td style="background:#EFF6FF;border:2px solid #2563EB;border-radius:12px;padding:28px 24px;text-align:center;">
            <span style="font-size:42px;font-weight:900;letter-spacing:14px;color:#2563EB;font-family:'Courier New',monospace;">%s</span>
          </td>
        </tr>
      </table>

      <!-- Timer hint -->
      <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td style="background:#FFFBEB;border-left:3px solid #F59E0B;border-radius:0 8px 8px 0;padding:12px 16px;">
            <p style="margin:0;font-size:13px;color:#92400E;">
              &#9201;&nbsp; Codul este valabil doar <strong>10 minute</strong> de la primire.
            </p>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;">
        Dacă nu ai solicitat acest cod, cineva a introdus adresa ta de email din greșeală.
        Poți ignora în siguranță acest mesaj — contul tău nu este afectat.
      </p>
    </td>
  </tr>
</table>`, greeting, code)

	return emailWrapper(body)
}

// buildFallbackHTML creates a professional branded email for any event that lacks a
// dedicated template. The payload key-value pairs are rendered as a styled list.
func buildFallbackHTML(subject, name string, payload Payload) string {
	greeting := name
	if greeting == "" {
		greeting = "utilizator"
	}
	body := fmt.Sprintf(`
<table width="100%%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding:40px 40px 36px 40px;">
      <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">%s</h1>
      <p style="margin:0 0 24px 0;font-size:15px;color:#6B7280;line-height:1.7;">
        Salut <strong style="color:#111827;">%s</strong>,
      </p>
      %s
      <p style="margin:32px 0 0 0;font-size:14px;color:#6B7280;">
        Cu drag,<br>
        <strong style="color:#111827;">Echipa Go2Fix</strong>
      </p>
    </td>
  </tr>
</table>`, subject, greeting, buildPayloadLines(payload))

	return emailWrapper(body)
}

// buildPayloadLines renders payload key-value pairs as styled HTML rows.
func buildPayloadLines(payload Payload) string {
	if len(payload) == 0 {
		return ""
	}
	result := `<table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">`
	for k, v := range payload {
		result += fmt.Sprintf(`
  <tr>
    <td style="padding:10px 16px;background:#F9FAFB;border-radius:8px;margin-bottom:4px;font-size:14px;color:#374151;">
      <span style="color:#6B7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">%s</span><br>
      <span style="color:#111827;font-weight:500;">%v</span>
    </td>
  </tr>`, k, v)
	}
	result += `</table>`
	return result
}
