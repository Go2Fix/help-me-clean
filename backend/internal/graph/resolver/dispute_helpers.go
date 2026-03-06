package resolver

import (
	"context"
	"fmt"
	"log"

	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/graph/model"
	"go2fix-backend/internal/service/notification"

	"github.com/jackc/pgx/v5/pgtype"
)

// issueDisputeRefund issues a Stripe refund for a dispute resolution.
// It is non-blocking and logs errors without propagating them.
func (r *Resolver) issueDisputeRefund(ctx context.Context, bookingID pgtype.UUID, refundAmountRON float64) {
	booking, err := r.Queries.GetBookingByID(ctx, bookingID)
	if err != nil {
		log.Printf("[dispute] issueRefund: could not load booking %s: %v", uuidToString(bookingID), err)
		return
	}
	if !booking.StripePaymentIntentID.Valid || booking.StripePaymentIntentID.String == "" {
		log.Printf("[dispute] issueRefund: booking %s has no Stripe payment intent", booking.ReferenceCode)
		return
	}
	if r.PaymentService == nil {
		log.Printf("[dispute] issueRefund: PaymentService is nil, skipping refund for booking %s", booking.ReferenceCode)
		return
	}
	// Stripe amounts are in bani (RON × 100).
	amountBani := int64(refundAmountRON * 100)
	refundID, err := r.PaymentService.CreateRefund(ctx, booking.StripePaymentIntentID.String, amountBani)
	if err != nil {
		log.Printf("[dispute] issueRefund: stripe refund failed for booking %s: %v", booking.ReferenceCode, err)
		return
	}
	log.Printf("[dispute] issueRefund: created Stripe refund %s for booking %s (%.2f RON)", refundID, booking.ReferenceCode, refundAmountRON)
}

// dbDisputeToGQL converts a db.BookingDispute row to the GraphQL BookingDispute model.
// Related entities (booking, openedBy, resolvedBy) are not populated here — they are
// lazily loaded by the admin list resolver or left nil for lightweight responses.
func dbDisputeToGQL(d db.BookingDispute) *model.BookingDispute {
	out := &model.BookingDispute{
		ID:          uuidToString(d.ID),
		BookingID:   uuidToString(d.BookingID),
		Reason:      dbReasonToGQLReason(d.Reason),
		Description: d.Description,
		EvidenceUrls: d.EvidenceUrls,
		Status:      dbStatusToGQLStatus(d.Status),
		AutoCloseAt: timestamptzToTime(d.AutoCloseAt),
		CreatedAt:   timestamptzToTime(d.CreatedAt),
	}

	// Nullable fields.
	if d.CompanyResponse.Valid {
		out.CompanyResponse = &d.CompanyResponse.String
	}
	out.CompanyRespondedAt = timestamptzToTimePtr(d.CompanyRespondedAt)
	if d.ResolutionNotes.Valid {
		out.ResolutionNotes = &d.ResolutionNotes.String
	}
	out.RefundAmount = numericToFloatPtr(d.RefundAmount)

	// Populate openedBy as a stub User (ID only) to satisfy non-null GQL contract.
	// Full user enrichment would require an extra query; callers can enrich if needed.
	out.OpenedBy = &model.User{ID: uuidToString(d.OpenedBy)}

	// resolvedBy is nullable.
	if d.ResolvedBy.Valid {
		out.ResolvedBy = &model.User{ID: uuidToString(d.ResolvedBy)}
	}

	return out
}

// gqlReasonToDBReason maps a GraphQL DisputeReason enum to the DB DisputeReason type.
func gqlReasonToDBReason(r model.DisputeReason) (db.DisputeReason, error) {
	switch r {
	case model.DisputeReasonPoorQuality:
		return db.DisputeReasonPoorQuality, nil
	case model.DisputeReasonNoShow:
		return db.DisputeReasonNoShow, nil
	case model.DisputeReasonPropertyDamage:
		return db.DisputeReasonPropertyDamage, nil
	case model.DisputeReasonIncompleteJob:
		return db.DisputeReasonIncompleteJob, nil
	case model.DisputeReasonOvercharge:
		return db.DisputeReasonOvercharge, nil
	case model.DisputeReasonOther:
		return db.DisputeReasonOther, nil
	}
	return "", fmt.Errorf("unknown dispute reason: %s", r)
}

// dbReasonToGQLReason maps a DB DisputeReason to the GraphQL enum value.
func dbReasonToGQLReason(r db.DisputeReason) model.DisputeReason {
	switch r {
	case db.DisputeReasonPoorQuality:
		return model.DisputeReasonPoorQuality
	case db.DisputeReasonNoShow:
		return model.DisputeReasonNoShow
	case db.DisputeReasonPropertyDamage:
		return model.DisputeReasonPropertyDamage
	case db.DisputeReasonIncompleteJob:
		return model.DisputeReasonIncompleteJob
	case db.DisputeReasonOvercharge:
		return model.DisputeReasonOvercharge
	default:
		return model.DisputeReasonOther
	}
}

// gqlStatusToDBStatus maps a GraphQL DisputeStatus enum to the DB DisputeStatus type.
func gqlStatusToDBStatus(s model.DisputeStatus) (db.DisputeStatus, error) {
	switch s {
	case model.DisputeStatusOpen:
		return db.DisputeStatusOpen, nil
	case model.DisputeStatusCompanyResponded:
		return db.DisputeStatusCompanyResponded, nil
	case model.DisputeStatusUnderReview:
		return db.DisputeStatusUnderReview, nil
	case model.DisputeStatusResolvedRefundFull:
		return db.DisputeStatusResolvedRefundFull, nil
	case model.DisputeStatusResolvedRefundPartial:
		return db.DisputeStatusResolvedRefundPartial, nil
	case model.DisputeStatusResolvedNoRefund:
		return db.DisputeStatusResolvedNoRefund, nil
	case model.DisputeStatusAutoClosed:
		return db.DisputeStatusAutoClosed, nil
	}
	return "", fmt.Errorf("unknown dispute status: %s", s)
}

// dbStatusToGQLStatus maps a DB DisputeStatus to the GraphQL enum value.
func dbStatusToGQLStatus(s db.DisputeStatus) model.DisputeStatus {
	switch s {
	case db.DisputeStatusOpen:
		return model.DisputeStatusOpen
	case db.DisputeStatusCompanyResponded:
		return model.DisputeStatusCompanyResponded
	case db.DisputeStatusUnderReview:
		return model.DisputeStatusUnderReview
	case db.DisputeStatusResolvedRefundFull:
		return model.DisputeStatusResolvedRefundFull
	case db.DisputeStatusResolvedRefundPartial:
		return model.DisputeStatusResolvedRefundPartial
	case db.DisputeStatusResolvedNoRefund:
		return model.DisputeStatusResolvedNoRefund
	default:
		return model.DisputeStatusAutoClosed
	}
}

// dispatchDisputeOpenedNotifications notifies the company admin when a client opens a dispute.
func (r *Resolver) dispatchDisputeOpenedNotifications(ctx context.Context, booking db.Booking, dispute db.BookingDispute) {
	bookingID := uuidToString(booking.ID)
	disputeID := uuidToString(dispute.ID)
	notifData := []byte(fmt.Sprintf(`{"bookingId":"%s","disputeId":"%s"}`, bookingID, disputeID))

	clientName := "Clientul"
	if booking.ClientUserID.Valid {
		if cu, err := r.Queries.GetUserByID(ctx, booking.ClientUserID); err == nil {
			clientName = cu.FullName
		}
	}

	// In-app notification to company admin.
	if booking.CompanyID.Valid {
		company, err := r.Queries.GetCompanyByID(ctx, booking.CompanyID)
		if err == nil {
			adminUserID, adminEmail, adminName := r.loadCompanyAdmin(ctx, company)
			if adminUserID != "" {
				adminPgID := stringToUUID(adminUserID)
				body := fmt.Sprintf("Un client a deschis o dispută pentru comanda %s.", booking.ReferenceCode)
				if _, err := r.Queries.CreateNotification(ctx, db.CreateNotificationParams{
					UserID: adminPgID,
					Type:   db.NotificationTypeBookingCancelled, // reuse nearest type; dispute type not yet in enum
					Title:  "Dispută deschisă",
					Body:   body,
					Data:   notifData,
				}); err != nil {
					log.Printf("[dispute] openedNotif: failed to notify company admin in-app: %v", err)
				}
			}
			if adminEmail != "" {
				if err := r.NotifSvc.DispatchSync(ctx, notification.EventBookingCancelledByClient,
					notification.Payload{
						"bookingId":     bookingID,
						"referenceCode": booking.ReferenceCode,
						"clientName":    clientName,
						"reason":        fmt.Sprintf("Dispută: %s", dispute.Reason),
					},
					[]notification.Target{{UserID: adminUserID, Email: adminEmail, Name: adminName}},
				); err != nil {
					log.Printf("[dispute] openedNotif: admin email: %v", err)
				}
			}
		}
	}

	// Platform-level Slack notification so the admin sees all disputes.
	if err := r.NotifSvc.DispatchSync(ctx, notification.EventDisputeOpened,
		notification.Payload{
			"referenceCode": booking.ReferenceCode,
			"clientName":    clientName,
			"reason":        string(dispute.Reason),
		},
		[]notification.Target{{Name: "Admin"}},
	); err != nil {
		log.Printf("[dispute] openedNotif: slack: %v", err)
	}
}

// dispatchDisputeResponseNotifications notifies the client and platform admin when a
// company submits a response to a dispute.
func (r *Resolver) dispatchDisputeResponseNotifications(ctx context.Context, booking db.Booking, dispute db.BookingDispute) {
	bookingID := uuidToString(booking.ID)
	disputeID := uuidToString(dispute.ID)
	notifData := []byte(fmt.Sprintf(`{"bookingId":"%s","disputeId":"%s"}`, bookingID, disputeID))

	// In-app notification to client.
	if booking.ClientUserID.Valid {
		body := fmt.Sprintf("Compania a răspuns la disputa ta pentru comanda %s.", booking.ReferenceCode)
		if _, err := r.Queries.CreateNotification(ctx, db.CreateNotificationParams{
			UserID: booking.ClientUserID,
			Type:   db.NotificationTypeBookingCancelled,
			Title:  "Răspuns la dispută",
			Body:   body,
			Data:   notifData,
		}); err != nil {
			log.Printf("[dispute] responseNotif: failed to notify client in-app: %v", err)
		}

		// Email to client.
		if clientUser, err := r.Queries.GetUserByID(ctx, booking.ClientUserID); err == nil {
			if err := r.NotifSvc.DispatchSync(ctx, notification.EventBookingConfirmedClient,
				notification.Payload{
					"bookingId":     bookingID,
					"referenceCode": booking.ReferenceCode,
					"clientName":    clientUser.FullName,
					"status":        "dispute_responded",
				},
				[]notification.Target{{UserID: uuidToString(clientUser.ID), Email: clientUser.Email, Name: clientUser.FullName}},
			); err != nil {
				log.Printf("[dispute] responseNotif: client email: %v", err)
			}
		}
	}
}

// dispatchDisputeResolvedNotification notifies the client of the dispute resolution outcome.
func (r *Resolver) dispatchDisputeResolvedNotification(ctx context.Context, bookingID pgtype.UUID, dispute db.BookingDispute) {
	booking, err := r.Queries.GetBookingByID(ctx, bookingID)
	if err != nil {
		log.Printf("[dispute] resolvedNotif: could not load booking %s: %v", uuidToString(bookingID), err)
		return
	}

	disputeIDStr := uuidToString(dispute.ID)
	bookingIDStr := uuidToString(booking.ID)
	notifData := []byte(fmt.Sprintf(`{"bookingId":"%s","disputeId":"%s"}`, bookingIDStr, disputeIDStr))

	if !booking.ClientUserID.Valid {
		return
	}

	clientUser, err := r.Queries.GetUserByID(ctx, booking.ClientUserID)
	if err != nil {
		log.Printf("[dispute] resolvedNotif: could not load client for booking %s: %v", booking.ReferenceCode, err)
		return
	}

	body := fmt.Sprintf("Disputa ta pentru comanda %s a fost rezolvată: %s.", booking.ReferenceCode, dispute.Status)

	// In-app notification.
	if _, err := r.Queries.CreateNotification(ctx, db.CreateNotificationParams{
		UserID: booking.ClientUserID,
		Type:   db.NotificationTypePaymentProcessed,
		Title:  "Dispută rezolvată",
		Body:   body,
		Data:   notifData,
	}); err != nil {
		log.Printf("[dispute] resolvedNotif: failed to notify client in-app: %v", err)
	}

	// Email notification — reuse booking_completed template as closest match.
	if err := r.NotifSvc.DispatchSync(ctx, notification.EventBookingCompleted,
		notification.Payload{
			"bookingId":       bookingIDStr,
			"referenceCode":   booking.ReferenceCode,
			"clientName":      clientUser.FullName,
			"disputeStatus":   string(dispute.Status),
			"resolutionNotes": dispute.ResolutionNotes.String,
		},
		[]notification.Target{{UserID: uuidToString(clientUser.ID), Email: clientUser.Email, Name: clientUser.FullName}},
	); err != nil {
		log.Printf("[dispute] resolvedNotif: client email: %v", err)
	}

	// Platform-level Slack notification so the admin sees dispute resolutions.
	if err := r.NotifSvc.DispatchSync(ctx, notification.EventDisputeResolved,
		notification.Payload{
			"referenceCode": booking.ReferenceCode,
			"disputeStatus": string(dispute.Status),
		},
		[]notification.Target{{Name: "Admin"}},
	); err != nil {
		log.Printf("[dispute] resolvedNotif: slack: %v", err)
	}
}
