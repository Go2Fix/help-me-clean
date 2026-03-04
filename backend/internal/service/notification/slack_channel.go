package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

// eventToSlackChannel maps each event to a named webhook slot.
// The slot name matches the key in SlackChannel.webhooks.
var eventToSlackChannel = map[Event]string{
	// Bookings
	EventBookingConfirmedClient:      "bookings",
	EventBookingNewRequestCompany:    "bookings",
	EventBookingWorkerAssignedClient: "bookings",
	EventJobAssignedWorker:           "bookings",
	EventBookingCompleted:            "bookings",
	EventBookingCancelledByClient:    "bookings",
	EventBookingCancelledByAdmin:     "bookings",
	EventBookingRescheduled:          "bookings",

	// Companies
	EventCompanyApplicationReceived: "companies",
	EventCompanyApproved:            "companies",
	EventCompanyRejected:            "companies",
	EventCompanySuspended:           "companies",
	EventDocumentApproved:           "companies",
	EventDocumentRejected:           "companies",

	// Disputes
	EventDisputeOpened:   "companies",
	EventDisputeResolved: "companies",

	// Workers
	EventWorkerInvited:  "workers",
	EventWorkerAccepted: "workers",
	EventWorkerActivated: "workers",

	// Revenue
	EventInvoiceReady:          "revenue",
	EventInvoicePaid:           "revenue",
	EventSubscriptionConfirmed: "revenue",
	EventSubscriptionCancelled: "revenue",

	// Growth
	EventWelcomeClient:       "growth",
	EventWelcomeCompanyAdmin: "growth",
	EventWelcomeWorker:       "growth",
	EventWaitlistJoined:      "growth",
	EventAccountSuspended:    "growth",
	EventAccountReactivated:  "growth",
	EventContactMessage:      "growth",
}

// slackEventLabels provides a human-readable label and emoji for each event.
var slackEventLabels = map[Event][2]string{
	EventBookingConfirmedClient:      {"📋", "New Booking"},
	EventBookingNewRequestCompany:    {"📋", "Booking Request"},
	EventBookingWorkerAssignedClient: {"👷", "Worker Assigned"},
	EventJobAssignedWorker:           {"👷", "Job Assigned"},
	EventBookingCompleted:            {"✅", "Booking Completed"},
	EventBookingCancelledByClient:    {"❌", "Booking Cancelled (client)"},
	EventBookingCancelledByAdmin:     {"❌", "Booking Cancelled (admin)"},
	EventBookingRescheduled:          {"📅", "Booking Rescheduled"},

	EventCompanyApplicationReceived: {"🏢", "Company Application"},
	EventCompanyApproved:            {"🎉", "Company Approved"},
	EventCompanyRejected:            {"🚫", "Company Rejected"},
	EventCompanySuspended:           {"⚠️", "Company Suspended"},
	EventDocumentApproved:           {"📄", "Document Approved"},
	EventDocumentRejected:           {"📄", "Document Rejected"},

	EventDisputeOpened:   {"⚖️", "Dispute Opened"},
	EventDisputeResolved: {"⚖️", "Dispute Resolved"},

	EventContactMessage: {"✉️", "Contact Form"},

	EventWorkerInvited:   {"📨", "Worker Invited"},
	EventWorkerAccepted:  {"🤝", "Worker Accepted"},
	EventWorkerActivated: {"🟢", "Worker Activated"},

	EventInvoiceReady:          {"🧾", "Invoice Ready"},
	EventInvoicePaid:           {"💳", "Invoice Paid"},
	EventSubscriptionConfirmed: {"💳", "Subscription Confirmed"},
	EventSubscriptionCancelled: {"💳", "Subscription Cancelled"},

	EventWelcomeClient:       {"🚀", "New Client Signup"},
	EventWelcomeCompanyAdmin: {"🚀", "New Company Signup"},
	EventWelcomeWorker:       {"🚀", "New Worker Signup"},
	EventWaitlistJoined:      {"⏳", "Waitlist Join"},
	EventAccountSuspended:    {"🔒", "Account Suspended"},
	EventAccountReactivated:  {"🔓", "Account Reactivated"},
}

// SlackChannel delivers notifications to Slack via Incoming Webhooks.
// In development all events are routed to a single #go2fix-dev webhook.
// In production each event category has its own webhook.
type SlackChannel struct {
	webhooks map[string]string // slot-name → webhook URL
	devHook  string
	isProd   bool
}

// NewSlackChannel reads webhook URLs from env vars and returns a configured
// SlackChannel. Returns nil if no webhook URLs are configured at all.
func NewSlackChannel() *SlackChannel {
	devHook := os.Getenv("SLACK_WEBHOOK_DEV")
	hooks := map[string]string{
		"bookings":  os.Getenv("SLACK_WEBHOOK_BOOKINGS"),
		"companies": os.Getenv("SLACK_WEBHOOK_COMPANIES"),
		"workers":   os.Getenv("SLACK_WEBHOOK_WORKERS"),
		"revenue":   os.Getenv("SLACK_WEBHOOK_REVENUE"),
		"growth":    os.Getenv("SLACK_WEBHOOK_GROWTH"),
	}

	allEmpty := devHook == ""
	for _, v := range hooks {
		if v != "" {
			allEmpty = false
			break
		}
	}
	if allEmpty {
		return nil
	}

	return &SlackChannel{
		webhooks: hooks,
		devHook:  devHook,
		isProd:   os.Getenv("ENVIRONMENT") == "production",
	}
}

// Name implements Channel.
func (s *SlackChannel) Name() string { return "slack" }

// Send implements Channel. Routes each event to the appropriate Slack webhook.
func (s *SlackChannel) Send(_ context.Context, event Event, payload Payload, targets []Target) error {
	text := buildSlackMessage(event, payload, targets)

	var webhookURL string
	if !s.isProd {
		// Dev: all events go to the single dev channel.
		webhookURL = s.devHook
	} else {
		slot := eventToSlackChannel[event]
		webhookURL = s.webhooks[slot]
	}

	if webhookURL == "" {
		return nil // webhook not configured for this event — skip silently
	}

	return postSlack(webhookURL, text)
}

// buildSlackMessage formats a Slack message for the given event.
// Contact form messages get a multi-line format; all others get a concise one-liner.
func buildSlackMessage(event Event, payload Payload, targets []Target) string {
	// Contact form: rich multi-line message.
	if event == EventContactMessage {
		name := fmt.Sprintf("%v", payload["name"])
		email := fmt.Sprintf("%v", payload["email"])
		subject := fmt.Sprintf("%v", payload["subject"])
		message := fmt.Sprintf("%v", payload["message"])
		return fmt.Sprintf("✉️ *Contact Form* — %s <%s>\n*Subiect:* %s\n*Mesaj:* %s", name, email, subject, message)
	}

	emoji := "🔔"
	label := string(event)
	if parts, ok := slackEventLabels[event]; ok {
		emoji = parts[0]
		label = parts[1]
	}

	// Collect meaningful context from payload and targets.
	detail := payloadDetail(payload, targets)
	if detail != "" {
		return fmt.Sprintf("%s *%s* — %s", emoji, label, detail)
	}
	return fmt.Sprintf("%s *%s*", emoji, label)
}

// payloadDetail extracts a human-readable summary from the payload and targets.
func payloadDetail(payload Payload, targets []Target) string {
	// Try common payload keys in priority order.
	for _, key := range []string{"referenceCode", "companyName", "invoiceNumber", "city", "subject"} {
		if v, ok := payload[key]; ok && v != "" && v != nil {
			if name := targetName(targets); name != "" {
				return fmt.Sprintf("%v · %v", name, v)
			}
			return fmt.Sprintf("%v", v)
		}
	}
	if name := targetName(targets); name != "" {
		return name
	}
	// Fall back to first target email.
	if len(targets) > 0 && targets[0].Email != "" {
		return targets[0].Email
	}
	return ""
}

// targetName returns the name of the first target that has one.
func targetName(targets []Target) string {
	for _, t := range targets {
		if t.Name != "" {
			return t.Name
		}
	}
	return ""
}

// postSlack sends a plain-text message to a Slack Incoming Webhook URL.
func postSlack(webhookURL, text string) error {
	body, err := json.Marshal(map[string]string{"text": text})
	if err != nil {
		return fmt.Errorf("slack: marshal: %w", err)
	}

	resp, err := http.Post(webhookURL, "application/json", bytes.NewReader(body)) //nolint:noctx
	if err != nil {
		return fmt.Errorf("slack: post: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[notification/slack] unexpected status %d for webhook", resp.StatusCode)
	}
	return nil
}
