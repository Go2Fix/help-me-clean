package resolver

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	db "go2fix-backend/internal/db/generated"
)

// generateOccurrenceDates generates future dates based on recurrence type.
// Returns `count` dates after the firstDate.
func generateOccurrenceDates(recType db.RecurrenceType, firstDate time.Time, count int) []time.Time {
	dates := make([]time.Time, 0, count)
	current := firstDate

	for i := 0; i < count; i++ {
		switch recType {
		case db.RecurrenceTypeWeekly:
			current = current.AddDate(0, 0, 7)
		case db.RecurrenceTypeBiweekly:
			current = current.AddDate(0, 0, 14)
		case db.RecurrenceTypeMonthly:
			current = current.AddDate(0, 1, 0)
		}
		dates = append(dates, current)
	}

	return dates
}

// findAvailableWorkerForDate checks if the preferred worker is available on the given date.
// If not, returns an available teammate from the same company.
// Falls back to the preferred worker if no teammate is available.
func (r *Resolver) findAvailableWorkerForDate(ctx context.Context, preferredWorkerID, companyID pgtype.UUID, date time.Time) pgtype.UUID {
	// Check if preferred worker has a conflicting booking on this date.
	if !r.hasConflictOnDate(ctx, preferredWorkerID, date) {
		return preferredWorkerID
	}

	// Find a teammate from the same company who is available.
	teammates, err := r.Queries.ListWorkersByCompany(ctx, companyID)
	if err != nil {
		return preferredWorkerID // fallback
	}

	for _, mate := range teammates {
		if mate.ID == preferredWorkerID {
			continue
		}
		if string(mate.Status) != "active" {
			continue
		}
		if !r.hasConflictOnDate(ctx, mate.ID, date) {
			return mate.ID
		}
	}

	// No available teammate — fall back to preferred worker.
	return preferredWorkerID
}

// hasConflictOnDate checks if a worker already has a booking on the given date.
func (r *Resolver) hasConflictOnDate(ctx context.Context, workerID pgtype.UUID, date time.Time) bool {
	bookings, err := r.Queries.ListBookingsByWorkerAndDateRange(ctx, db.ListBookingsByWorkerAndDateRangeParams{
		WorkerID: workerID,
		DateFrom: pgtype.Date{Time: date, Valid: true},
		DateTo:   pgtype.Date{Time: date, Valid: true},
	})
	if err != nil {
		return false
	}
	return len(bookings) > 0
}
