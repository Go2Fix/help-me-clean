// Package subscription implements the recurring subscription lifecycle for Go2Fix.
// It handles pricing calculation, Stripe Subscription API integration, and
// booking generation for subscription periods.
package subscription

import (
	"context"
	"fmt"
	"log"
	"math"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/price"
	"github.com/stripe/stripe-go/v81/product"
	stripesub "github.com/stripe/stripe-go/v81/subscription"

	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/service/invoice"
	"go2fix-backend/internal/service/payment"
)

// sessionsPerMonth maps recurrence type to sessions per month.
var sessionsPerMonth = map[db.RecurrenceType]int{
	db.RecurrenceTypeWeekly:   4,
	db.RecurrenceTypeBiweekly: 2,
	db.RecurrenceTypeMonthly:  1,
}

// PricingResult holds the calculated subscription pricing.
type PricingResult struct {
	PerSessionOriginal   float64
	DiscountPct          float64
	PerSessionDiscounted float64
	SessionsPerMonth     int
	MonthlyAmount        float64
	MonthlyAmountBani    int64
}

// CreateSubscriptionInput holds the data needed to create a new subscription.
type CreateSubscriptionInput struct {
	ClientUserID    pgtype.UUID
	ClientEmail     string
	ClientName      string
	WorkerID        pgtype.UUID
	CompanyID       pgtype.UUID
	AddressID       pgtype.UUID
	RecurrenceType  db.RecurrenceType
	DayOfWeek       int
	PreferredTime   time.Time
	ServiceType     db.ServiceType
	PropertyType    *string
	NumRooms        int
	NumBathrooms    int
	AreaSqm         *int
	HasPets         *bool
	SpecialInstr    *string
	HourlyRate      float64
	EstimatedHours  float64
	EstimatedTotal  float64
	PaymentMethodID string
	CommissionPct   float64
	Extras          []ExtraInput
}

// ExtraInput represents a service extra for a subscription.
type ExtraInput struct {
	ExtraID  pgtype.UUID
	Quantity int
}

// Service handles the subscription lifecycle.
type Service struct {
	queries    *db.Queries
	pool       *pgxpool.Pool
	paymentSvc *payment.Service
	invoiceSvc *invoice.Service
	stripeKey  string
}

// NewService creates a new subscription service.
func NewService(queries *db.Queries, pool *pgxpool.Pool, paymentSvc *payment.Service, invoiceSvc *invoice.Service) *Service {
	return &Service{
		queries:    queries,
		pool:       pool,
		paymentSvc: paymentSvc,
		invoiceSvc: invoiceSvc,
		stripeKey:  os.Getenv("STRIPE_SECRET_KEY"),
	}
}

// CalculatePricing computes the subscription pricing for a given recurrence type
// and per-session original amount, looking up the discount from the database.
func (s *Service) CalculatePricing(ctx context.Context, recurrenceType db.RecurrenceType, perSessionOriginal float64) (*PricingResult, error) {
	discount, err := s.queries.GetRecurringDiscountByType(ctx, recurrenceType)
	if err != nil {
		return nil, fmt.Errorf("subscription: failed to get discount for %s: %w", recurrenceType, err)
	}

	discountPct := 0.0
	if discount.IsActive {
		f8, ferr := discount.DiscountPct.Float64Value()
		if ferr == nil && f8.Valid {
			discountPct = f8.Float64
		}
	}

	sessions := sessionsPerMonth[recurrenceType]
	if sessions == 0 {
		sessions = 1
	}

	perSessionDiscounted := perSessionOriginal * (1 - discountPct/100)
	monthlyAmount := perSessionDiscounted * float64(sessions)
	monthlyAmountBani := int64(math.Round(monthlyAmount * 100))

	return &PricingResult{
		PerSessionOriginal:   perSessionOriginal,
		DiscountPct:          discountPct,
		PerSessionDiscounted: math.Round(perSessionDiscounted*100) / 100,
		SessionsPerMonth:     sessions,
		MonthlyAmount:        math.Round(monthlyAmount*100) / 100,
		MonthlyAmountBani:    monthlyAmountBani,
	}, nil
}

// CreateSubscription creates a new subscription with Stripe billing.
// It creates a Stripe Product, Price, and Subscription, then saves the DB record
// and generates the first month's bookings.
func (s *Service) CreateSubscription(ctx context.Context, input CreateSubscriptionInput) (db.Subscription, error) {
	// Calculate pricing.
	pricing, err := s.CalculatePricing(ctx, input.RecurrenceType, input.EstimatedTotal)
	if err != nil {
		return db.Subscription{}, err
	}

	// Ensure Stripe customer exists.
	customerID, err := s.paymentSvc.EnsureStripeCustomer(ctx, input.ClientUserID, input.ClientEmail, input.ClientName)
	if err != nil {
		return db.Subscription{}, fmt.Errorf("subscription: failed to ensure stripe customer: %w", err)
	}

	// Get company's Stripe Connect account.
	connectInfo, err := s.queries.GetCompanyStripeConnect(ctx, input.CompanyID)
	if err != nil {
		return db.Subscription{}, fmt.Errorf("subscription: failed to get company stripe connect: %w", err)
	}
	if !connectInfo.StripeConnectAccountID.Valid || connectInfo.StripeConnectAccountID.String == "" {
		return db.Subscription{}, fmt.Errorf("subscription: company does not have a stripe connect account")
	}

	// Create Stripe Product.
	serviceLabel := strings.ReplaceAll(string(input.ServiceType), "_", " ")
	productParams := &stripe.ProductParams{
		Name: stripe.String(fmt.Sprintf("Go2Fix Abonament - %s", serviceLabel)),
	}
	productParams.AddMetadata("service_type", string(input.ServiceType))
	productParams.AddMetadata("recurrence_type", string(input.RecurrenceType))

	stripeProduct, err := product.New(productParams)
	if err != nil {
		return db.Subscription{}, fmt.Errorf("subscription: failed to create stripe product: %w", err)
	}

	// Create Stripe Price (ad-hoc, per subscription).
	priceParams := &stripe.PriceParams{
		Product:    stripe.String(stripeProduct.ID),
		UnitAmount: stripe.Int64(pricing.MonthlyAmountBani),
		Currency:   stripe.String("ron"),
		Recurring: &stripe.PriceRecurringParams{
			Interval: stripe.String(string(stripe.PriceRecurringIntervalMonth)),
		},
	}

	stripePrice, err := price.New(priceParams)
	if err != nil {
		return db.Subscription{}, fmt.Errorf("subscription: failed to create stripe price: %w", err)
	}

	// Create Stripe Subscription with Connect split.
	subParams := &stripe.SubscriptionParams{
		Customer: stripe.String(customerID),
		Items: []*stripe.SubscriptionItemsParams{
			{Price: stripe.String(stripePrice.ID)},
		},
		DefaultPaymentMethod:  stripe.String(input.PaymentMethodID),
		ApplicationFeePercent: stripe.Float64(input.CommissionPct),
		TransferData: &stripe.SubscriptionTransferDataParams{
			Destination: stripe.String(connectInfo.StripeConnectAccountID.String),
		},
	}
	subParams.AddMetadata("platform", "go2fix")
	subParams.AddExpand("latest_invoice")

	stripeSub, err := stripesub.New(subParams)
	if err != nil {
		return db.Subscription{}, fmt.Errorf("subscription: failed to create stripe subscription: %w", err)
	}

	// Determine status from Stripe.
	dbStatus := stripeStatusToDb(stripeSub.Status)

	// Parse preferred time to microseconds.
	preferredTimeMicros := int64(input.PreferredTime.Hour())*3_600_000_000 + int64(input.PreferredTime.Minute())*60_000_000

	// Create DB subscription record.
	sub, err := s.queries.CreateSubscription(ctx, db.CreateSubscriptionParams{
		ClientUserID:        input.ClientUserID,
		CompanyID:           input.CompanyID,
		WorkerID:            input.WorkerID,
		AddressID:           input.AddressID,
		RecurrenceType:      input.RecurrenceType,
		DayOfWeek:           pgtype.Int4{Int32: int32(input.DayOfWeek), Valid: true},
		PreferredTime:       pgtype.Time{Microseconds: preferredTimeMicros, Valid: true},
		ServiceType:         input.ServiceType,
		PropertyType:        stringToText(input.PropertyType),
		NumRooms:            pgtype.Int4{Int32: int32(input.NumRooms), Valid: true},
		NumBathrooms:        pgtype.Int4{Int32: int32(input.NumBathrooms), Valid: true},
		AreaSqm:             intToInt4(input.AreaSqm),
		HasPets:             boolToPgBool(input.HasPets),
		SpecialInstructions: stringToText(input.SpecialInstr),
		HourlyRate:          float64ToNumeric(input.HourlyRate),
		EstimatedDurationHours: float64ToNumeric(input.EstimatedHours),
		PerSessionOriginal:  float64ToNumeric(pricing.PerSessionOriginal),
		DiscountPct:         float64ToNumeric(pricing.DiscountPct),
		PerSessionDiscounted: float64ToNumeric(pricing.PerSessionDiscounted),
		SessionsPerMonth:    int32(pricing.SessionsPerMonth),
		MonthlyAmount:       float64ToNumeric(pricing.MonthlyAmount),
		MonthlyAmountBani:   int32(pricing.MonthlyAmountBani),
		PlatformCommissionPct: float64ToNumeric(input.CommissionPct),
		StripeSubscriptionID: pgtype.Text{String: stripeSub.ID, Valid: true},
		StripePriceID:       pgtype.Text{String: stripePrice.ID, Valid: true},
		StripeProductID:     pgtype.Text{String: stripeProduct.ID, Valid: true},
		Status:              dbStatus,
		CurrentPeriodStart:  pgtype.Timestamptz{Time: time.Unix(stripeSub.CurrentPeriodStart, 0), Valid: true},
		CurrentPeriodEnd:    pgtype.Timestamptz{Time: time.Unix(stripeSub.CurrentPeriodEnd, 0), Valid: true},
	})
	if err != nil {
		return db.Subscription{}, fmt.Errorf("subscription: failed to create db record: %w", err)
	}

	// Insert subscription extras.
	for _, extra := range input.Extras {
		_ = s.queries.InsertSubscriptionExtra(ctx, db.InsertSubscriptionExtraParams{
			SubscriptionID: sub.ID,
			ExtraID:        extra.ExtraID,
			Quantity:        pgtype.Int4{Int32: int32(extra.Quantity), Valid: true},
		})
	}

	// Generate first month's bookings.
	periodStart := time.Unix(stripeSub.CurrentPeriodStart, 0)
	periodEnd := time.Unix(stripeSub.CurrentPeriodEnd, 0)
	s.GenerateBookingsForPeriod(ctx, sub, periodStart, periodEnd)

	log.Printf("subscription: created subscription %s (stripe: %s) for client %s, monthly=%d bani",
		uuidToString(sub.ID), stripeSub.ID, uuidToString(input.ClientUserID), pricing.MonthlyAmountBani)

	return sub, nil
}

// PauseSubscription pauses a subscription in Stripe and the database.
func (s *Service) PauseSubscription(ctx context.Context, subID pgtype.UUID) (db.Subscription, error) {
	sub, err := s.queries.GetSubscriptionByID(ctx, subID)
	if err != nil {
		return db.Subscription{}, fmt.Errorf("subscription: not found: %w", err)
	}

	if sub.StripeSubscriptionID.Valid && sub.StripeSubscriptionID.String != "" {
		params := &stripe.SubscriptionParams{
			PauseCollection: &stripe.SubscriptionPauseCollectionParams{
				Behavior: stripe.String(string(stripe.SubscriptionPauseCollectionBehaviorVoid)),
			},
		}
		_, err = stripesub.Update(sub.StripeSubscriptionID.String, params)
		if err != nil {
			return db.Subscription{}, fmt.Errorf("subscription: failed to pause in stripe: %w", err)
		}
	}

	updated, err := s.queries.PauseSubscription(ctx, subID)
	if err != nil {
		return db.Subscription{}, fmt.Errorf("subscription: failed to pause in db: %w", err)
	}

	log.Printf("subscription: paused %s", uuidToString(subID))
	return updated, nil
}

// ResumeSubscription resumes a paused subscription.
func (s *Service) ResumeSubscription(ctx context.Context, subID pgtype.UUID) (db.Subscription, error) {
	sub, err := s.queries.GetSubscriptionByID(ctx, subID)
	if err != nil {
		return db.Subscription{}, fmt.Errorf("subscription: not found: %w", err)
	}

	if sub.StripeSubscriptionID.Valid && sub.StripeSubscriptionID.String != "" {
		params := &stripe.SubscriptionParams{}
		params.AddExtra("pause_collection", "")
		_, err = stripesub.Update(sub.StripeSubscriptionID.String, params)
		if err != nil {
			return db.Subscription{}, fmt.Errorf("subscription: failed to resume in stripe: %w", err)
		}
	}

	updated, err := s.queries.ResumeSubscription(ctx, subID)
	if err != nil {
		return db.Subscription{}, fmt.Errorf("subscription: failed to resume in db: %w", err)
	}

	log.Printf("subscription: resumed %s", uuidToString(subID))
	return updated, nil
}

// CancelSubscription cancels a subscription at period end.
func (s *Service) CancelSubscription(ctx context.Context, subID pgtype.UUID, reason string) (db.Subscription, error) {
	sub, err := s.queries.GetSubscriptionByID(ctx, subID)
	if err != nil {
		return db.Subscription{}, fmt.Errorf("subscription: not found: %w", err)
	}

	if sub.StripeSubscriptionID.Valid && sub.StripeSubscriptionID.String != "" {
		params := &stripe.SubscriptionParams{
			CancelAtPeriodEnd: stripe.Bool(true),
		}
		_, err = stripesub.Update(sub.StripeSubscriptionID.String, params)
		if err != nil {
			return db.Subscription{}, fmt.Errorf("subscription: failed to cancel in stripe: %w", err)
		}
	}

	updated, err := s.queries.CancelSubscription(ctx, db.CancelSubscriptionParams{
		ID:                 subID,
		CancellationReason: pgtype.Text{String: reason, Valid: reason != ""},
	})
	if err != nil {
		return db.Subscription{}, fmt.Errorf("subscription: failed to cancel in db: %w", err)
	}

	// Cancel future bookings.
	_ = s.queries.CancelFutureSubscriptionBookings(ctx, db.CancelFutureSubscriptionBookingsParams{
		SubscriptionID:     pgtype.UUID{Bytes: subID.Bytes, Valid: true},
		CancellationReason: pgtype.Text{String: reason, Valid: reason != ""},
	})

	log.Printf("subscription: cancelled %s (reason: %s)", uuidToString(subID), reason)
	return updated, nil
}

// AdminCancelSubscription immediately cancels a subscription (admin override).
func (s *Service) AdminCancelSubscription(ctx context.Context, subID pgtype.UUID, reason string) (db.Subscription, error) {
	sub, err := s.queries.GetSubscriptionByID(ctx, subID)
	if err != nil {
		return db.Subscription{}, fmt.Errorf("subscription: not found: %w", err)
	}

	if sub.StripeSubscriptionID.Valid && sub.StripeSubscriptionID.String != "" {
		_, err = stripesub.Cancel(sub.StripeSubscriptionID.String, nil)
		if err != nil {
			return db.Subscription{}, fmt.Errorf("subscription: failed to cancel in stripe: %w", err)
		}
	}

	updated, err := s.queries.CancelSubscription(ctx, db.CancelSubscriptionParams{
		ID:                 subID,
		CancellationReason: pgtype.Text{String: reason, Valid: reason != ""},
	})
	if err != nil {
		return db.Subscription{}, fmt.Errorf("subscription: failed to cancel in db: %w", err)
	}

	_ = s.queries.CancelFutureSubscriptionBookings(ctx, db.CancelFutureSubscriptionBookingsParams{
		SubscriptionID:     pgtype.UUID{Bytes: subID.Bytes, Valid: true},
		CancellationReason: pgtype.Text{String: "Anulat de admin: " + reason, Valid: true},
	})

	log.Printf("subscription: admin cancelled %s (reason: %s)", uuidToString(subID), reason)
	return updated, nil
}

// HandleInvoicePaid handles a Stripe invoice.paid webhook event for a subscription.
// It syncs the subscription period and generates the next month's bookings.
func (s *Service) HandleInvoicePaid(ctx context.Context, stripeSubID string, periodStart, periodEnd int64) error {
	sub, err := s.queries.GetSubscriptionByStripeID(ctx, pgtype.Text{String: stripeSubID, Valid: true})
	if err != nil {
		return fmt.Errorf("subscription: no subscription found for stripe sub %s: %w", stripeSubID, err)
	}

	// Update period in DB.
	_, err = s.queries.UpdateSubscriptionPeriod(ctx, db.UpdateSubscriptionPeriodParams{
		ID:                 sub.ID,
		CurrentPeriodStart: pgtype.Timestamptz{Time: time.Unix(periodStart, 0), Valid: true},
		CurrentPeriodEnd:   pgtype.Timestamptz{Time: time.Unix(periodEnd, 0), Valid: true},
		Status:             db.SubscriptionStatusActive,
	})
	if err != nil {
		return fmt.Errorf("subscription: failed to update period: %w", err)
	}

	pStart := time.Unix(periodStart, 0)
	pEnd := time.Unix(periodEnd, 0)

	// Generate bookings for the new period.
	s.GenerateBookingsForPeriod(ctx, sub, pStart, pEnd)

	// Generate monthly subscription invoice (company → client).
	if s.invoiceSvc != nil && sub.CompanyID.Valid {
		company, compErr := s.queries.GetCompanyByID(ctx, sub.CompanyID)
		if compErr == nil {
			if invErr := s.invoiceSvc.GenerateSubscriptionMonthlyInvoice(ctx, sub, company, pStart, pEnd); invErr != nil {
				log.Printf("subscription: failed to generate invoice for %s: %v", uuidToString(sub.ID), invErr)
			}

			// Generate platform commission invoice (platform → company).
			commissionPct := numericToFloat64(sub.PlatformCommissionPct)
			if commissionPct > 0 {
				commissionBani := int32(math.Round(float64(sub.MonthlyAmountBani) * commissionPct / 100))
				periodFrom := pStart.Format("02.01.2006")
				periodTo := pEnd.Format("02.01.2006")
				if _, commErr := s.invoiceSvc.GenerateCommissionInvoice(ctx, sub.CompanyID, commissionBani, int(sub.SessionsPerMonth), periodFrom, periodTo); commErr != nil {
					log.Printf("subscription: failed to generate commission invoice for %s: %v", uuidToString(sub.ID), commErr)
				}
			}
		}
	}

	log.Printf("subscription: invoice paid for %s, new period %s - %s",
		uuidToString(sub.ID),
		pStart.Format("2006-01-02"),
		pEnd.Format("2006-01-02"))

	return nil
}

// HandleInvoicePaymentFailed marks a subscription as past_due when payment fails.
func (s *Service) HandleInvoicePaymentFailed(ctx context.Context, stripeSubID string) error {
	sub, err := s.queries.GetSubscriptionByStripeID(ctx, pgtype.Text{String: stripeSubID, Valid: true})
	if err != nil {
		return fmt.Errorf("subscription: no subscription found for stripe sub %s: %w", stripeSubID, err)
	}

	_, err = s.queries.UpdateSubscriptionStatus(ctx, db.UpdateSubscriptionStatusParams{
		ID:     sub.ID,
		Status: db.SubscriptionStatusPastDue,
	})
	if err != nil {
		return fmt.Errorf("subscription: failed to mark past_due: %w", err)
	}

	log.Printf("subscription: payment failed for %s, marked past_due", uuidToString(sub.ID))
	return nil
}

// HandleSubscriptionUpdated syncs a subscription's status and period from Stripe.
func (s *Service) HandleSubscriptionUpdated(ctx context.Context, stripeSubID string, status stripe.SubscriptionStatus, periodStart, periodEnd int64) error {
	sub, err := s.queries.GetSubscriptionByStripeID(ctx, pgtype.Text{String: stripeSubID, Valid: true})
	if err != nil {
		// Not our subscription — skip.
		log.Printf("subscription: no local subscription for stripe sub %s, skipping update", stripeSubID)
		return nil
	}

	dbStatus := stripeStatusToDb(status)

	_, err = s.queries.UpdateSubscriptionPeriod(ctx, db.UpdateSubscriptionPeriodParams{
		ID:                 sub.ID,
		CurrentPeriodStart: pgtype.Timestamptz{Time: time.Unix(periodStart, 0), Valid: true},
		CurrentPeriodEnd:   pgtype.Timestamptz{Time: time.Unix(periodEnd, 0), Valid: true},
		Status:             dbStatus,
	})
	if err != nil {
		return fmt.Errorf("subscription: failed to sync status: %w", err)
	}

	log.Printf("subscription: updated %s → %s", uuidToString(sub.ID), dbStatus)
	return nil
}

// HandleSubscriptionDeleted handles a deleted/cancelled Stripe subscription.
func (s *Service) HandleSubscriptionDeleted(ctx context.Context, stripeSubID string) error {
	sub, err := s.queries.GetSubscriptionByStripeID(ctx, pgtype.Text{String: stripeSubID, Valid: true})
	if err != nil {
		log.Printf("subscription: no local subscription for stripe sub %s, skipping delete", stripeSubID)
		return nil
	}

	_, err = s.queries.CancelSubscription(ctx, db.CancelSubscriptionParams{
		ID:                 sub.ID,
		CancellationReason: pgtype.Text{String: "Stripe subscription deleted", Valid: true},
	})
	if err != nil {
		return fmt.Errorf("subscription: failed to mark cancelled: %w", err)
	}

	_ = s.queries.CancelFutureSubscriptionBookings(ctx, db.CancelFutureSubscriptionBookingsParams{
		SubscriptionID:     pgtype.UUID{Bytes: sub.ID.Bytes, Valid: true},
		CancellationReason: pgtype.Text{String: "Abonament anulat", Valid: true},
	})

	log.Printf("subscription: deleted %s from stripe webhook", uuidToString(sub.ID))
	return nil
}

// GenerateBookingsForPeriod creates booking records for a subscription period.
// It generates occurrence dates based on the recurrence type and creates one
// booking per occurrence within the period.
func (s *Service) GenerateBookingsForPeriod(ctx context.Context, sub db.Subscription, periodStart, periodEnd time.Time) {
	sessions := sessionsPerMonth[sub.RecurrenceType]
	if sessions == 0 {
		sessions = 1
	}

	// Generate dates based on recurrence pattern within the period.
	dates := generateDatesInPeriod(sub.RecurrenceType, sub.DayOfWeek, periodStart, periodEnd)

	preferredTimeMicros := sub.PreferredTime.Microseconds

	for i, occDate := range dates {
		refCode := fmt.Sprintf("G2F-S%d", time.Now().UnixNano()%1000000+int64(i))

		booking, err := s.queries.CreateBooking(ctx, db.CreateBookingParams{
			ReferenceCode:          refCode,
			ClientUserID:           sub.ClientUserID,
			AddressID:              sub.AddressID,
			ServiceType:            sub.ServiceType,
			ScheduledDate:          pgtype.Date{Time: occDate, Valid: true},
			ScheduledStartTime:     pgtype.Time{Microseconds: preferredTimeMicros, Valid: true},
			EstimatedDurationHours: sub.EstimatedDurationHours,
			PropertyType:           sub.PropertyType,
			NumRooms:               sub.NumRooms,
			NumBathrooms:           sub.NumBathrooms,
			AreaSqm:                sub.AreaSqm,
			HasPets:                sub.HasPets,
			SpecialInstructions:    sub.SpecialInstructions,
			HourlyRate:             sub.HourlyRate,
			EstimatedTotal:         sub.PerSessionDiscounted,
			RecurringGroupID:       pgtype.UUID{}, // not using old recurring groups
			OccurrenceNumber:       pgtype.Int4{Int32: int32(i + 1), Valid: true},
		})
		if err != nil {
			log.Printf("subscription: failed to create booking for sub %s date %s: %v",
				uuidToString(sub.ID), occDate.Format("2006-01-02"), err)
			continue
		}

		// Smart worker assignment: preferred → same-company teammate → cross-company → preferred fallback.
		assignedWorkerID := s.findBestAvailableWorker(ctx, sub, occDate)

		// Assign worker + company to the booking.
		_, _ = s.queries.SetBookingPreferredWorker(ctx, db.SetBookingPreferredWorkerParams{
			ID:        booking.ID,
			CompanyID: sub.CompanyID,
			WorkerID:  assignedWorkerID,
		})

		// Link booking to subscription.
		_, _ = s.pool.Exec(ctx,
			"UPDATE bookings SET subscription_id = $1 WHERE id = $2",
			sub.ID, booking.ID,
		)

		// Copy subscription extras to booking extras.
		subExtras, _ := s.queries.GetSubscriptionExtras(ctx, sub.ID)
		for _, se := range subExtras {
			_ = s.queries.InsertBookingExtra(ctx, db.InsertBookingExtraParams{
				BookingID: booking.ID,
				ExtraID:   se.ExtraID,
				Price:     se.Price,
				Quantity:  se.Quantity,
			})
		}
	}

	log.Printf("subscription: generated %d bookings for sub %s period %s - %s",
		len(dates), uuidToString(sub.ID),
		periodStart.Format("2006-01-02"), periodEnd.Format("2006-01-02"))
}

// generateDatesInPeriod returns occurrence dates within a period based on recurrence type.
func generateDatesInPeriod(recType db.RecurrenceType, dayOfWeek pgtype.Int4, start, end time.Time) []time.Time {
	var dates []time.Time

	dow := time.Weekday(0)
	if dayOfWeek.Valid {
		dow = time.Weekday(dayOfWeek.Int32)
	}

	// Find the first occurrence on or after start that matches the day of week.
	current := start
	for current.Weekday() != dow {
		current = current.AddDate(0, 0, 1)
	}

	for current.Before(end) {
		dates = append(dates, current)
		switch recType {
		case db.RecurrenceTypeWeekly:
			current = current.AddDate(0, 0, 7)
		case db.RecurrenceTypeBiweekly:
			current = current.AddDate(0, 0, 14)
		case db.RecurrenceTypeMonthly:
			current = current.AddDate(0, 1, 0)
		default:
			current = current.AddDate(0, 0, 7)
		}
	}

	return dates
}

// findBestAvailableWorker implements the smart assignment fallback chain:
// 1. Preferred worker (if no conflict on date)
// 2. Same-company teammate (active, no conflict)
// 3. Cross-company worker in same area (if worker has service areas)
// 4. Preferred worker fallback (will need manual resolution)
func (s *Service) findBestAvailableWorker(ctx context.Context, sub db.Subscription, date time.Time) pgtype.UUID {
	pgDate := pgtype.Date{Time: date, Valid: true}

	// 1. Check if preferred worker is available.
	if sub.WorkerID.Valid && !s.hasConflictOnDate(ctx, sub.WorkerID, pgDate) {
		return sub.WorkerID
	}

	// 2. Try same-company teammates.
	if sub.CompanyID.Valid {
		teammates, err := s.queries.ListWorkersByCompany(ctx, sub.CompanyID)
		if err == nil {
			for _, mate := range teammates {
				if mate.ID == sub.WorkerID {
					continue
				}
				if string(mate.Status) != "active" {
					continue
				}
				if !s.hasConflictOnDate(ctx, mate.ID, pgDate) {
					log.Printf("subscription: sub %s date %s — preferred worker unavailable, assigning teammate %s",
						uuidToString(sub.ID), date.Format("2006-01-02"), uuidToString(mate.ID))
					return mate.ID
				}
			}
		}
	}

	// 3. Try cross-company workers in the same area.
	if sub.WorkerID.Valid {
		workerAreas, err := s.queries.ListWorkerServiceAreas(ctx, sub.WorkerID)
		if err == nil && len(workerAreas) > 0 {
			areaID := workerAreas[0].CityAreaID
			available, err := s.queries.FindAvailableWorkersForDateAndArea(ctx, db.FindAvailableWorkersForDateAndAreaParams{
				AreaID:             areaID,
				ExcludeWorkerID:    sub.WorkerID,
				TargetDate:         pgDate,
				PreferredCompanyID: sub.CompanyID,
			})
			if err == nil && len(available) > 0 {
				log.Printf("subscription: sub %s date %s — no teammate available, assigning cross-company worker %s",
					uuidToString(sub.ID), date.Format("2006-01-02"), uuidToString(available[0].ID))
				return available[0].ID
			}
		}
	}

	// 4. Fallback to preferred worker (manual resolution needed).
	log.Printf("subscription: sub %s date %s — no alternative found, keeping preferred worker",
		uuidToString(sub.ID), date.Format("2006-01-02"))
	return sub.WorkerID
}

// hasConflictOnDate checks if a worker already has a booking on the given date.
func (s *Service) hasConflictOnDate(ctx context.Context, workerID pgtype.UUID, date pgtype.Date) bool {
	bookings, err := s.queries.ListBookingsByWorkerAndDateRange(ctx, db.ListBookingsByWorkerAndDateRangeParams{
		WorkerID: workerID,
		DateFrom: date,
		DateTo:   date,
	})
	if err != nil {
		return false
	}
	return len(bookings) > 0
}

// stripeStatusToDb converts a Stripe subscription status to our DB enum.
func stripeStatusToDb(status stripe.SubscriptionStatus) db.SubscriptionStatus {
	switch status {
	case stripe.SubscriptionStatusActive:
		return db.SubscriptionStatusActive
	case stripe.SubscriptionStatusPastDue:
		return db.SubscriptionStatusPastDue
	case stripe.SubscriptionStatusCanceled:
		return db.SubscriptionStatusCancelled
	case stripe.SubscriptionStatusIncomplete, stripe.SubscriptionStatusIncompleteExpired:
		return db.SubscriptionStatusIncomplete
	case stripe.SubscriptionStatusPaused:
		return db.SubscriptionStatusPaused
	default:
		return db.SubscriptionStatusActive
	}
}

// ── Helper functions (pgtype conversions) ──────────────────────────────────

func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func stringToText(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{}
	}
	return pgtype.Text{String: *s, Valid: true}
}

func intToInt4(i *int) pgtype.Int4 {
	if i == nil {
		return pgtype.Int4{}
	}
	return pgtype.Int4{Int32: int32(*i), Valid: true}
}

func boolToPgBool(b *bool) pgtype.Bool {
	if b == nil {
		return pgtype.Bool{}
	}
	return pgtype.Bool{Bool: *b, Valid: true}
}

func float64ToNumeric(f float64) pgtype.Numeric {
	var n pgtype.Numeric
	_ = n.Scan(fmt.Sprintf("%.2f", f))
	return n
}

func numericToFloat64(n pgtype.Numeric) float64 {
	if !n.Valid {
		return 0
	}
	f, err := n.Float64Value()
	if err != nil {
		return 0
	}
	return f.Float64
}
