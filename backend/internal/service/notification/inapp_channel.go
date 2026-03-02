package notification

import (
	"context"
	"encoding/json"
	"log"

	"github.com/jackc/pgx/v5/pgtype"

	db "go2fix-backend/internal/db/generated"
)

// inAppDef describes how to render an in-app notification for a given Event.
type inAppDef struct {
	notifType db.NotificationType
	title     func(Payload) string
	body      func(Payload) string
}

// strPayload extracts a string value from the payload map.
// Returns fallback when the key is absent or the value is empty.
func strPayload(p Payload, key, fallback string) string {
	if v, ok := p[key]; ok {
		if s, ok := v.(string); ok && s != "" {
			return s
		}
	}
	return fallback
}

// eventToInAppDef maps each Event to its in-app notification definition.
// Events not in this map are silently skipped by InAppChannel.
var eventToInAppDef = map[Event]inAppDef{
	// Booking lifecycle
	EventBookingConfirmedClient: {
		notifType: db.NotificationTypeBookingCreated,
		title:     func(_ Payload) string { return "Rezervare confirmată" },
		body: func(p Payload) string {
			return "Comanda #" + strPayload(p, "referenceCode", "") + " a fost confirmată"
		},
	},
	EventBookingNewRequestCompany: {
		notifType: db.NotificationTypeBookingCreated,
		title:     func(_ Payload) string { return "Cerere nouă" },
		body: func(p Payload) string {
			return "Cerere de la " + strPayload(p, "clientName", "client") + " pentru " + strPayload(p, "serviceName", "serviciu")
		},
	},
	EventBookingWorkerAssignedClient: {
		notifType: db.NotificationTypeBookingAssigned,
		title:     func(_ Payload) string { return "Lucrătorul a fost desemnat" },
		body: func(p Payload) string {
			return "Comanda #" + strPayload(p, "referenceCode", "") + " — lucrătorul este pe drum"
		},
	},
	EventJobAssignedWorker: {
		notifType: db.NotificationTypeBookingAssigned,
		title:     func(_ Payload) string { return "Job nou asignat" },
		body: func(p Payload) string {
			return strPayload(p, "serviceName", "Serviciu") + " — " + strPayload(p, "scheduledDate", "")
		},
	},
	EventBookingCompleted: {
		notifType: db.NotificationTypeBookingCompleted,
		title:     func(_ Payload) string { return "Serviciu finalizat" },
		body: func(p Payload) string {
			return "Comanda #" + strPayload(p, "referenceCode", "") + " a fost finalizată. Lasă o recenzie!"
		},
	},
	EventBookingCancelledByClient: {
		notifType: db.NotificationTypeBookingCancelled,
		title:     func(_ Payload) string { return "Rezervare anulată" },
		body: func(p Payload) string {
			return "Clientul a anulat comanda #" + strPayload(p, "referenceCode", "")
		},
	},
	EventBookingCancelledByAdmin: {
		notifType: db.NotificationTypeBookingCancelled,
		title:     func(_ Payload) string { return "Rezervare anulată" },
		body: func(p Payload) string {
			return "Comanda #" + strPayload(p, "referenceCode", "") + " a fost anulată de platformă"
		},
	},
	EventBookingRescheduled: {
		notifType: db.NotificationTypeBookingRescheduled,
		title:     func(_ Payload) string { return "Reprogramare" },
		body: func(p Payload) string {
			return "Comanda #" + strPayload(p, "referenceCode", "") + " a fost reprogramată"
		},
	},

	// Company lifecycle
	EventCompanyApproved: {
		notifType: db.NotificationTypeCompanyApproved,
		title:     func(_ Payload) string { return "Companie aprobată!" },
		body:      func(_ Payload) string { return "Felicitări! Compania ta este acum activă pe Go2Fix" },
	},
	EventCompanyRejected: {
		notifType: db.NotificationTypeCompanyRejected,
		title:     func(_ Payload) string { return "Cerere respinsă" },
		body:      func(_ Payload) string { return "Cererea companiei tale a fost respinsă" },
	},
	// Types below were added via migration 000052 and will be present in DB but not yet
	// in the sqlc-generated constants — we use raw string literals until regenerated.
	EventCompanyApplicationReceived: {
		notifType: db.NotificationType("company_application_received"),
		title:     func(_ Payload) string { return "Cerere primită" },
		body:      func(_ Payload) string { return "Cererea ta de înregistrare a fost primită. Vom reveni în curând" },
	},
	EventCompanySuspended: {
		notifType: db.NotificationType("company_suspended"),
		title:     func(_ Payload) string { return "Companie suspendată" },
		body:      func(_ Payload) string { return "Contul companiei tale a fost suspendat" },
	},
	EventDocumentApproved: {
		notifType: db.NotificationType("document_approved"),
		title:     func(_ Payload) string { return "Document aprobat" },
		body:      func(_ Payload) string { return "Documentul tău a fost aprobat" },
	},
	EventDocumentRejected: {
		notifType: db.NotificationType("document_rejected"),
		title:     func(_ Payload) string { return "Document respins" },
		body:      func(_ Payload) string { return "Documentul tău necesită atenție" },
	},

	// Worker lifecycle
	EventWorkerInvited: {
		notifType: db.NotificationTypeCleanerInvited,
		title:     func(_ Payload) string { return "Invitație primită" },
		body: func(p Payload) string {
			return "Ești invitat să te alături echipei " + strPayload(p, "companyName", "")
		},
	},
	EventWorkerAccepted: {
		notifType: db.NotificationType("worker_accepted"),
		title:     func(_ Payload) string { return "Invitație acceptată" },
		body: func(p Payload) string {
			return strPayload(p, "name", "Lucrătorul") + " a acceptat invitația ta"
		},
	},
	EventWorkerActivated: {
		notifType: db.NotificationType("worker_activated"),
		title:     func(_ Payload) string { return "Cont activat" },
		body:      func(_ Payload) string { return "Contul tău de lucrător este acum activ" },
	},

	// Invoices
	EventInvoiceReady: {
		notifType: db.NotificationType("invoice_ready"),
		title:     func(_ Payload) string { return "Factură disponibilă" },
		body: func(p Payload) string {
			return "Factura #" + strPayload(p, "invoiceNumber", "") + " este disponibilă"
		},
	},
	EventInvoicePaid: {
		notifType: db.NotificationTypePaymentProcessed,
		title:     func(_ Payload) string { return "Factură plătită" },
		body: func(p Payload) string {
			return "Factura #" + strPayload(p, "invoiceNumber", "") + " a fost marcată ca plătită"
		},
	},

	// Subscriptions
	EventSubscriptionConfirmed: {
		notifType: db.NotificationType("subscription_confirmed"),
		title:     func(_ Payload) string { return "Abonament activat" },
		body:      func(_ Payload) string { return "Abonamentul tău este acum activ" },
	},
	EventSubscriptionCancelled: {
		notifType: db.NotificationType("subscription_cancelled"),
		title:     func(_ Payload) string { return "Abonament anulat" },
		body:      func(_ Payload) string { return "Abonamentul tău a fost anulat" },
	},

	// Account
	EventAccountSuspended: {
		notifType: db.NotificationType("account_suspended"),
		title:     func(_ Payload) string { return "Cont suspendat" },
		body:      func(_ Payload) string { return "Contul tău a fost suspendat" },
	},
	EventAccountReactivated: {
		notifType: db.NotificationType("account_reactivated"),
		title:     func(_ Payload) string { return "Cont reactivat" },
		body:      func(_ Payload) string { return "Contul tău a fost reactivat" },
	},
}

// buildInAppData builds a minimal JSON object for deep-linking from well-known payload keys.
// Returns nil when no relevant keys are present.
func buildInAppData(p Payload) []byte {
	data := make(map[string]any)
	for _, key := range []string{"bookingId", "referenceCode", "invoiceId", "invoiceNumber", "companyId"} {
		if v, ok := p[key]; ok {
			if s, ok := v.(string); ok && s != "" {
				data[key] = s
			}
		}
	}
	if len(data) == 0 {
		return nil
	}
	b, err := json.Marshal(data)
	if err != nil {
		return nil
	}
	return b
}

// InAppChannel stores notifications in the database for display in the UI.
// It implements the Channel interface.
type InAppChannel struct {
	queries *db.Queries
}

// NewInAppChannel creates an InAppChannel backed by the given query set.
// Never returns nil.
func NewInAppChannel(q *db.Queries) *InAppChannel {
	return &InAppChannel{queries: q}
}

// Name implements Channel.
func (c *InAppChannel) Name() string { return "inapp" }

// Send implements Channel. For each target with a non-empty UserID it writes
// one row to the notifications table. Errors are logged individually and do
// not cause Send to return an error — in-app notifications are best-effort.
func (c *InAppChannel) Send(ctx context.Context, event Event, payload Payload, targets []Target) error {
	def, ok := eventToInAppDef[event]
	if !ok {
		// Event not mapped to an in-app notification — skip silently.
		return nil
	}

	title := def.title(payload)
	body := def.body(payload)
	data := buildInAppData(payload)

	for _, t := range targets {
		if t.UserID == "" {
			continue
		}

		var uid pgtype.UUID
		if err := uid.Scan(t.UserID); err != nil {
			log.Printf("[notification/inapp] invalid userID %s: %v", t.UserID, err)
			continue
		}

		_, err := c.queries.CreateNotification(ctx, db.CreateNotificationParams{
			UserID: uid,
			Type:   def.notifType,
			Title:  title,
			Body:   body,
			Data:   data,
		})
		if err != nil {
			log.Printf("[notification/inapp] failed to create notification for user %s event %s: %v", t.UserID, event, err)
		}
	}
	return nil
}
