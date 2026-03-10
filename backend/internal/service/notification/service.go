package notification

import (
	"context"
	"log"
	"os"
)

// Event identifies which notification to send — drives template selection per channel.
type Event string

const (
	// Auth
	EventOTPCode             Event = "otp_code"
	EventWelcomeClient       Event = "welcome_client"
	EventWelcomeCompanyAdmin Event = "welcome_company_admin"
	EventWelcomeWorker       Event = "welcome_worker"

	// Booking lifecycle
	EventBookingConfirmedClient      Event = "booking_confirmed_client"
	EventBookingNewRequestCompany    Event = "booking_new_request_company"
	EventBookingWorkerAssignedClient Event = "booking_worker_assigned_client"
	EventJobAssignedWorker           Event = "job_assigned_worker"
	EventBookingCompleted            Event = "booking_completed"
	EventBookingCancelledByClient    Event = "booking_cancelled_by_client"
	EventBookingCancelledByAdmin     Event = "booking_cancelled_by_admin"
	EventBookingRescheduled          Event = "booking_rescheduled"

	// Company lifecycle
	EventCompanyApplicationReceived Event = "company_application_received"
	EventCompanyApproved            Event = "company_approved"
	EventCompanyRejected            Event = "company_rejected"
	EventCompanySuspended           Event = "company_suspended"
	EventDocumentApproved           Event = "document_approved"
	EventDocumentRejected           Event = "document_rejected"

	// Worker lifecycle
	EventWorkerInvited   Event = "worker_invited"
	EventWorkerAccepted  Event = "worker_accepted"
	EventWorkerActivated Event = "worker_activated"

	// Invoices
	EventInvoiceReady Event = "invoice_ready"
	EventInvoicePaid  Event = "invoice_paid"

	// Subscriptions
	EventSubscriptionConfirmed Event = "subscription_confirmed"
	EventSubscriptionCancelled Event = "subscription_cancelled"

	// Disputes
	EventDisputeOpened   Event = "dispute_opened"
	EventDisputeResolved Event = "dispute_resolved"

	// Account
	EventAccountSuspended   Event = "account_suspended"
	EventAccountReactivated Event = "account_reactivated"

	// Waitlist
	EventWaitlistJoined Event = "waitlist_joined"

	// Contact form
	EventContactMessage Event = "contact_message"
)

// Target is a notification recipient.
type Target struct {
	UserID   string
	Email    string
	Name     string
	Role     string // "client" | "company_admin" | "worker"
	Language string // "ro" | "en"
}

// Payload is free-form data passed to template variables.
type Payload map[string]any

// Channel is the interface implemented by each notification destination.
type Channel interface {
	Name() string
	Send(ctx context.Context, event Event, payload Payload, targets []Target) error
}

// Service dispatches notifications to all registered channels.
// In non-production environments all dispatches are no-ops (logged to console).
type Service struct {
	channels []Channel
	isProd   bool
}

// NewService creates a NotificationService. Pass all channel implementations to register.
func NewService(channels ...Channel) *Service {
	return &Service{
		channels: channels,
		isProd:   os.Getenv("ENVIRONMENT") == "production",
	}
}

// Dispatch sends the event to all channels asynchronously.
// Email is suppressed in non-production to avoid sending real emails during development/staging.
// Slack and in-app channels always fire so the admin gets real-time visibility.
func (s *Service) Dispatch(event Event, payload Payload, targets []Target) {
	for _, ch := range s.channels {
		ch := ch
		// Suppress email in non-production to avoid sending real emails during development/staging.
		// Slack and in-app channels always fire so the admin gets real-time visibility.
		if !s.isProd && ch.Name() == "email" {
			emails := make([]string, len(targets))
			for i, t := range targets {
				emails[i] = t.Email
			}
			log.Printf("[notification:dev] suppressed email event=%s targets=%v payload=%v", event, emails, payload)
			continue
		}
		go func() {
			if err := ch.Send(context.Background(), event, payload, targets); err != nil {
				log.Printf("[notification] channel=%s event=%s error: %v", ch.Name(), event, err)
			}
		}()
	}
}

// DispatchSync sends the event to all channels synchronously.
// Use only for time-sensitive flows (e.g., OTP, waitlist) where the caller must
// ensure delivery before returning (e.g., serverless environments).
// All channels are attempted even if one fails.
func (s *Service) DispatchSync(ctx context.Context, event Event, payload Payload, targets []Target) error {
	if !s.isProd {
		emails := make([]string, len(targets))
		for i, t := range targets {
			emails[i] = t.Email
		}
		log.Printf("[notification:dev] sync event=%s targets=%v payload=%v", event, emails, payload)
		return nil
	}
	var lastErr error
	for _, ch := range s.channels {
		if err := ch.Send(ctx, event, payload, targets); err != nil {
			log.Printf("[notification] channel=%s event=%s error: %v", ch.Name(), event, err)
			lastErr = err
		}
	}
	return lastErr
}

// UpsertContact creates or updates a contact in the audience of any email channel registered.
// Best-effort — errors are logged internally.
func (s *Service) UpsertContact(ctx context.Context, data ContactData) {
	for _, ch := range s.channels {
		if e, ok := ch.(*EmailChannel); ok {
			e.UpsertContact(ctx, data)
		}
	}
}

// RemoveFromWaitlistAudiences removes a contact from any configured waitlist audiences.
// Used when a waitlist lead registers as a full user — they should be moved to the
// main audience instead. Best-effort — errors are logged, not propagated.
func (s *Service) RemoveFromWaitlistAudiences(ctx context.Context, email string) {
	for _, ch := range s.channels {
		if e, ok := ch.(*EmailChannel); ok {
			if e.segmentWaitlistClientID != "" {
				e.DeleteContact(ctx, e.segmentWaitlistClientID, email)
			}
			if e.segmentWaitlistCompanyID != "" {
				e.DeleteContact(ctx, e.segmentWaitlistCompanyID, email)
			}
		}
	}
}
