package resolver

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/graph/model"
)

// createRecurringGroupInput holds the parameters for creating a recurring booking group.
type createRecurringGroupInput struct {
	clientUserID        pgtype.UUID
	companyID           pgtype.UUID
	workerID           pgtype.UUID
	addressID           pgtype.UUID
	recurrenceType      db.RecurrenceType
	dayOfWeek           int
	preferredTime       time.Time
	serviceType         db.ServiceType
	propertyType        *string
	numRooms            int
	numBathrooms        int
	areaSqm             *int
	hasPets             *bool
	specialInstructions *string
	hourlyRate          float64
	estimatedTotal      float64
	estimatedHours      float64
	extras              []*model.ExtraInput
	firstBooking        db.Booking
}

// createRecurringGroup creates the recurring_booking_groups row, links the first booking,
// and generates 7 future occurrence bookings (total 8 with the first one).
func (r *Resolver) createRecurringGroup(ctx context.Context, input createRecurringGroupInput) (db.RecurringBookingGroup, error) {
	preferredTimeMicros := int64(input.preferredTime.Hour())*3_600_000_000 + int64(input.preferredTime.Minute())*60_000_000

	group, err := r.Queries.CreateRecurringGroup(ctx, db.CreateRecurringGroupParams{
		ClientUserID:                input.clientUserID,
		CompanyID:                   input.companyID,
		PreferredWorkerID:          input.workerID,
		AddressID:                   input.addressID,
		RecurrenceType:              input.recurrenceType,
		DayOfWeek:                   pgtype.Int4{Int32: int32(input.dayOfWeek), Valid: true},
		PreferredTime:               pgtype.Time{Microseconds: preferredTimeMicros, Valid: true},
		ServiceType:                 input.serviceType,
		PropertyType:                stringToText(input.propertyType),
		NumRooms:                    intToInt4Val(input.numRooms),
		NumBathrooms:                intToInt4Val(input.numBathrooms),
		AreaSqm:                     intToInt4(input.areaSqm),
		HasPets:                     boolToPgBool(input.hasPets),
		SpecialInstructions:         stringToText(input.specialInstructions),
		HourlyRate:                  float64ToNumeric(input.hourlyRate),
		EstimatedTotalPerOccurrence: float64ToNumeric(input.estimatedTotal),
	})
	if err != nil {
		return db.RecurringBookingGroup{}, fmt.Errorf("failed to create recurring group: %w", err)
	}

	// Insert extras for the group.
	if input.extras != nil {
		for _, extra := range input.extras {
			_ = r.Queries.InsertRecurringGroupExtra(ctx, db.InsertRecurringGroupExtraParams{
				GroupID:  group.ID,
				ExtraID:  stringToUUID(extra.ExtraID),
				Quantity: pgtype.Int4{Int32: int32(extra.Quantity), Valid: true},
			})
		}
	}

	// Link first booking to the group.
	_, err = r.Pool.Exec(ctx,
		"UPDATE bookings SET recurring_group_id = $1, occurrence_number = 1 WHERE id = $2",
		group.ID, input.firstBooking.ID,
	)
	if err != nil {
		log.Printf("failed to link first booking to recurring group: %v", err)
	}

	// Generate 7 more occurrence dates (total 8).
	firstDate := input.firstBooking.ScheduledDate.Time
	futureDates := generateOccurrenceDates(input.recurrenceType, firstDate, 7)

	for i, occDate := range futureDates {
		occNum := i + 2 // occurrence 2 through 8

		// Find available worker for this date.
		assignedWorkerID := r.findAvailableWorkerForDate(ctx, input.workerID, input.companyID, occDate)

		refCode := fmt.Sprintf("G2F-%d", time.Now().UnixNano()%1000000+int64(occNum))

		booking, createErr := r.Queries.CreateBooking(ctx, db.CreateBookingParams{
			ReferenceCode:          refCode,
			ClientUserID:           input.clientUserID,
			AddressID:              input.addressID,
			ServiceType:            input.serviceType,
			ScheduledDate:          pgtype.Date{Time: occDate, Valid: true},
			ScheduledStartTime:     pgtype.Time{Microseconds: preferredTimeMicros, Valid: true},
			EstimatedDurationHours: float64ToNumeric(input.estimatedHours),
			PropertyType:           stringToText(input.propertyType),
			NumRooms:               intToInt4Val(input.numRooms),
			NumBathrooms:           intToInt4Val(input.numBathrooms),
			AreaSqm:                intToInt4(input.areaSqm),
			HasPets:                boolToPgBool(input.hasPets),
			SpecialInstructions:    stringToText(input.specialInstructions),
			HourlyRate:             float64ToNumeric(input.hourlyRate),
			EstimatedTotal:         float64ToNumeric(input.estimatedTotal),
			RecurringGroupID:       group.ID,
			OccurrenceNumber:       pgtype.Int4{Int32: int32(occNum), Valid: true},
		})
		if createErr != nil {
			log.Printf("failed to create occurrence %d: %v", occNum, createErr)
			continue
		}

		// Assign worker + company to the occurrence.
		_, _ = r.Queries.SetBookingPreferredWorker(ctx, db.SetBookingPreferredWorkerParams{
			ID:        booking.ID,
			CompanyID: input.companyID,
			WorkerID: assignedWorkerID,
		})

		// Copy extras to booking_extras.
		if input.extras != nil {
			for _, extra := range input.extras {
				extraDef, extraErr := r.Queries.GetExtraByID(ctx, stringToUUID(extra.ExtraID))
				if extraErr == nil {
					_ = r.Queries.InsertBookingExtra(ctx, db.InsertBookingExtraParams{
						BookingID: booking.ID,
						ExtraID:   stringToUUID(extra.ExtraID),
						Price:     extraDef.Price,
						Quantity:  pgtype.Int4{Int32: int32(extra.Quantity), Valid: true},
					})
				}
			}
		}
	}

	return group, nil
}

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
		DateFrom:  pgtype.Date{Time: date, Valid: true},
		DateTo:    pgtype.Date{Time: date, Valid: true},
	})
	if err != nil {
		return false
	}
	return len(bookings) > 0
}

// enrichRecurringGroup populates related entities on a recurring group GQL model.
func (r *Resolver) enrichRecurringGroup(ctx context.Context, g db.RecurringBookingGroup) (*model.RecurringBookingGroup, error) {
	gql := dbRecurringGroupToGQL(g)

	// Service name.
	if svc, err := r.Queries.GetServiceByType(ctx, g.ServiceType); err == nil {
		gql.ServiceName = svc.NameRo
	} else {
		gql.ServiceName = string(g.ServiceType)
	}

	// Client.
	if g.ClientUserID.Valid {
		if user, err := r.Queries.GetUserByID(ctx, g.ClientUserID); err == nil {
			gql.Client = dbUserToGQL(user)
		}
	}

	// Company.
	if g.CompanyID.Valid {
		if company, err := r.Queries.GetCompanyByID(ctx, g.CompanyID); err == nil {
			gql.Company = dbCompanyToGQL(company)
		}
	}

	// Preferred worker with full profile (User/Company/Documents/PersonalityAssessment).
	if g.PreferredWorkerID.Valid {
		if worker, err := r.Queries.GetWorkerByID(ctx, g.PreferredWorkerID); err == nil {
			if profile, err := r.workerWithCompany(ctx, worker); err == nil {
				gql.PreferredWorker = profile
			} else {
				log.Printf("Failed to load preferred worker: %v", err)
				// Fallback: load user separately and create basic profile
				if user, userErr := r.Queries.GetUserByID(ctx, worker.UserID); userErr == nil {
					gql.PreferredWorker = dbWorkerToGQL(worker, &user)
				}
			}
		}
	}

	// Address.
	if g.AddressID.Valid {
		if addr, err := r.Queries.GetAddressByID(ctx, g.AddressID); err == nil {
			gql.Address = dbAddressToGQL(addr)
		}
	}

	// All occurrences.
	allBookings, err := r.Queries.GetBookingsByRecurringGroup(ctx, g.ID)
	if err == nil {
		completedCount := 0
		for _, b := range allBookings {
			gqlB := dbBookingToGQL(b)
			r.enrichBooking(ctx, b, gqlB)
			gql.Occurrences = append(gql.Occurrences, gqlB)
			if b.Status == db.BookingStatusCompleted {
				completedCount++
			}
		}
		gql.TotalOccurrences = len(allBookings)
		gql.CompletedOccurrences = completedCount
	}

	// Upcoming occurrences.
	upcomingBookings, err := r.Queries.GetUpcomingBookingsByRecurringGroup(ctx, g.ID)
	if err == nil {
		for _, b := range upcomingBookings {
			gqlB := dbBookingToGQL(b)
			r.enrichBooking(ctx, b, gqlB)
			gql.UpcomingOccurrences = append(gql.UpcomingOccurrences, gqlB)
		}
	}

	return gql, nil
}
