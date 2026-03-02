package resolver

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	db "go2fix-backend/internal/db/generated"
)

// BookingPolicyConfig holds admin-configurable reschedule/cancel policy values.
type BookingPolicyConfig struct {
	CancelFreeHoursBefore     int
	CancelLateRefundPct       int
	RescheduleFreeHoursBefore int
	RescheduleMaxPerBooking   int
}

// loadBookingPolicy reads booking policy settings from platform_settings,
// falling back to defaults for any missing keys.
func loadBookingPolicy(ctx context.Context, queries *db.Queries) BookingPolicyConfig {
	cfg := BookingPolicyConfig{
		CancelFreeHoursBefore:     48,
		CancelLateRefundPct:       50,
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

	// Send email notifications to all parties via notification service (non-blocking).
	r.dispatchBookingRescheduledEmail(booking, newDate, newTime)
}
