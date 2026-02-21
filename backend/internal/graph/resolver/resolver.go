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
	"go2fix-backend/internal/service/email"
	"go2fix-backend/internal/service/invoice"
	"go2fix-backend/internal/service/payment"
	"go2fix-backend/internal/storage"
)

// Resolver is the root resolver struct.
type Resolver struct {
	Pool           *pgxpool.Pool
	Queries        *db.Queries
	PaymentService *payment.Service
	InvoiceService *invoice.Service
	EmailService   *email.Service
	Storage        storage.Storage
	AuthzHelper    *middleware.AuthzHelper
}

// cleanerWithCompany loads a cleaner's company, user, documents, and assessment, returns the full CleanerProfile.
func (r *Resolver) cleanerWithCompany(ctx context.Context, c db.Cleaner) (*model.CleanerProfile, error) {
	// Load user (REQUIRED - user_id is now NOT NULL after migration)
	user, err := r.Queries.GetUserByID(ctx, c.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to load user for cleaner: %w", err)
	}

	// Convert cleaner with user data
	profile := dbCleanerToGQL(c, &user)

	// Attach user to profile
	profile.User = dbUserToGQL(user)

	// Load company
	company, err := r.Queries.GetCompanyByID(ctx, c.CompanyID)
	if err != nil {
		return nil, fmt.Errorf("failed to load company: %w", err)
	}
	profile.Company = dbCompanyToGQL(company)

	// Load cleaner documents
	if docs, err := r.Queries.ListCleanerDocuments(ctx, c.ID); err == nil {
		for _, d := range docs {
			profile.Documents = append(profile.Documents, dbCleanerDocToGQL(d))
		}
	}

	// Load personality assessment if exists
	if assessment, err := r.Queries.GetPersonalityAssessmentByCleanerID(ctx, c.ID); err == nil {
		profile.PersonalityAssessment = dbPersonalityAssessmentToGQL(assessment)
	}

	return profile, nil
}

// createBookingChat creates a chat room for a confirmed booking and sends a system welcome message.
// Called asynchronously from ConfirmBooking — errors are logged, not propagated.
func (r *Resolver) createBookingChat(ctx context.Context, booking db.Booking, confirmerUserID string) {
	bookingUUID := booking.ID

	// Check if a chat room already exists for this booking.
	if _, err := r.Queries.GetChatRoomByBookingID(ctx, bookingUUID); err == nil {
		return // Room already exists.
	}

	// Create a new chat room linked to this booking.
	room, err := r.Queries.CreateChatRoom(ctx, db.CreateChatRoomParams{
		BookingID: pgtype.UUID{Bytes: bookingUUID.Bytes, Valid: true},
		RoomType:  "booking",
	})
	if err != nil {
		log.Printf("createBookingChat: failed to create room for booking %s: %v", bookingUUID, err)
		return
	}

	// Add client as participant.
	if booking.ClientUserID.Valid {
		_, _ = r.Queries.AddChatParticipant(ctx, db.AddChatParticipantParams{
			RoomID: room.ID,
			UserID: booking.ClientUserID,
		})
	}

	// Add cleaner's user as participant.
	var senderID pgtype.UUID
	if booking.CleanerID.Valid {
		cleaner, err := r.Queries.GetCleanerByID(ctx, booking.CleanerID)
		if err == nil && cleaner.UserID.Valid {
			_, _ = r.Queries.AddChatParticipant(ctx, db.AddChatParticipantParams{
				RoomID: room.ID,
				UserID: cleaner.UserID,
			})
			senderID = cleaner.UserID
		}
	}

	// Fallback sender: use the confirmer's user ID if cleaner user not available.
	if !senderID.Valid {
		senderID = stringToUUID(confirmerUserID)
	}

	// Send system welcome message.
	msg, err := r.Queries.CreateChatMessage(ctx, db.CreateChatMessageParams{
		RoomID:      room.ID,
		SenderID:    senderID,
		Content:     "Bun venit! Curatorul a confirmat comanda. Puteti comunica aici pentru orice detalii legate de curatenie.",
		MessageType: stringToTextVal("system"),
	})
	if err != nil {
		log.Printf("createBookingChat: failed to send system message for booking %s: %v", bookingUUID, err)
		return
	}

	_ = msg
}

// CreateBookingChatFromPayment creates a chat room for a booking that was auto-confirmed
// via payment webhook. Uses the cleaner's or client's user ID as system message sender.
// Errors are logged, not propagated.
func (r *Resolver) CreateBookingChatFromPayment(ctx context.Context, booking db.Booking) {
	senderUserID := ""
	if booking.CleanerID.Valid {
		cleaner, err := r.Queries.GetCleanerByID(ctx, booking.CleanerID)
		if err == nil && cleaner.UserID.Valid {
			senderUserID = uuidToString(cleaner.UserID)
		}
	}
	if senderUserID == "" && booking.ClientUserID.Valid {
		senderUserID = uuidToString(booking.ClientUserID)
	}
	if senderUserID == "" {
		log.Printf("CreateBookingChatFromPayment: no user ID available for booking %s", uuidToString(booking.ID))
		return
	}
	r.createBookingChat(ctx, booking, senderUserID)
}

// copyCompanyAreasToCleanerHelper copies all company service areas to a newly created cleaner.
// Errors are logged but not propagated (best-effort).
func (r *Resolver) copyCompanyAreasToCleanerHelper(ctx context.Context, companyID pgtype.UUID, cleanerID pgtype.UUID) {
	areas, err := r.Queries.ListCompanyServiceAreas(ctx, companyID)
	if err != nil {
		log.Printf("copyCompanyAreasToCleanerHelper: failed to list company areas: %v", err)
		return
	}
	for _, area := range areas {
		_, err := r.Queries.InsertCleanerServiceArea(ctx, db.InsertCleanerServiceAreaParams{
			CleanerID:  cleanerID,
			CityAreaID: area.CityAreaID,
		})
		if err != nil {
			log.Printf("copyCompanyAreasToCleanerHelper: failed to insert area %s: %v", area.AreaName, err)
		}
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

// enrichBooking populates related entities (client, address, serviceName, company, cleaner)
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
			gqlB.Company = dbCompanyToGQL(company)
		}
	}
	if dbB.CleanerID.Valid {
		if cleaner, err := r.Queries.GetCleanerByID(ctx, dbB.CleanerID); err == nil {
			if profile, err := r.cleanerWithCompany(ctx, cleaner); err == nil {
				gqlB.Cleaner = profile
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
