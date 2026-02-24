package middleware

import (
	"context"
	"fmt"

	"go2fix-backend/internal/auth"
	db "go2fix-backend/internal/db/generated"

	"github.com/jackc/pgx/v5/pgtype"
)

// AuthzHelper provides reusable authorization checks for various resources.
// This centralizes authorization logic to ensure consistent security across the application.
type AuthzHelper struct {
	queries *db.Queries
}

// NewAuthzHelper creates a new authorization helper with database access.
func NewAuthzHelper(queries *db.Queries) *AuthzHelper {
	return &AuthzHelper{queries: queries}
}

// CanAccessBooking checks if the current user can access a specific booking.
// Access is granted to:
// - Global admins (can access all bookings)
// - The client who created the booking
// - Company admins whose company is assigned to the booking
// - Workers who are assigned to the booking
func (h *AuthzHelper) CanAccessBooking(ctx context.Context, bookingID pgtype.UUID) error {
	claims := auth.GetUserFromContext(ctx)
	if claims == nil {
		return fmt.Errorf("not authenticated")
	}

	// Global admins can access all bookings
	if claims.Role == "global_admin" {
		return nil
	}

	// Fetch the booking to check ownership/assignment
	booking, err := h.queries.GetBookingByID(ctx, bookingID)
	if err != nil {
		return fmt.Errorf("booking not found: %w", err)
	}

	// Convert user ID string to UUID for comparison
	userUUID := stringToUUID(claims.UserID)

	// Client can access their own bookings
	if claims.Role == "client" && booking.ClientUserID == userUUID {
		return nil
	}

	// Company admins can access bookings assigned to their company
	if claims.Role == "company_admin" {
		company, err := h.queries.GetCompanyByAdminUserID(ctx, userUUID)
		if err == nil && booking.CompanyID.Valid && booking.CompanyID.Bytes == company.ID.Bytes {
			return nil
		}
	}

	// Workers can access bookings assigned to them
	if claims.Role == "worker" {
		worker, err := h.queries.GetWorkerByUserID(ctx, userUUID)
		if err == nil && booking.WorkerID.Valid && booking.WorkerID.Bytes == worker.ID.Bytes {
			return nil
		}
	}

	return fmt.Errorf("unauthorized: you do not have access to this booking")
}

// CanAccessCompany checks if the current user can access a specific company.
// Access is granted to:
// - Global admins (can access all companies)
// - Company admins for their own company
func (h *AuthzHelper) CanAccessCompany(ctx context.Context, companyID pgtype.UUID) error {
	claims := auth.GetUserFromContext(ctx)
	if claims == nil {
		return fmt.Errorf("not authenticated")
	}

	// Global admins can access all companies
	if claims.Role == "global_admin" {
		return nil
	}

	// Company admins can access their own company
	if claims.Role == "company_admin" {
		userUUID := stringToUUID(claims.UserID)
		company, err := h.queries.GetCompanyByAdminUserID(ctx, userUUID)
		if err == nil && company.ID.Bytes == companyID.Bytes {
			return nil
		}
	}

	return fmt.Errorf("unauthorized: you do not have access to this company")
}

// RequireRole ensures the current user has one of the specified roles.
// This is useful for operations that are restricted to specific user types.
func RequireRole(ctx context.Context, allowedRoles ...string) error {
	claims := auth.GetUserFromContext(ctx)
	if claims == nil {
		return fmt.Errorf("not authenticated")
	}

	for _, role := range allowedRoles {
		if claims.Role == role {
			return nil
		}
	}

	return fmt.Errorf("unauthorized: requires one of roles %v, but user has role %s", allowedRoles, claims.Role)
}

// Helper function to convert string UUID to pgtype.UUID
// This matches the stringToUUID function used in resolvers
func stringToUUID(s string) pgtype.UUID {
	var uuid pgtype.UUID
	err := uuid.Scan(s)
	if err != nil {
		// Return zero UUID on error
		return pgtype.UUID{}
	}
	return uuid
}
