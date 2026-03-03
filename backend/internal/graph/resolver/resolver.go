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
	Queries             *db.Queries
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
