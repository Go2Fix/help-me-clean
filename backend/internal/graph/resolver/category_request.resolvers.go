package resolver

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"

	"go2fix-backend/internal/auth"
	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/graph/model"
)

// RequestCategoryAccess is the resolver for the requestCategoryAccess field.
// Only company_admin may call this. Creates a pending request for global admin review.
func (r *mutationResolver) RequestCategoryAccess(ctx context.Context, categoryID string, requestType model.CategoryRequestType) (*model.CompanyCategoryRequest, error) {
	claims := auth.GetUserFromContext(ctx)
	if claims == nil {
		return nil, fmt.Errorf("not authenticated")
	}
	if claims.Role != "company_admin" {
		return nil, fmt.Errorf("only company administrators can request category access")
	}

	company, err := r.Queries.GetCompanyByAdminUserID(ctx, stringToUUID(claims.UserID))
	if err != nil {
		return nil, fmt.Errorf("company not found for user")
	}

	cat, err := r.Queries.GetServiceCategoryByID(ctx, stringToUUID(categoryID))
	if err != nil {
		return nil, fmt.Errorf("category not found")
	}
	if !cat.IsActive {
		return nil, fmt.Errorf("category is not active")
	}

	reqTypeStr := strings.ToLower(string(requestType))

	hasCategory, err := r.Queries.CompanyHasCategory(ctx, db.CompanyHasCategoryParams{
		CompanyID:  company.ID,
		CategoryID: stringToUUID(categoryID),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to check category: %w", err)
	}

	if reqTypeStr == "activate" && hasCategory {
		return nil, fmt.Errorf("company already has this category active")
	}
	if reqTypeStr == "deactivate" && !hasCategory {
		return nil, fmt.Errorf("company does not have this category active")
	}

	hasPending, err := r.Queries.HasPendingCategoryRequest(ctx, db.HasPendingCategoryRequestParams{
		CompanyID:   company.ID,
		CategoryID:  stringToUUID(categoryID),
		RequestType: reqTypeStr,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to check pending requests: %w", err)
	}
	if hasPending {
		return nil, fmt.Errorf("there is already a pending request for this category")
	}

	req, err := r.Queries.CreateCompanyCategoryRequest(ctx, db.CreateCompanyCategoryRequestParams{
		CompanyID:   company.ID,
		CategoryID:  stringToUUID(categoryID),
		RequestType: reqTypeStr,
		RequestedBy: stringToUUID(claims.UserID),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create category request: %w", err)
	}

	go r.notifyCategoryRequestReceived(context.Background(), req, company.CompanyName, cat.NameRo)

	return dbCategoryRequestToGQL(req, company, cat), nil
}

// ReviewCategoryRequest is the resolver for the reviewCategoryRequest field.
// Only global_admin may call this. Approves or rejects a pending request and applies the change.
func (r *mutationResolver) ReviewCategoryRequest(ctx context.Context, requestID string, action model.ReviewAction, note *string) (*model.CompanyCategoryRequest, error) {
	claims := auth.GetUserFromContext(ctx)
	if claims == nil {
		return nil, fmt.Errorf("not authenticated")
	}
	if claims.Role != "global_admin" {
		return nil, fmt.Errorf("only global administrators can review category requests")
	}

	req, err := r.Queries.GetCompanyCategoryRequest(ctx, stringToUUID(requestID))
	if err != nil {
		return nil, fmt.Errorf("request not found: %w", err)
	}
	if req.Status != "pending" {
		return nil, fmt.Errorf("request has already been reviewed")
	}

	status := "rejected"
	if action == model.ReviewActionApprove {
		status = "approved"
	}

	reviewerID := pgtype.UUID{Bytes: stringToUUID(claims.UserID).Bytes, Valid: true}

	updatedReq, err := r.Queries.UpdateCompanyCategoryRequestStatus(ctx, db.UpdateCompanyCategoryRequestStatusParams{
		ID:         req.ID,
		Status:     status,
		ReviewedBy: reviewerID,
		ReviewNote: stringToText(note),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update request: %w", err)
	}

	if action == model.ReviewActionApprove {
		if req.RequestType == "activate" {
			if err := r.Queries.InsertCompanyServiceCategory(ctx, db.InsertCompanyServiceCategoryParams{
				CompanyID:  req.CompanyID,
				CategoryID: req.CategoryID,
			}); err != nil {
				log.Printf("reviewCategoryRequest: failed to activate category: %v", err)
			}
		} else {
			if err := r.Queries.DeleteCompanyServiceCategory(ctx, db.DeleteCompanyServiceCategoryParams{
				CompanyID:  req.CompanyID,
				CategoryID: req.CategoryID,
			}); err != nil {
				log.Printf("reviewCategoryRequest: failed to deactivate category: %v", err)
			}
		}
	}

	company, _ := r.Queries.GetCompanyByID(ctx, req.CompanyID)
	cat, _ := r.Queries.GetServiceCategoryByID(ctx, req.CategoryID)

	reviewNote := ""
	if note != nil {
		reviewNote = *note
	}
	go r.notifyCategoryRequestReviewed(context.Background(), req.CompanyID, company.CompanyName, cat.NameRo, status, reviewNote)

	return dbCategoryRequestToGQL(updatedReq, company, cat), nil
}

// PendingCategoryRequests is the resolver for the pendingCategoryRequests field.
func (r *queryResolver) PendingCategoryRequests(ctx context.Context) ([]*model.CompanyCategoryRequest, error) {
	claims := auth.GetUserFromContext(ctx)
	if claims == nil || claims.Role != "global_admin" {
		return nil, fmt.Errorf("not authorized")
	}

	rows, err := r.Queries.ListPendingCategoryRequests(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list pending requests: %w", err)
	}

	result := make([]*model.CompanyCategoryRequest, len(rows))
	for i, row := range rows {
		result[i] = dbPendingRequestRowToGQL(row)
	}
	return result, nil
}

// MyCompanyCategoryRequests is the resolver for the myCompanyCategoryRequests field.
func (r *queryResolver) MyCompanyCategoryRequests(ctx context.Context) ([]*model.CompanyCategoryRequest, error) {
	claims := auth.GetUserFromContext(ctx)
	if claims == nil || claims.Role != "company_admin" {
		return nil, fmt.Errorf("not authorized")
	}

	company, err := r.Queries.GetCompanyByAdminUserID(ctx, stringToUUID(claims.UserID))
	if err != nil {
		return nil, fmt.Errorf("company not found for user")
	}

	rows, err := r.Queries.ListCompanyCategoryRequests(ctx, company.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to list company category requests: %w", err)
	}

	result := make([]*model.CompanyCategoryRequest, len(rows))
	for i, row := range rows {
		result[i] = dbCompanyRequestRowToGQL(row)
	}
	return result, nil
}

// PendingCategoryRequestsCount is the resolver for the pendingCategoryRequestsCount field.
func (r *queryResolver) PendingCategoryRequestsCount(ctx context.Context) (int, error) {
	claims := auth.GetUserFromContext(ctx)
	if claims == nil || claims.Role != "global_admin" {
		return 0, fmt.Errorf("not authorized")
	}

	count, err := r.Queries.CountPendingCategoryRequests(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to count pending requests: %w", err)
	}
	return int(count), nil
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

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

// ─── Notification helpers ─────────────────────────────────────────────────────

// notifyCategoryRequestReceived notifies all active global admins about a new category request.
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

// notifyCategoryRequestReviewed notifies the company admin about their reviewed request.
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
