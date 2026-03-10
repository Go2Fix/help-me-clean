package resolver

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/graph/model"
	"go2fix-backend/internal/middleware"
	"go2fix-backend/internal/service/invoice"
	"go2fix-backend/internal/service/notification"
	"go2fix-backend/internal/service/payment"
	"go2fix-backend/internal/service/subscription"
	"go2fix-backend/internal/service/whatsapp"
	"go2fix-backend/internal/storage"
)

// Resolver is the root resolver struct.
type Resolver struct {
	Pool                *pgxpool.Pool
	Queries             db.Querier
	PaymentService      *payment.Service
	InvoiceService      *invoice.Service
	NotifSvc            *notification.Service
	SubscriptionService *subscription.Service
	Storage             storage.Storage
	AuthzHelper         *middleware.AuthzHelper
	WhatsApp            *whatsapp.Service
}

// workerWithCompany loads a worker's company, user, documents, and assessment, returns the full WorkerProfile.
func (r *Resolver) workerWithCompany(ctx context.Context, c db.Worker) (*model.WorkerProfile, error) {
	// Load user (REQUIRED - user_id is now NOT NULL after migration)
	user, err := r.Queries.GetUserByID(ctx, c.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to load user for worker: %w", err)
	}

	// Convert worker with user data
	profile := dbWorkerToGQL(c, &user)

	// Attach user to profile
	profile.User = dbUserToGQL(user)

	// Compute worker stats dynamically from reviews/bookings
	r.enrichWorkerStats(ctx, c.ID, profile)

	// Load company
	company, err := r.Queries.GetCompanyByID(ctx, c.CompanyID)
	if err != nil {
		return nil, fmt.Errorf("failed to load company: %w", err)
	}
	gqlCompany := dbCompanyToGQL(company)
	r.enrichCompanyStats(ctx, c.CompanyID, gqlCompany)
	profile.Company = gqlCompany

	// Load worker documents
	if docs, err := r.Queries.ListWorkerDocuments(ctx, c.ID); err == nil {
		for _, d := range docs {
			profile.Documents = append(profile.Documents, dbWorkerDocToGQL(d))
		}
	}

	// Load personality assessment if exists
	if assessment, err := r.Queries.GetPersonalityAssessmentByWorkerID(ctx, c.ID); err == nil {
		profile.PersonalityAssessment = dbPersonalityAssessmentToGQL(assessment)
	}

	return profile, nil
}

// copyCompanyAreasToWorkerHelper copies all company service areas to a newly created worker.
// Errors are logged but not propagated (best-effort).
func (r *Resolver) copyCompanyAreasToWorkerHelper(ctx context.Context, companyID pgtype.UUID, workerID pgtype.UUID) {
	areas, err := r.Queries.ListCompanyServiceAreas(ctx, companyID)
	if err != nil {
		log.Printf("copyCompanyAreasToWorkerHelper: failed to list company areas: %v", err)
		return
	}
	for _, area := range areas {
		_, err := r.Queries.InsertWorkerServiceArea(ctx, db.InsertWorkerServiceAreaParams{
			WorkerID:  workerID,
			CityAreaID: area.CityAreaID,
		})
		if err != nil {
			log.Printf("copyCompanyAreasToWorkerHelper: failed to insert area %s: %v", area.AreaName, err)
		}
	}
}

// copyCompanyScheduleToWorkerHelper copies all company work schedule rows to a newly created worker.
// Errors are logged but not propagated (best-effort).
func (r *Resolver) copyCompanyScheduleToWorkerHelper(ctx context.Context, companyID pgtype.UUID, workerID pgtype.UUID) {
	schedule, err := r.Queries.ListCompanyWorkSchedule(ctx, companyID)
	if err != nil {
		log.Printf("copyCompanyScheduleToWorkerHelper: failed to list company schedule: %v", err)
		return
	}
	for _, day := range schedule {
		_, err := r.Queries.SetWorkerAvailability(ctx, db.SetWorkerAvailabilityParams{
			WorkerID:    workerID,
			DayOfWeek:   day.DayOfWeek,
			StartTime:   day.StartTime,
			EndTime:     day.EndTime,
			IsAvailable: pgtype.Bool{Bool: day.IsWorkDay, Valid: true},
		})
		if err != nil {
			log.Printf("copyCompanyScheduleToWorkerHelper: failed to set availability for day %d: %v", day.DayOfWeek, err)
		}
	}
}

// enrichWorkerStats populates ratingAvg and totalJobsCompleted dynamically from reviews/bookings.
func (r *Resolver) enrichWorkerStats(ctx context.Context, workerID pgtype.UUID, profile *model.WorkerProfile) {
	if avg, err := r.Queries.GetAverageWorkerRating(ctx, workerID); err == nil {
		profile.RatingAvg = numericToFloat(avg)
	}
	if count, err := r.Queries.CountCompletedJobsByWorker(ctx, workerID); err == nil {
		profile.TotalJobsCompleted = int(count)
	}
}

// enrichCompanyStats populates ratingAvg and totalJobsCompleted dynamically from reviews/bookings.
func (r *Resolver) enrichCompanyStats(ctx context.Context, companyID pgtype.UUID, company *model.Company) {
	if avg, err := r.Queries.GetCompanyAverageRating(ctx, companyID); err == nil {
		company.RatingAvg = numericToFloat(avg)
	}
	if count, err := r.Queries.CountCompletedJobsByCompany(ctx, companyID); err == nil {
		company.TotalJobsCompleted = int(count)
	}
}

// populateCompanyDocuments fetches and attaches documents to a Company GQL model.
func (r *Resolver) populateCompanyDocuments(ctx context.Context, company *model.Company, companyID pgtype.UUID) {
	if docs, err := r.Queries.ListCompanyDocuments(ctx, companyID); err == nil {
		for _, d := range docs {
			company.Documents = append(company.Documents, dbCompanyDocToGQL(d))
		}
	}
}

// enrichBookingWorkerOnly populates only the worker field on a GQL booking.
// Used by subscription detail to avoid N+1 queries for fields the page doesn't need.
func (r *Resolver) enrichBookingWorkerOnly(ctx context.Context, dbB db.Booking, gqlB *model.Booking) {
	if dbB.WorkerID.Valid {
		if worker, err := r.Queries.GetWorkerByID(ctx, dbB.WorkerID); err == nil {
			if user, err := r.Queries.GetUserByID(ctx, worker.UserID); err == nil {
				gqlB.Worker = &model.WorkerProfile{
					ID:       uuidToString(worker.ID),
					FullName: user.FullName,
				}
			}
		}
	}
}

// enrichBooking populates related entities (client, address, serviceName, company, worker)
// on a GQL booking from the DB booking's foreign keys.
func (r *Resolver) enrichBooking(ctx context.Context, dbB db.Booking, gqlB *model.Booking) {
	if dbB.AddressID.Valid {
		if addr, err := r.Queries.GetAddressByID(ctx, dbB.AddressID); err == nil {
			gqlB.Address = dbAddressToGQL(addr)
		}
	}
	if dbB.ClientUserID.Valid {
		if user, err := r.Queries.GetUserByID(ctx, dbB.ClientUserID); err == nil {
			gqlB.Client = dbUserToGQL(user)
		}
	}
	if svc, err := r.Queries.GetServiceByType(ctx, dbB.ServiceType); err == nil {
		gqlB.ServiceName = svc.NameRo
		gqlB.IncludedItems = svc.IncludedItems
	} else {
		gqlB.ServiceName = string(dbB.ServiceType)
		gqlB.IncludedItems = []string{}
	}
	if dbB.CompanyID.Valid {
		if company, err := r.Queries.GetCompanyByID(ctx, dbB.CompanyID); err == nil {
			gqlCompany := dbCompanyToGQL(company)
			r.enrichCompanyStats(ctx, dbB.CompanyID, gqlCompany)
			gqlB.Company = gqlCompany
		}
	}
	if dbB.WorkerID.Valid {
		if worker, err := r.Queries.GetWorkerByID(ctx, dbB.WorkerID); err == nil {
			if profile, err := r.workerWithCompany(ctx, worker); err == nil {
				gqlB.Worker = profile
			}
		}
	}
	// Load time slots.
	if slots, err := r.Queries.ListBookingTimeSlots(ctx, dbB.ID); err == nil {
		for _, slot := range slots {
			gqlB.TimeSlots = append(gqlB.TimeSlots, &model.BookingTimeSlot{
				ID:         uuidToString(slot.ID),
				SlotDate:   dateToString(slot.SlotDate),
				StartTime:  timeToString(slot.StartTime),
				EndTime:    timeToString(slot.EndTime),
				IsSelected: slot.IsSelected,
			})
		}
	}
	// Load review if one exists for this booking.
	if review, err := r.Queries.GetReviewByBookingID(ctx, dbB.ID); err == nil {
		gqlB.Review = dbReviewToGQL(review)
	}
	// Load job photos.
	if photos, err := r.Queries.ListJobPhotosByBooking(ctx, dbB.ID); err == nil {
		for _, p := range photos {
			gqlB.Photos = append(gqlB.Photos, dbJobPhotoToGQL(p))
		}
	}
	// Load booking extras with service extra details.
	if extras, err := r.Queries.ListBookingExtras(ctx, dbB.ID); err == nil {
		for _, e := range extras {
			gqlB.Extras = append(gqlB.Extras, &model.BookingExtra{
				Extra: &model.ServiceExtra{
					ID:              uuidToString(e.ExtraID),
					NameRo:          e.NameRo,
					NameEn:          e.NameEn,
					Price:           numericToFloat(e.ExtraPrice),
					DurationMinutes: int(e.DurationMinutes),
					Icon:            textPtr(e.Icon),
					IsActive:        true,
					AllowMultiple:   e.AllowMultiple,
					UnitLabel:       textPtr(e.UnitLabel),
				},
				Price:    numericToFloat(e.Price),
				Quantity: int4Val(e.Quantity),
			})
		}
	}
}

// enrichBookingsBatch reduces N+1 queries for list resolvers by deduplicating
// entity lookups across a slice of bookings. Instead of calling enrichBooking()
// (10+ queries per booking), this loads each unique entity type exactly once.
//
// NOTE: Intentionally lighter than enrichBooking — list views don't need photos,
// time slots, extras, or the full worker profile with documents/assessments.
// Always use enrichBooking() for single-booking detail queries.
func (r *Resolver) enrichBookingsBatch(ctx context.Context, dbBookings []db.Booking, gqlBookings []*model.Booking) {
	if len(dbBookings) == 0 {
		return
	}

	// Dedup caches keyed by UUID bytes.
	userCache := map[[16]byte]*model.User{}
	companyCache := map[[16]byte]*model.Company{}
	workerCache := map[[16]byte]*model.WorkerProfile{}
	addressCache := map[[16]byte]*model.Address{}
	reviewCache := map[[16]byte]*model.Review{}

	// Collect unique IDs across all bookings.
	seenUsers := map[[16]byte]bool{}
	seenCompanies := map[[16]byte]bool{}
	seenWorkers := map[[16]byte]bool{}
	seenAddresses := map[[16]byte]bool{}
	for _, b := range dbBookings {
		if b.ClientUserID.Valid {
			seenUsers[b.ClientUserID.Bytes] = true
		}
		if b.CompanyID.Valid {
			seenCompanies[b.CompanyID.Bytes] = true
		}
		if b.WorkerID.Valid {
			seenWorkers[b.WorkerID.Bytes] = true
		}
		if b.AddressID.Valid {
			seenAddresses[b.AddressID.Bytes] = true
		}
	}

	// 1 query per unique user.
	for bytes := range seenUsers {
		if u, err := r.Queries.GetUserByID(ctx, pgtype.UUID{Bytes: bytes, Valid: true}); err == nil {
			userCache[bytes] = dbUserToGQL(u)
		}
	}

	// 1 query per unique company (no stats in list view).
	for bytes := range seenCompanies {
		if c, err := r.Queries.GetCompanyByID(ctx, pgtype.UUID{Bytes: bytes, Valid: true}); err == nil {
			companyCache[bytes] = dbCompanyToGQL(c)
		}
	}

	// 1+1 queries per unique worker (worker row + user row for name/photo).
	// No company, documents, or personality assessment in list view.
	for bytes := range seenWorkers {
		if w, err := r.Queries.GetWorkerByID(ctx, pgtype.UUID{Bytes: bytes, Valid: true}); err == nil {
			if u, err := r.Queries.GetUserByID(ctx, w.UserID); err == nil {
				// Populate user cache while we have the data.
				if _, ok := userCache[u.ID.Bytes]; !ok {
					userCache[u.ID.Bytes] = dbUserToGQL(u)
				}
				wp := dbWorkerToGQL(w, &u)
				wp.User = userCache[u.ID.Bytes]
				workerCache[bytes] = wp
			}
		}
	}

	// 1 query per unique address.
	for bytes := range seenAddresses {
		if a, err := r.Queries.GetAddressByID(ctx, pgtype.UUID{Bytes: bytes, Valid: true}); err == nil {
			addressCache[bytes] = dbAddressToGQL(a)
		}
	}

	// 1 query for all service names (small lookup table).
	serviceNameMap := map[string]string{}
	if services, err := r.Queries.ListActiveServices(ctx); err == nil {
		for _, s := range services {
			serviceNameMap[string(s.ServiceType)] = s.NameRo
		}
	}

	// 1 query per booking for review (reviews are keyed by booking_id).
	for _, b := range dbBookings {
		if review, err := r.Queries.GetReviewByBookingID(ctx, b.ID); err == nil {
			reviewCache[b.ID.Bytes] = dbReviewToGQL(review)
		}
	}

	// Assign enriched values to each GQL booking from cache.
	for i, dbB := range dbBookings {
		gqlB := gqlBookings[i]
		if name, ok := serviceNameMap[string(dbB.ServiceType)]; ok {
			gqlB.ServiceName = name
		}
		if dbB.ClientUserID.Valid {
			gqlB.Client = userCache[dbB.ClientUserID.Bytes]
		}
		if dbB.CompanyID.Valid {
			gqlB.Company = companyCache[dbB.CompanyID.Bytes]
		}
		if dbB.WorkerID.Valid {
			gqlB.Worker = workerCache[dbB.WorkerID.Bytes]
		}
		if dbB.AddressID.Valid {
			gqlB.Address = addressCache[dbB.AddressID.Bytes]
		}
		if rev, ok := reviewCache[dbB.ID.Bytes]; ok {
			gqlB.Review = rev
		}
	}
}

// enrichInvoice populates related entities (line items, booking, company)
// on a GQL invoice from the DB invoice's foreign keys.
func (r *Resolver) enrichInvoice(ctx context.Context, inv db.Invoice, gql *model.Invoice) {
	// Load line items.
	if lineItems, err := r.Queries.ListInvoiceLineItems(ctx, inv.ID); err == nil {
		for _, li := range lineItems {
			gql.LineItems = append(gql.LineItems, dbInvoiceLineItemToGQL(li))
		}
	}

	// Load booking if present.
	if inv.BookingID.Valid {
		if booking, err := r.Queries.GetBookingByID(ctx, inv.BookingID); err == nil {
			gqlBooking := dbBookingToGQL(booking)
			r.enrichBooking(ctx, booking, gqlBooking)
			gql.Booking = gqlBooking
		}
	}

	// Load company if present.
	if inv.CompanyID.Valid {
		if company, err := r.Queries.GetCompanyByID(ctx, inv.CompanyID); err == nil {
			gql.Company = dbCompanyToGQL(company)
		}
	}
}
