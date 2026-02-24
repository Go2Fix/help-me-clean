package resolver

import (
	"context"
	"fmt"
	"log"
	"math"
	"strings"
	"time"

	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/graph/model"

	"github.com/jackc/pgx/v5/pgtype"
)

// dbSubscriptionToGQL converts a DB subscription to a GQL ServiceSubscription.
func dbSubscriptionToGQL(s db.Subscription) *model.ServiceSubscription {
	return &model.ServiceSubscription{
		ID:                     uuidToString(s.ID),
		RecurrenceType:         dbRecurrenceTypeToGQL(s.RecurrenceType),
		DayOfWeek:              int4Ptr(s.DayOfWeek),
		PreferredTime:          timeToString(s.PreferredTime),
		ServiceType:            dbServiceTypeToGQL(s.ServiceType),
		PropertyType:           textPtr(s.PropertyType),
		NumRooms:               int4Ptr(s.NumRooms),
		NumBathrooms:           int4Ptr(s.NumBathrooms),
		AreaSqm:                int4Ptr(s.AreaSqm),
		HasPets:                boolPtr(s.HasPets),
		SpecialInstructions:    textPtr(s.SpecialInstructions),
		HourlyRate:             numericToFloat(s.HourlyRate),
		EstimatedDurationHours: numericToFloat(s.EstimatedDurationHours),
		PerSessionOriginal:     numericToFloat(s.PerSessionOriginal),
		DiscountPct:            numericToFloat(s.DiscountPct),
		PerSessionDiscounted:   numericToFloat(s.PerSessionDiscounted),
		SessionsPerMonth:       int(s.SessionsPerMonth),
		MonthlyAmount:          numericToFloat(s.MonthlyAmount),
		PlatformCommissionPct:  numericToFloat(s.PlatformCommissionPct),
		StripeSubscriptionID:   textPtr(s.StripeSubscriptionID),
		Status:                 dbSubscriptionStatusToGQL(s.Status),
		CurrentPeriodStart:     timestamptzToTimePtr(s.CurrentPeriodStart),
		CurrentPeriodEnd:       timestamptzToTimePtr(s.CurrentPeriodEnd),
		CancelledAt:            timestamptzToTimePtr(s.CancelledAt),
		CancellationReason:     textPtr(s.CancellationReason),
		PausedAt:                timestamptzToTimePtr(s.PausedAt),
		CreatedAt:               timestamptzToTime(s.CreatedAt),
		WorkerChangeRequestedAt: timestamptzToTimePtr(s.WorkerChangeRequestedAt),
		WorkerChangeReason:      textPtr(s.WorkerChangeReason),
		Bookings:               []*model.Booking{},
		UpcomingBookings:       []*model.Booking{},
		Extras:                 []*model.BookingExtra{},
	}
}

// enrichSubscription populates related entities on a GQL subscription.
func (r *Resolver) enrichSubscription(ctx context.Context, s db.Subscription, gql *model.ServiceSubscription) {
	// Service name.
	if svc, err := r.Queries.GetServiceByType(ctx, s.ServiceType); err == nil {
		gql.ServiceName = svc.NameRo
	} else {
		gql.ServiceName = string(s.ServiceType)
	}

	// Client.
	if s.ClientUserID.Valid {
		if user, err := r.Queries.GetUserByID(ctx, s.ClientUserID); err == nil {
			gql.Client = dbUserToGQL(user)
		}
	}

	// Company.
	if s.CompanyID.Valid {
		if company, err := r.Queries.GetCompanyByID(ctx, s.CompanyID); err == nil {
			gql.Company = dbCompanyToGQL(company)
		}
	}

	// Worker.
	if s.WorkerID.Valid {
		if worker, err := r.Queries.GetWorkerByID(ctx, s.WorkerID); err == nil {
			if profile, err := r.workerWithCompany(ctx, worker); err == nil {
				gql.Worker = profile
			}
		}
	}

	// Address.
	if s.AddressID.Valid {
		if addr, err := r.Queries.GetAddressByID(ctx, s.AddressID); err == nil {
			gql.Address = dbAddressToGQL(addr)
		}
	}

	// All bookings (lightweight — only load worker name, skip full enrichBooking).
	allBookings, err := r.Queries.GetBookingsBySubscription(ctx, s.ID)
	if err == nil {
		completedCount := 0
		for _, b := range allBookings {
			gqlB := dbBookingToGQL(b)
			r.enrichBookingWorkerOnly(ctx, b, gqlB)
			gql.Bookings = append(gql.Bookings, gqlB)
			if b.Status == db.BookingStatusCompleted {
				completedCount++
			}
		}
		gql.TotalBookings = len(allBookings)
		gql.CompletedBookings = completedCount
	}

	// Upcoming bookings (lightweight).
	upcomingBookings, err := r.Queries.GetUpcomingBookingsBySubscription(ctx, s.ID)
	if err == nil {
		for _, b := range upcomingBookings {
			gqlB := dbBookingToGQL(b)
			r.enrichBookingWorkerOnly(ctx, b, gqlB)
			gql.UpcomingBookings = append(gql.UpcomingBookings, gqlB)
		}
	}

	// Subscription extras.
	subExtras, err := r.Queries.GetSubscriptionExtras(ctx, s.ID)
	if err == nil {
		for _, se := range subExtras {
			gql.Extras = append(gql.Extras, &model.BookingExtra{
				Extra: &model.ServiceExtra{
					ID:              uuidToString(se.ExtraID),
					NameRo:          se.NameRo,
					NameEn:          se.NameEn,
					Price:           numericToFloat(se.Price),
					DurationMinutes: int(se.DurationMinutes),
					IsActive:        true,
				},
				Price:    numericToFloat(se.Price),
				Quantity: int4Val(se.Quantity),
			})
		}
	}
}

// enrichSubscriptionForList populates only the fields needed by the list page:
// serviceName, worker (name only), company (name only), upcoming bookings, and booking counts.
func (r *Resolver) enrichSubscriptionForList(ctx context.Context, s db.Subscription, gql *model.ServiceSubscription) {
	// Service name.
	if svc, err := r.Queries.GetServiceByType(ctx, s.ServiceType); err == nil {
		gql.ServiceName = svc.NameRo
	} else {
		gql.ServiceName = string(s.ServiceType)
	}

	// Company (name only).
	if s.CompanyID.Valid {
		if company, err := r.Queries.GetCompanyByID(ctx, s.CompanyID); err == nil {
			gql.Company = &model.Company{
				ID:          uuidToString(company.ID),
				CompanyName: company.CompanyName,
			}
		}
	}

	// Worker (name only — skip full workerWithCompany which loads company + stats).
	if s.WorkerID.Valid {
		if worker, err := r.Queries.GetWorkerByID(ctx, s.WorkerID); err == nil {
			if user, err := r.Queries.GetUserByID(ctx, worker.UserID); err == nil {
				gql.Worker = &model.WorkerProfile{
					ID:       uuidToString(worker.ID),
					FullName: user.FullName,
				}
			}
		}
	}

	// Booking counts (without loading all booking rows).
	allBookings, err := r.Queries.GetBookingsBySubscription(ctx, s.ID)
	if err == nil {
		completedCount := 0
		for _, b := range allBookings {
			if b.Status == db.BookingStatusCompleted {
				completedCount++
			}
		}
		gql.TotalBookings = len(allBookings)
		gql.CompletedBookings = completedCount
	}

	// Upcoming bookings (lightweight).
	upcomingBookings, err := r.Queries.GetUpcomingBookingsBySubscription(ctx, s.ID)
	if err == nil {
		for _, b := range upcomingBookings {
			gqlB := dbBookingToGQL(b)
			gql.UpcomingBookings = append(gql.UpcomingBookings, gqlB)
		}
	}
}

// dbRecurringDiscountToGQL converts a DB recurring discount to GQL.
func dbRecurringDiscountToGQL(d db.RecurringDiscount) *model.RecurringDiscount {
	return &model.RecurringDiscount{
		RecurrenceType: dbRecurrenceTypeToGQL(d.RecurrenceType),
		DiscountPct:    numericToFloat(d.DiscountPct),
		IsActive:       d.IsActive,
	}
}

// dbSubscriptionStatusToGQL converts a DB subscription status to GQL enum.
func dbSubscriptionStatusToGQL(s db.SubscriptionStatus) model.SubscriptionStatus {
	return model.SubscriptionStatus(strings.ToUpper(string(s)))
}

// gqlSubscriptionStatusToDb converts a GQL subscription status to DB enum.
func gqlSubscriptionStatusToDb(s model.SubscriptionStatus) db.SubscriptionStatus {
	return db.SubscriptionStatus(strings.ToLower(string(s)))
}

// fullSubscription loads a subscription from DB and enriches it for GQL return.
func (r *Resolver) fullSubscription(ctx context.Context, sub db.Subscription) (*model.ServiceSubscription, error) {
	gql := dbSubscriptionToGQL(sub)
	r.enrichSubscription(ctx, sub, gql)
	return gql, nil
}

// logSubscriptionError is a helper that logs subscription resolver errors.
func logSubscriptionError(op string, err error) {
	log.Printf("subscription resolver: %s failed: %v", op, err)
}

// calculateEstimatedHours estimates cleaning duration based on room count and area.
func calculateEstimatedHours(numRooms, numBathrooms int, areaSqm *int) float64 {
	hours := 1.0 + float64(numRooms)*0.5 + float64(numBathrooms)*0.5
	if areaSqm != nil && *areaSqm > 50 {
		hours += float64(*areaSqm-50) / 50 * 0.5
	}
	return math.Round(hours*10) / 10
}

// numericFromString parses a string to float64.
func numericFromString(s string) float64 {
	var f float64
	fmt.Sscanf(s, "%f", &f)
	return f
}

// sendWorkerChangeRequestNotifications notifies company admin and all global admins
// that a client has requested a worker change on their subscription.
func (r *Resolver) sendWorkerChangeRequestNotifications(ctx context.Context, sub db.Subscription, clientName, reason string) {
	title := "Cerere schimbare lucrator"
	body := fmt.Sprintf("Clientul %s a solicitat schimbarea lucratorului.", clientName)
	if reason != "" {
		body += fmt.Sprintf(" Motiv: %s", reason)
	}
	data := []byte(fmt.Sprintf(`{"subscriptionId":"%s"}`, uuidToString(sub.ID)))

	// Notify company admin.
	if sub.CompanyID.Valid {
		if company, err := r.Queries.GetCompanyByID(ctx, sub.CompanyID); err == nil {
			if company.AdminUserID.Valid {
				if _, err := r.Queries.CreateNotification(ctx, db.CreateNotificationParams{
					UserID: company.AdminUserID,
					Type:   db.NotificationTypeSubscriptionWorkerChangeRequested,
					Title:  title,
					Body:   body,
					Data:   data,
				}); err != nil {
					log.Printf("subscription: failed to notify company admin: %v", err)
				}
			}
		}
	}

	// Notify all global admins.
	admins, err := r.Queries.ListUsersByRole(ctx, db.UserRoleGlobalAdmin)
	if err == nil {
		for _, admin := range admins {
			if _, err := r.Queries.CreateNotification(ctx, db.CreateNotificationParams{
				UserID: admin.ID,
				Type:   db.NotificationTypeSubscriptionWorkerChangeRequested,
				Title:  title,
				Body:   body,
				Data:   data,
			}); err != nil {
				log.Printf("subscription: failed to notify admin %s: %v", uuidToString(admin.ID), err)
			}
		}
	}
}

// checkWorkerAvailabilityForBooking checks whether a worker is available for a specific
// booking time slot by running the 4-layer availability check:
//  1. Company work schedule (is it a work day? within hours?)
//  2. Worker date override (day off?)
//  3. Worker weekly availability slots
//  4. Existing booking overlap
func (r *Resolver) checkWorkerAvailabilityForBooking(
	ctx context.Context,
	workerID, companyID pgtype.UUID,
	date time.Time,
	startTimeMinutes, durationMinutes int,
	excludeBookingID *pgtype.UUID,
) (available bool, reason string, conflicts []string) {
	pgDate := pgtype.Date{Time: date, Valid: true}
	dayOfWeek := int32(date.Weekday()) // 0=Sunday
	reqEnd := startTimeMinutes + durationMinutes

	// Layer 1: Company work schedule.
	if companyID.Valid {
		companySchedule, _ := r.Queries.ListCompanyWorkSchedule(ctx, companyID)
		for _, cs := range companySchedule {
			if cs.DayOfWeek == dayOfWeek {
				if !cs.IsWorkDay {
					reason := "Partenerul selectat nu lucreaza in aceasta zi"
					return false, reason, []string{reason}
				}
				csStart := int(cs.StartTime.Microseconds / 60_000_000)
				csEnd := int(cs.EndTime.Microseconds / 60_000_000)
				schedStr := fmt.Sprintf("%02d:%02d-%02d:%02d", csStart/60, csStart%60, csEnd/60, csEnd%60)
				if startTimeMinutes < csStart || startTimeMinutes >= csEnd {
					reason := fmt.Sprintf("Ora selectata este in afara programului (%s)", schedStr)
					return false, reason, []string{reason}
				}
				if reqEnd > csEnd {
					reason := fmt.Sprintf("Comanda depaseste programul — sfarsit estimat %02d:%02d, partenerul inchide la %02d:%02d", reqEnd/60, reqEnd%60, csEnd/60, csEnd%60)
					return false, reason, []string{reason}
				}
				break
			}
		}
	}

	// Layer 2: Worker date override (day off).
	override, err := r.Queries.GetWorkerDateOverride(ctx, db.GetWorkerDateOverrideParams{
		WorkerID:     workerID,
		OverrideDate: pgDate,
	})
	if err == nil && !override.IsAvailable {
		reason := "Lucratorul nu este disponibil in aceasta zi (zi libera)"
		return false, reason, []string{reason}
	}

	// Layer 3: Worker weekly availability for day of week.
	availSlots, _ := r.Queries.ListWorkerAvailability(ctx, workerID)
	hasSlotForDay := false
	inSchedule := false
	for _, slot := range availSlots {
		if slot.DayOfWeek == dayOfWeek {
			hasSlotForDay = true
			if slot.IsAvailable.Valid && slot.IsAvailable.Bool {
				slotStart := int(slot.StartTime.Microseconds / 60_000_000)
				slotEnd := int(slot.EndTime.Microseconds / 60_000_000)
				if startTimeMinutes >= slotStart && reqEnd <= slotEnd {
					inSchedule = true
					break
				}
			}
		}
	}
	if hasSlotForDay && !inSchedule {
		reason := "Programarea nu se incadreaza in orarul lucratorului"
		return false, reason, []string{reason}
	}

	// Layer 4: Existing booking overlap.
	existingBookings, _ := r.Queries.ListWorkerBookingsForDate(ctx, db.ListWorkerBookingsForDateParams{
		WorkerID:      workerID,
		ScheduledDate: pgDate,
	})
	for _, eb := range existingBookings {
		// Skip the excluded booking if provided (e.g. the booking being rescheduled).
		if excludeBookingID != nil && eb.ID == *excludeBookingID {
			continue
		}
		ebStart := int(eb.ScheduledStartTime.Microseconds / 60_000_000)
		ebDuration := int(numericToFloat(eb.EstimatedDurationHours) * 60)
		ebEnd := ebStart + ebDuration

		if startTimeMinutes < ebEnd && reqEnd > ebStart {
			conflictTime := fmt.Sprintf("%02d:%02d-%02d:%02d", ebStart/60, ebStart%60, ebEnd/60, ebEnd%60)
			conflicts = append(conflicts, fmt.Sprintf("Conflict cu alta programare (%s)", conflictTime))
		}
	}

	if len(conflicts) > 0 {
		return false, "Lucratorul are alte programari in acest interval", conflicts
	}

	return true, "", nil
}

// sendWorkerChangedNotification notifies the client that their subscription worker has been changed.
func (r *Resolver) sendWorkerChangedNotification(ctx context.Context, sub db.Subscription, newWorkerName string) {
	if !sub.ClientUserID.Valid {
		return
	}
	title := "Lucratorul tau a fost schimbat"
	body := fmt.Sprintf("Lucratorul pentru abonamentul tau a fost schimbat in %s.", newWorkerName)
	data := []byte(fmt.Sprintf(`{"subscriptionId":"%s"}`, uuidToString(sub.ID)))

	if _, err := r.Queries.CreateNotification(ctx, db.CreateNotificationParams{
		UserID: sub.ClientUserID,
		Type:   db.NotificationTypeSubscriptionWorkerChanged,
		Title:  title,
		Body:   body,
		Data:   data,
	}); err != nil {
		log.Printf("subscription: failed to notify client: %v", err)
	}
}
