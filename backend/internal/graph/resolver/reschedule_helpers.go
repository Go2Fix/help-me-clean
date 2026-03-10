package resolver

import (
	"context"
	"fmt"
	"log"
	"math"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	db "go2fix-backend/internal/db/generated"
)

// BookingPolicyConfig holds admin-configurable reschedule/cancel policy values.
type BookingPolicyConfig struct {
	CancelFreeHoursBefore     int
	CancelLateRefundPct       int
	CancelNoRefundHoursBefore int
	RescheduleFreeHoursBefore int
	RescheduleMaxPerBooking   int
}

// loadBookingPolicy reads booking policy settings from platform_settings,
// falling back to defaults for any missing keys.
func loadBookingPolicy(ctx context.Context, queries db.Querier) BookingPolicyConfig {
	cfg := BookingPolicyConfig{
		CancelFreeHoursBefore:     24,
		CancelLateRefundPct:       70,
		CancelNoRefundHoursBefore: 2,
		RescheduleFreeHoursBefore: 24,
		RescheduleMaxPerBooking:   2,
	}
	if v, err := queries.GetPlatformSetting(ctx, "cancel_free_hours_before"); err == nil {
		if n, err := strconv.Atoi(v.Value); err == nil && n >= 0 {
			cfg.CancelFreeHoursBefore = n
		}
	}
	if v, err := queries.GetPlatformSetting(ctx, "cancel_late_refund_pct"); err == nil {
		if n, err := strconv.Atoi(v.Value); err == nil && n >= 0 && n <= 100 {
			cfg.CancelLateRefundPct = n
		}
	}
	if v, err := queries.GetPlatformSetting(ctx, "cancel_no_refund_hours_before"); err == nil {
		if n, err := strconv.Atoi(v.Value); err == nil && n >= 0 {
			cfg.CancelNoRefundHoursBefore = n
		}
	}
	if v, err := queries.GetPlatformSetting(ctx, "reschedule_free_hours_before"); err == nil {
		if n, err := strconv.Atoi(v.Value); err == nil && n >= 0 {
			cfg.RescheduleFreeHoursBefore = n
		}
	}
	if v, err := queries.GetPlatformSetting(ctx, "reschedule_max_per_booking"); err == nil {
		if n, err := strconv.Atoi(v.Value); err == nil && n >= 0 {
			cfg.RescheduleMaxPerBooking = n
		}
	}
	return cfg
}

// hoursUntilBooking calculates how many hours remain until the scheduled booking start.
func hoursUntilBooking(scheduledDate pgtype.Date, scheduledStartTime pgtype.Time) float64 {
	if !scheduledDate.Valid {
		return 0
	}
	d := scheduledDate.Time
	micros := scheduledStartTime.Microseconds
	h := micros / 3_600_000_000
	m := (micros % 3_600_000_000) / 60_000_000
	bookingStart := time.Date(d.Year(), d.Month(), d.Day(), int(h), int(m), 0, 0, time.UTC)
	return time.Until(bookingStart).Hours()
}

// sendRescheduleNotifications sends booking_rescheduled notifications to
// client, company admin, and worker (if assigned).
// Dispatches both in-app DB notifications and email via the notification service.
func (r *Resolver) sendRescheduleNotifications(ctx context.Context, booking db.Booking, newDate, newTime string) {
	title := "Programare modificata"
	body := fmt.Sprintf("Comanda %s a fost reprogramata pentru %s ora %s.", booking.ReferenceCode, newDate, newTime)
	data := []byte(fmt.Sprintf(`{"bookingId":"%s"}`, uuidToString(booking.ID)))
	notifType := db.NotificationTypeBookingRescheduled

	// Notify client.
	if booking.ClientUserID.Valid {
		if _, err := r.Queries.CreateNotification(ctx, db.CreateNotificationParams{
			UserID: booking.ClientUserID,
			Type:   notifType,
			Title:  title,
			Body:   body,
			Data:   data,
		}); err != nil {
			log.Printf("reschedule: failed to notify client: %v", err)
		}
	}

	// Notify company admin.
	if booking.CompanyID.Valid {
		if company, err := r.Queries.GetCompanyByID(ctx, booking.CompanyID); err == nil {
			if company.AdminUserID.Valid {
				if _, err := r.Queries.CreateNotification(ctx, db.CreateNotificationParams{
					UserID: company.AdminUserID,
					Type:   notifType,
					Title:  title,
					Body:   body,
					Data:   data,
				}); err != nil {
					log.Printf("reschedule: failed to notify company admin: %v", err)
				}
			}
		}
	}

	// Notify worker.
	if booking.WorkerID.Valid {
		if worker, err := r.Queries.GetWorkerByID(ctx, booking.WorkerID); err == nil {
			if worker.UserID.Valid {
				if _, err := r.Queries.CreateNotification(ctx, db.CreateNotificationParams{
					UserID: worker.UserID,
					Type:   notifType,
					Title:  title,
					Body:   body,
					Data:   data,
				}); err != nil {
					log.Printf("reschedule: failed to notify worker: %v", err)
				}
			}
		}
	}

	// Send email notifications to all parties via notification service.
	r.dispatchBookingRescheduledEmail(ctx, booking, newDate, newTime)
}

// issueCancellationRefund issues a Stripe partial or full refund based on
// booking policy and who initiated the cancellation. It is non-blocking —
// failures are logged but do not affect the cancellation that already occurred.
//
// Rules:
//   - Cancelled by client before the free-cancel window: full refund.
//   - Cancelled by client inside the late-cancel window: partial refund
//     (CancelLateRefundPct % of estimated total).
//   - Cancelled by company or admin: full refund (client is not at fault).
//
// Only acts if the booking was paid via Stripe (payment_status = 'paid').
func (r *Resolver) issueCancellationRefund(ctx context.Context, booking db.Booking, cancelStatus db.BookingStatus) {
	if booking.PaymentStatus.String != "paid" || !booking.StripePaymentIntentID.Valid || booking.StripePaymentIntentID.String == "" {
		return
	}

	totalRON := numericToFloat(booking.EstimatedTotal)
	if totalRON <= 0 {
		return
	}
	totalBani := int64(math.Round(totalRON * 100))

	var refundBani int64
	switch cancelStatus {
	case db.BookingStatusCancelledByCompany, db.BookingStatusCancelledByAdmin:
		// Company or admin cancelled — full refund to the client.
		refundBani = totalBani
	default:
		policy := loadBookingPolicy(ctx, r.Queries)
		hoursLeft := hoursUntilBooking(booking.ScheduledDate, booking.ScheduledStartTime)
		if hoursLeft >= float64(policy.CancelFreeHoursBefore) {
			// Free cancel window — full refund
			refundBani = totalBani
		} else if hoursLeft >= float64(policy.CancelNoRefundHoursBefore) {
			// Late cancel (2-24h) — partial refund
			refundBani = int64(math.Round(totalRON * float64(policy.CancelLateRefundPct) / 100.0 * 100))
		}
		// else hoursLeft < CancelNoRefundHoursBefore: no refund (refundBani stays 0)
	}

	if refundBani <= 0 {
		return
	}

	refundID, err := r.PaymentService.CreateRefund(ctx, booking.StripePaymentIntentID.String, refundBani)
	if err != nil {
		log.Printf("cancellation: failed to issue Stripe refund for booking %s (PI %s): %v",
			uuidToString(booking.ID), booking.StripePaymentIntentID.String, err)
		return
	}
	log.Printf("cancellation: issued Stripe refund %s for booking %s (%.2f RON)",
		refundID, uuidToString(booking.ID), float64(refundBani)/100.0)
}

// issueCancellationInvoiceActions handles invoice storno/penalty creation after a client cancellation.
//
// Rules:
//   - Tier 1 (>24h, full refund): storno the original client_service invoice (100%).
//   - Tier 2 (2-24h, partial refund): storno the original invoice + create a 30% penalty invoice
//     with description "Taxă anulare rezervare <code>".
//   - Tier 3 (<2h, no refund): invoice stays valid — no action.
//
// Only acts if the booking was paid (payment_status = 'paid').
// Non-blocking — failures are logged but do not affect the cancellation.
func (r *Resolver) issueCancellationInvoiceActions(ctx context.Context, booking db.Booking, cancelStatus db.BookingStatus) {
	if booking.PaymentStatus.String != "paid" {
		return
	}

	switch cancelStatus {
	case db.BookingStatusCancelledByCompany, db.BookingStatusCancelledByAdmin:
		// Company or admin cancelled — full storno, no penalty.
		r.stornoCancellationInvoice(ctx, booking, 0)
		return
	}

	// Client cancelled — determine tier from policy.
	policy := loadBookingPolicy(ctx, r.Queries)
	hoursLeft := hoursUntilBooking(booking.ScheduledDate, booking.ScheduledStartTime)

	if hoursLeft >= float64(policy.CancelFreeHoursBefore) {
		// Tier 1: full storno, no penalty.
		r.stornoCancellationInvoice(ctx, booking, 0)
	} else if hoursLeft >= float64(policy.CancelNoRefundHoursBefore) {
		// Tier 2: storno + penalty invoice for retained percentage (100 - CancelLateRefundPct).
		penaltyPct := 100 - policy.CancelLateRefundPct
		r.stornoCancellationInvoice(ctx, booking, penaltyPct)
	}
	// Tier 3 (<2h): no action — invoice stays valid.
}

// stornoCancellationInvoice generates a credit note for the full original client_service
// invoice amount. If penaltyPct > 0, it also creates a new penalty invoice for that
// percentage of the original total (e.g. 30 means 30% is billed as a cancellation fee).
func (r *Resolver) stornoCancellationInvoice(ctx context.Context, booking db.Booking, penaltyPct int) {
	inv, err := r.Queries.GetInvoiceByBookingAndType(ctx, db.GetInvoiceByBookingAndTypeParams{
		BookingID:   booking.ID,
		InvoiceType: db.InvoiceTypeClientService,
	})
	if err != nil {
		log.Printf("cancellation invoice: no client_service invoice for booking %s: %v",
			uuidToString(booking.ID), err)
		return
	}

	totalBani := inv.TotalAmount

	creditNote, err := r.InvoiceService.GenerateCreditNote(ctx, inv.ID, totalBani, "Anulare comandă")
	if err != nil {
		log.Printf("cancellation invoice: failed to generate credit note for invoice %s: %v",
			uuidToString(inv.ID), err)
		return
	}
	log.Printf("cancellation invoice: credit note %s generated for booking %s",
		uuidToString(creditNote.ID), uuidToString(booking.ID))

	if penaltyPct <= 0 {
		return
	}

	penaltyBani := int32(math.Round(float64(totalBani) * float64(penaltyPct) / 100.0))
	description := fmt.Sprintf("Taxă anulare rezervare %s", booking.ReferenceCode)

	_, err = r.InvoiceService.CreatePenaltyInvoice(ctx, booking, penaltyBani, description)
	if err != nil {
		log.Printf("cancellation invoice: failed to create penalty invoice for booking %s: %v",
			uuidToString(booking.ID), err)
	} else {
		log.Printf("cancellation invoice: penalty invoice created for booking %s (%.2f RON)",
			uuidToString(booking.ID), float64(penaltyBani)/100.0)
	}
}
