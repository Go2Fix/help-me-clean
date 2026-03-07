package resolver

import (
	"context"
	"fmt"
	"log"

	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/graph/model"

	"github.com/jackc/pgx/v5/pgtype"
)

func categoryRequestTypeToGQL(t string) model.CategoryRequestType {
	if t == "deactivate" {
		return model.CategoryRequestTypeDeactivate
	}
	return model.CategoryRequestTypeActivate
}

func categoryRequestStatusToGQL(s string) model.CategoryRequestStatus {
	switch s {
	case "approved":
		return model.CategoryRequestStatusApproved
	case "rejected":
		return model.CategoryRequestStatusRejected
	default:
		return model.CategoryRequestStatusPending
	}
}

func dbCategoryRequestToGQL(req db.CompanyCategoryRequest, company db.Company, cat db.ServiceCategory) *model.CompanyCategoryRequest {
	out := &model.CompanyCategoryRequest{
		ID:          uuidToString(req.ID),
		RequestType: categoryRequestTypeToGQL(req.RequestType),
		Status:      categoryRequestStatusToGQL(req.Status),
		CreatedAt:   timestamptzToTime(req.CreatedAt),
		UpdatedAt:   timestamptzToTime(req.UpdatedAt),
	}
	if req.ReviewNote.Valid && req.ReviewNote.String != "" {
		out.ReviewNote = &req.ReviewNote.String
	}
	out.Company = dbCompanyToGQL(company)
	out.Category = &model.ServiceCategory{
		ID:     uuidToString(cat.ID),
		Slug:   cat.Slug,
		NameRo: cat.NameRo,
		NameEn: cat.NameEn,
		Icon:   textPtr(cat.Icon),
	}
	return out
}

func dbPendingRequestRowToGQL(row db.ListPendingCategoryRequestsRow) *model.CompanyCategoryRequest {
	out := &model.CompanyCategoryRequest{
		ID:          uuidToString(row.ID),
		RequestType: categoryRequestTypeToGQL(row.RequestType),
		Status:      categoryRequestStatusToGQL(row.Status),
		CreatedAt:   timestamptzToTime(row.CreatedAt),
		UpdatedAt:   timestamptzToTime(row.UpdatedAt),
	}
	if row.ReviewNote.Valid && row.ReviewNote.String != "" {
		out.ReviewNote = &row.ReviewNote.String
	}
	out.Company = &model.Company{
		ID:          uuidToString(row.CompanyID),
		CompanyName: row.CompanyName,
	}
	out.Category = &model.ServiceCategory{
		ID:     uuidToString(row.CategoryID),
		Slug:   row.CategorySlug,
		NameRo: row.CategoryNameRo,
		NameEn: row.CategoryNameEn,
		Icon:   textPtr(row.CategoryIcon),
	}
	return out
}

func dbCompanyRequestRowToGQL(row db.ListCompanyCategoryRequestsRow) *model.CompanyCategoryRequest {
	out := &model.CompanyCategoryRequest{
		ID:          uuidToString(row.ID),
		RequestType: categoryRequestTypeToGQL(row.RequestType),
		Status:      categoryRequestStatusToGQL(row.Status),
		CreatedAt:   timestamptzToTime(row.CreatedAt),
		UpdatedAt:   timestamptzToTime(row.UpdatedAt),
	}
	if row.ReviewNote.Valid && row.ReviewNote.String != "" {
		out.ReviewNote = &row.ReviewNote.String
	}
	out.Company = &model.Company{
		ID:          uuidToString(row.CompanyID),
		CompanyName: row.CompanyName,
	}
	out.Category = &model.ServiceCategory{
		ID:     uuidToString(row.CategoryID),
		Slug:   row.CategorySlug,
		NameRo: row.CategoryNameRo,
		NameEn: row.CategoryNameEn,
		Icon:   textPtr(row.CategoryIcon),
	}
	return out
}

func (r *Resolver) notifyCategoryRequestReceived(ctx context.Context, req db.CompanyCategoryRequest, companyName, categoryNameRo string) {
	admins, err := r.Queries.ListGlobalAdmins(ctx)
	if err != nil {
		log.Printf("notifyCategoryRequestReceived: failed to list admins: %v", err)
		return
	}
	reqTypeRo := "activare"
	if req.RequestType == "deactivate" {
		reqTypeRo = "dezactivare"
	}
	title := "Cerere categorie nouă"
	body := fmt.Sprintf("Compania %s a solicitat %s categoriei %s.", companyName, reqTypeRo, categoryNameRo)
	data := []byte(fmt.Sprintf(`{"requestId":"%s"}`, uuidToString(req.ID)))
	for _, admin := range admins {
		if _, err := r.Queries.CreateNotification(ctx, db.CreateNotificationParams{
			UserID: admin.ID,
			Type:   db.NotificationTypeCategoryRequestReceived,
			Title:  title,
			Body:   body,
			Data:   data,
		}); err != nil {
			log.Printf("notifyCategoryRequestReceived: failed to notify admin %s: %v", uuidToString(admin.ID), err)
		}
	}
}

func (r *Resolver) notifyCategoryRequestReviewed(ctx context.Context, companyID pgtype.UUID, companyName, categoryNameRo, status, note string) {
	company, err := r.Queries.GetCompanyByID(ctx, companyID)
	if err != nil || !company.AdminUserID.Valid {
		return
	}
	var title, body string
	var notifType db.NotificationType
	if status == "approved" {
		title = "Cerere categorie aprobată"
		body = fmt.Sprintf("Cererea ta pentru categoria %s a fost aprobată.", categoryNameRo)
		notifType = db.NotificationTypeCategoryRequestApproved
	} else {
		title = "Cerere categorie respinsă"
		body = fmt.Sprintf("Cererea ta pentru categoria %s a fost respinsă.", categoryNameRo)
		if note != "" {
			body += " Motiv: " + note
		}
		notifType = db.NotificationTypeCategoryRequestRejected
	}
	data := []byte(fmt.Sprintf(`{"companyName":"%s"}`, companyName))
	if _, err := r.Queries.CreateNotification(ctx, db.CreateNotificationParams{
		UserID: company.AdminUserID,
		Type:   notifType,
		Title:  title,
		Body:   body,
		Data:   data,
	}); err != nil {
		log.Printf("notifyCategoryRequestReviewed: failed to notify company admin: %v", err)
	}
}
