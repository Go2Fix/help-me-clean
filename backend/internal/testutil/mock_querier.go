// Package testutil provides test helpers, fixtures, and mocks for resolver tests.
package testutil

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgtype"

	db "go2fix-backend/internal/db/generated"
)

// PartialMockQuerier is a test double for db.Querier. Configure only the
// function fields your test needs. Every method that has no Fn configured
// panics with a descriptive message so that a missing setup is immediately
// visible in test output.
type PartialMockQuerier struct {
	// Promo-code operations
	GetPromoCodeByCodeFn        func(context.Context, interface{}) (db.PromoCode, error)
	GetPromoCodeByIDFn          func(context.Context, pgtype.UUID) (db.PromoCode, error)
	GetPromoCodeUseByBookingFn  func(context.Context, pgtype.UUID) (db.PromoCodeUse, error)
	CountPromoCodeUsesByUserFn  func(context.Context, db.CountPromoCodeUsesByUserParams) (int64, error)
	ApplyPromoCodeToBookingFn   func(context.Context, db.ApplyPromoCodeToBookingParams) (db.Booking, error)
	CreatePromoCodeUseFn        func(context.Context, db.CreatePromoCodeUseParams) (db.PromoCodeUse, error)
	IncrementPromoCodeUsesFn    func(context.Context, pgtype.UUID) (db.PromoCode, error)
	CreatePromoCodeFn           func(context.Context, db.CreatePromoCodeParams) (db.PromoCode, error)
	ListPromoCodesFn            func(context.Context, db.ListPromoCodesParams) ([]db.PromoCode, error)
	UpdatePromoCodeFn           func(context.Context, db.UpdatePromoCodeParams) (db.PromoCode, error)
	CountAllPromoCodesFn        func(context.Context) (int64, error)

	// Booking operations
	GetBookingByIDFn           func(context.Context, pgtype.UUID) (db.Booking, error)
	GetBookingByReferenceCodeFn func(context.Context, string) (db.Booking, error)
	CreateBookingFn            func(context.Context, db.CreateBookingParams) (db.Booking, error)
	UpdateBookingStatusFn      func(context.Context, db.UpdateBookingStatusParams) (db.Booking, error)
	CancelBookingWithReasonFn  func(context.Context, db.CancelBookingWithReasonParams) (db.Booking, error)
	AdminCancelBookingWithReasonFn func(context.Context, db.AdminCancelBookingWithReasonParams) (db.Booking, error)
	AssignWorkerToBookingFn    func(context.Context, db.AssignWorkerToBookingParams) (db.Booking, error)

	// Worker operations
	GetWorkerByIDFn              func(context.Context, pgtype.UUID) (db.Worker, error)
	WorkerHasCategoryFn          func(context.Context, db.WorkerHasCategoryParams) (bool, error)
	CountWorkerBookingsForDateFn func(context.Context, db.CountWorkerBookingsForDateParams) (int64, error)

	// Company operations
	GetCompanyByAdminUserIDFn func(context.Context, pgtype.UUID) (db.Company, error)
	GetCompanyByIDFn          func(context.Context, pgtype.UUID) (db.Company, error)
	UpdateCompanyStatusFn     func(context.Context, db.UpdateCompanyStatusParams) (db.Company, error)
	RejectCompanyFn           func(context.Context, db.RejectCompanyParams) (db.Company, error)

	// User operations
	GetUserByIDFn    func(context.Context, pgtype.UUID) (db.User, error)
	GetUserByEmailFn func(context.Context, string) (db.User, error)
	UpdateUserStatusFn func(context.Context, db.UpdateUserStatusParams) (db.User, error)

	// Review operations
	DeleteReviewFn       func(context.Context, pgtype.UUID) error
	UpdateReviewStatusFn func(context.Context, db.UpdateReviewStatusParams) (db.Review, error)

	// Notification operations
	CreateNotificationFn func(context.Context, db.CreateNotificationParams) (db.Notification, error)

	// Platform settings
	GetPlatformSettingFn func(context.Context, string) (db.PlatformSetting, error)

	// Service lookups (used by enrichBooking)
	GetServiceByTypeFn func(context.Context, db.ServiceType) (db.ServiceDefinition, error)

	// Unconditional enrichBooking calls — configurable so success-path tests can
	// return empty/error results instead of panicking.
	ListBookingTimeSlotsFn  func(context.Context, pgtype.UUID) ([]db.BookingTimeSlot, error)
	GetReviewByBookingIDFn  func(context.Context, pgtype.UUID) (db.Review, error)
	ListJobPhotosByBookingFn func(context.Context, pgtype.UUID) ([]db.BookingJobPhoto, error)
	ListBookingExtrasFn     func(context.Context, pgtype.UUID) ([]db.ListBookingExtrasRow, error)
}

// Ensure PartialMockQuerier implements db.Querier at compile time.
var _ db.Querier = (*PartialMockQuerier)(nil)

func (m *PartialMockQuerier) GetPromoCodeByCode(ctx context.Context, upper interface{}) (db.PromoCode, error) {
	if m.GetPromoCodeByCodeFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "GetPromoCodeByCode"))
	}
	return m.GetPromoCodeByCodeFn(ctx, upper)
}

func (m *PartialMockQuerier) GetPromoCodeByID(ctx context.Context, id pgtype.UUID) (db.PromoCode, error) {
	if m.GetPromoCodeByIDFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "GetPromoCodeByID"))
	}
	return m.GetPromoCodeByIDFn(ctx, id)
}

func (m *PartialMockQuerier) GetPromoCodeUseByBooking(ctx context.Context, bookingID pgtype.UUID) (db.PromoCodeUse, error) {
	if m.GetPromoCodeUseByBookingFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "GetPromoCodeUseByBooking"))
	}
	return m.GetPromoCodeUseByBookingFn(ctx, bookingID)
}

func (m *PartialMockQuerier) CountPromoCodeUsesByUser(ctx context.Context, arg db.CountPromoCodeUsesByUserParams) (int64, error) {
	if m.CountPromoCodeUsesByUserFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "CountPromoCodeUsesByUser"))
	}
	return m.CountPromoCodeUsesByUserFn(ctx, arg)
}

func (m *PartialMockQuerier) ApplyPromoCodeToBooking(ctx context.Context, arg db.ApplyPromoCodeToBookingParams) (db.Booking, error) {
	if m.ApplyPromoCodeToBookingFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "ApplyPromoCodeToBooking"))
	}
	return m.ApplyPromoCodeToBookingFn(ctx, arg)
}

func (m *PartialMockQuerier) CreatePromoCodeUse(ctx context.Context, arg db.CreatePromoCodeUseParams) (db.PromoCodeUse, error) {
	if m.CreatePromoCodeUseFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "CreatePromoCodeUse"))
	}
	return m.CreatePromoCodeUseFn(ctx, arg)
}

func (m *PartialMockQuerier) IncrementPromoCodeUses(ctx context.Context, id pgtype.UUID) (db.PromoCode, error) {
	if m.IncrementPromoCodeUsesFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "IncrementPromoCodeUses"))
	}
	return m.IncrementPromoCodeUsesFn(ctx, id)
}

func (m *PartialMockQuerier) CreatePromoCode(ctx context.Context, arg db.CreatePromoCodeParams) (db.PromoCode, error) {
	if m.CreatePromoCodeFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "CreatePromoCode"))
	}
	return m.CreatePromoCodeFn(ctx, arg)
}

func (m *PartialMockQuerier) ListPromoCodes(ctx context.Context, arg db.ListPromoCodesParams) ([]db.PromoCode, error) {
	if m.ListPromoCodesFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "ListPromoCodes"))
	}
	return m.ListPromoCodesFn(ctx, arg)
}

func (m *PartialMockQuerier) UpdatePromoCode(ctx context.Context, arg db.UpdatePromoCodeParams) (db.PromoCode, error) {
	if m.UpdatePromoCodeFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "UpdatePromoCode"))
	}
	return m.UpdatePromoCodeFn(ctx, arg)
}

func (m *PartialMockQuerier) CountAllPromoCodes(ctx context.Context) (int64, error) {
	if m.CountAllPromoCodesFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "CountAllPromoCodes"))
	}
	return m.CountAllPromoCodesFn(ctx)
}

func (m *PartialMockQuerier) GetBookingByID(ctx context.Context, id pgtype.UUID) (db.Booking, error) {
	if m.GetBookingByIDFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "GetBookingByID"))
	}
	return m.GetBookingByIDFn(ctx, id)
}

func (m *PartialMockQuerier) GetBookingByReferenceCode(ctx context.Context, referenceCode string) (db.Booking, error) {
	if m.GetBookingByReferenceCodeFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "GetBookingByReferenceCode"))
	}
	return m.GetBookingByReferenceCodeFn(ctx, referenceCode)
}

func (m *PartialMockQuerier) CreateBooking(ctx context.Context, arg db.CreateBookingParams) (db.Booking, error) {
	if m.CreateBookingFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "CreateBooking"))
	}
	return m.CreateBookingFn(ctx, arg)
}

func (m *PartialMockQuerier) UpdateBookingStatus(ctx context.Context, arg db.UpdateBookingStatusParams) (db.Booking, error) {
	if m.UpdateBookingStatusFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "UpdateBookingStatus"))
	}
	return m.UpdateBookingStatusFn(ctx, arg)
}

func (m *PartialMockQuerier) CancelBookingWithReason(ctx context.Context, arg db.CancelBookingWithReasonParams) (db.Booking, error) {
	if m.CancelBookingWithReasonFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "CancelBookingWithReason"))
	}
	return m.CancelBookingWithReasonFn(ctx, arg)
}

func (m *PartialMockQuerier) AdminCancelBookingWithReason(ctx context.Context, arg db.AdminCancelBookingWithReasonParams) (db.Booking, error) {
	if m.AdminCancelBookingWithReasonFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "AdminCancelBookingWithReason"))
	}
	return m.AdminCancelBookingWithReasonFn(ctx, arg)
}

func (m *PartialMockQuerier) AssignWorkerToBooking(ctx context.Context, arg db.AssignWorkerToBookingParams) (db.Booking, error) {
	if m.AssignWorkerToBookingFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "AssignWorkerToBooking"))
	}
	return m.AssignWorkerToBookingFn(ctx, arg)
}

func (m *PartialMockQuerier) GetWorkerByID(ctx context.Context, id pgtype.UUID) (db.Worker, error) {
	if m.GetWorkerByIDFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "GetWorkerByID"))
	}
	return m.GetWorkerByIDFn(ctx, id)
}

func (m *PartialMockQuerier) WorkerHasCategory(ctx context.Context, arg db.WorkerHasCategoryParams) (bool, error) {
	if m.WorkerHasCategoryFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "WorkerHasCategory"))
	}
	return m.WorkerHasCategoryFn(ctx, arg)
}

func (m *PartialMockQuerier) CountWorkerBookingsForDate(ctx context.Context, arg db.CountWorkerBookingsForDateParams) (int64, error) {
	if m.CountWorkerBookingsForDateFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "CountWorkerBookingsForDate"))
	}
	return m.CountWorkerBookingsForDateFn(ctx, arg)
}

func (m *PartialMockQuerier) GetCompanyByAdminUserID(ctx context.Context, adminUserID pgtype.UUID) (db.Company, error) {
	if m.GetCompanyByAdminUserIDFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "GetCompanyByAdminUserID"))
	}
	return m.GetCompanyByAdminUserIDFn(ctx, adminUserID)
}

func (m *PartialMockQuerier) GetCompanyByID(ctx context.Context, id pgtype.UUID) (db.Company, error) {
	if m.GetCompanyByIDFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "GetCompanyByID"))
	}
	return m.GetCompanyByIDFn(ctx, id)
}

func (m *PartialMockQuerier) UpdateCompanyStatus(ctx context.Context, arg db.UpdateCompanyStatusParams) (db.Company, error) {
	if m.UpdateCompanyStatusFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "UpdateCompanyStatus"))
	}
	return m.UpdateCompanyStatusFn(ctx, arg)
}

func (m *PartialMockQuerier) RejectCompany(ctx context.Context, arg db.RejectCompanyParams) (db.Company, error) {
	if m.RejectCompanyFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "RejectCompany"))
	}
	return m.RejectCompanyFn(ctx, arg)
}

func (m *PartialMockQuerier) GetUserByID(ctx context.Context, id pgtype.UUID) (db.User, error) {
	if m.GetUserByIDFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "GetUserByID"))
	}
	return m.GetUserByIDFn(ctx, id)
}

func (m *PartialMockQuerier) GetUserByEmail(ctx context.Context, email string) (db.User, error) {
	if m.GetUserByEmailFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "GetUserByEmail"))
	}
	return m.GetUserByEmailFn(ctx, email)
}

func (m *PartialMockQuerier) UpdateUserStatus(ctx context.Context, arg db.UpdateUserStatusParams) (db.User, error) {
	if m.UpdateUserStatusFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "UpdateUserStatus"))
	}
	return m.UpdateUserStatusFn(ctx, arg)
}

func (m *PartialMockQuerier) DeleteReview(ctx context.Context, id pgtype.UUID) error {
	if m.DeleteReviewFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "DeleteReview"))
	}
	return m.DeleteReviewFn(ctx, id)
}

func (m *PartialMockQuerier) UpdateReviewStatus(ctx context.Context, arg db.UpdateReviewStatusParams) (db.Review, error) {
	if m.UpdateReviewStatusFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "UpdateReviewStatus"))
	}
	return m.UpdateReviewStatusFn(ctx, arg)
}

func (m *PartialMockQuerier) CreateNotification(ctx context.Context, arg db.CreateNotificationParams) (db.Notification, error) {
	if m.CreateNotificationFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "CreateNotification"))
	}
	return m.CreateNotificationFn(ctx, arg)
}

func (m *PartialMockQuerier) GetPlatformSetting(ctx context.Context, key string) (db.PlatformSetting, error) {
	if m.GetPlatformSettingFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "GetPlatformSetting"))
	}
	return m.GetPlatformSettingFn(ctx, key)
}

// ---------------------------------------------------------------------------
// All remaining Querier methods — panic if called without configuration.
// ---------------------------------------------------------------------------

func (m *PartialMockQuerier) ActivateWorkerStatus(ctx context.Context, id pgtype.UUID) (db.Worker, error) {
	panic("PartialMockQuerier: ActivateWorkerStatus not configured")
}
func (m *PartialMockQuerier) AdminUpdateCompanyProfile(ctx context.Context, arg db.AdminUpdateCompanyProfileParams) (db.Company, error) {
	panic("PartialMockQuerier: AdminUpdateCompanyProfile not configured")
}
func (m *PartialMockQuerier) AdminUpdateUserProfile(ctx context.Context, arg db.AdminUpdateUserProfileParams) (db.User, error) {
	panic("PartialMockQuerier: AdminUpdateUserProfile not configured")
}
func (m *PartialMockQuerier) ApplyReferralDiscountToBooking(ctx context.Context, arg db.ApplyReferralDiscountToBookingParams) (db.Booking, error) {
	panic("PartialMockQuerier: ApplyReferralDiscountToBooking not configured")
}
func (m *PartialMockQuerier) ApproveCompany(ctx context.Context, id pgtype.UUID) (db.Company, error) {
	panic("PartialMockQuerier: ApproveCompany not configured")
}
func (m *PartialMockQuerier) CancelFutureBookingsByCompany(ctx context.Context, arg db.CancelFutureBookingsByCompanyParams) ([]db.Booking, error) {
	panic("PartialMockQuerier: CancelFutureBookingsByCompany not configured")
}
func (m *PartialMockQuerier) CancelFutureOccurrences(ctx context.Context, arg db.CancelFutureOccurrencesParams) error {
	panic("PartialMockQuerier: CancelFutureOccurrences not configured")
}
func (m *PartialMockQuerier) CancelFutureSubscriptionBookings(ctx context.Context, arg db.CancelFutureSubscriptionBookingsParams) error {
	panic("PartialMockQuerier: CancelFutureSubscriptionBookings not configured")
}
func (m *PartialMockQuerier) CancelRecurringGroup(ctx context.Context, arg db.CancelRecurringGroupParams) (db.RecurringBookingGroup, error) {
	panic("PartialMockQuerier: CancelRecurringGroup not configured")
}
func (m *PartialMockQuerier) CancelSubscription(ctx context.Context, arg db.CancelSubscriptionParams) (db.Subscription, error) {
	panic("PartialMockQuerier: CancelSubscription not configured")
}
func (m *PartialMockQuerier) CancelSubscriptionsByCompany(ctx context.Context, arg db.CancelSubscriptionsByCompanyParams) error {
	panic("PartialMockQuerier: CancelSubscriptionsByCompany not configured")
}
func (m *PartialMockQuerier) CheckCompanyDocumentsReady(ctx context.Context, companyID pgtype.UUID) (pgtype.Bool, error) {
	panic("PartialMockQuerier: CheckCompanyDocumentsReady not configured")
}
func (m *PartialMockQuerier) CheckTransactionInPayout(ctx context.Context, paymentTransactionID pgtype.UUID) (bool, error) {
	panic("PartialMockQuerier: CheckTransactionInPayout not configured")
}
func (m *PartialMockQuerier) ClaimCompanyByToken(ctx context.Context, arg db.ClaimCompanyByTokenParams) (db.Company, error) {
	panic("PartialMockQuerier: ClaimCompanyByToken not configured")
}
func (m *PartialMockQuerier) ClearBookingReferralDiscount(ctx context.Context, id pgtype.UUID) error {
	panic("PartialMockQuerier: ClearBookingReferralDiscount not configured")
}
func (m *PartialMockQuerier) ClearCompanyCommissionOverride(ctx context.Context, id pgtype.UUID) (db.Company, error) {
	panic("PartialMockQuerier: ClearCompanyCommissionOverride not configured")
}
func (m *PartialMockQuerier) CompanyHasCategory(ctx context.Context, arg db.CompanyHasCategoryParams) (bool, error) {
	panic("PartialMockQuerier: CompanyHasCategory not configured")
}
func (m *PartialMockQuerier) CompleteBooking(ctx context.Context, id pgtype.UUID) (db.Booking, error) {
	panic("PartialMockQuerier: CompleteBooking not configured")
}
func (m *PartialMockQuerier) ConfirmReferralDiscountUsed(ctx context.Context, id pgtype.UUID) (db.ReferralEarnedDiscount, error) {
	panic("PartialMockQuerier: ConfirmReferralDiscountUsed not configured")
}
func (m *PartialMockQuerier) CountActiveEmailOTPs(ctx context.Context, email string) (int64, error) {
	panic("PartialMockQuerier: CountActiveEmailOTPs not configured")
}
func (m *PartialMockQuerier) CountActivePhoneOTPs(ctx context.Context, userID pgtype.UUID) (int64, error) {
	panic("PartialMockQuerier: CountActivePhoneOTPs not configured")
}
func (m *PartialMockQuerier) CountActiveRecurringGroups(ctx context.Context) (int64, error) {
	panic("PartialMockQuerier: CountActiveRecurringGroups not configured")
}
func (m *PartialMockQuerier) CountAllBookings(ctx context.Context) (int64, error) {
	panic("PartialMockQuerier: CountAllBookings not configured")
}
func (m *PartialMockQuerier) CountAllReviews(ctx context.Context) (int64, error) {
	panic("PartialMockQuerier: CountAllReviews not configured")
}
func (m *PartialMockQuerier) CountAllReviewsFiltered(ctx context.Context, arg db.CountAllReviewsFilteredParams) (int64, error) {
	panic("PartialMockQuerier: CountAllReviewsFiltered not configured")
}
func (m *PartialMockQuerier) CountAllSubscriptions(ctx context.Context) (int64, error) {
	panic("PartialMockQuerier: CountAllSubscriptions not configured")
}
func (m *PartialMockQuerier) CountAvailableReferralDiscounts(ctx context.Context, ownerUserID pgtype.UUID) (int64, error) {
	panic("PartialMockQuerier: CountAvailableReferralDiscounts not configured")
}
func (m *PartialMockQuerier) CountBookingsByClient(ctx context.Context, clientUserID pgtype.UUID) (int64, error) {
	panic("PartialMockQuerier: CountBookingsByClient not configured")
}
func (m *PartialMockQuerier) CountBookingsByClientAndStatus(ctx context.Context, arg db.CountBookingsByClientAndStatusParams) (int64, error) {
	panic("PartialMockQuerier: CountBookingsByClientAndStatus not configured")
}
func (m *PartialMockQuerier) CountBookingsByCompany(ctx context.Context, companyID pgtype.UUID) (int64, error) {
	panic("PartialMockQuerier: CountBookingsByCompany not configured")
}
func (m *PartialMockQuerier) CountBookingsByCompanyAndStatus(ctx context.Context, arg db.CountBookingsByCompanyAndStatusParams) (int64, error) {
	panic("PartialMockQuerier: CountBookingsByCompanyAndStatus not configured")
}
func (m *PartialMockQuerier) CountBookingsByStatus(ctx context.Context, status db.BookingStatus) (int64, error) {
	panic("PartialMockQuerier: CountBookingsByStatus not configured")
}
func (m *PartialMockQuerier) CountBookingsBySubscription(ctx context.Context, subscriptionID pgtype.UUID) (int64, error) {
	panic("PartialMockQuerier: CountBookingsBySubscription not configured")
}
func (m *PartialMockQuerier) CountCompaniesByStatus(ctx context.Context, status db.CompanyStatus) (int64, error) {
	panic("PartialMockQuerier: CountCompaniesByStatus not configured")
}
func (m *PartialMockQuerier) CountCompletedBookingsBySubscription(ctx context.Context, subscriptionID pgtype.UUID) (int64, error) {
	panic("PartialMockQuerier: CountCompletedBookingsBySubscription not configured")
}
func (m *PartialMockQuerier) CountCompletedJobsByCompany(ctx context.Context, companyID pgtype.UUID) (int64, error) {
	panic("PartialMockQuerier: CountCompletedJobsByCompany not configured")
}
func (m *PartialMockQuerier) CountCompletedJobsByWorker(ctx context.Context, workerID pgtype.UUID) (int64, error) {
	panic("PartialMockQuerier: CountCompletedJobsByWorker not configured")
}
func (m *PartialMockQuerier) CountCompletedSignupsInCycle(ctx context.Context, arg db.CountCompletedSignupsInCycleParams) (int64, error) {
	panic("PartialMockQuerier: CountCompletedSignupsInCycle not configured")
}
func (m *PartialMockQuerier) CountInvoicesByClient(ctx context.Context, clientUserID pgtype.UUID) (int64, error) {
	panic("PartialMockQuerier: CountInvoicesByClient not configured")
}
func (m *PartialMockQuerier) CountInvoicesByCompany(ctx context.Context, companyID pgtype.UUID) (int64, error) {
	panic("PartialMockQuerier: CountInvoicesByCompany not configured")
}
func (m *PartialMockQuerier) CountPaymentHistoryByUser(ctx context.Context, clientUserID pgtype.UUID) (int64, error) {
	panic("PartialMockQuerier: CountPaymentHistoryByUser not configured")
}
func (m *PartialMockQuerier) CountPriceAuditLog(ctx context.Context, entityType pgtype.Text) (int64, error) {
	panic("PartialMockQuerier: CountPriceAuditLog not configured")
}
func (m *PartialMockQuerier) CountReceivedInvoicesByCompany(ctx context.Context, companyID pgtype.UUID) (int64, error) {
	panic("PartialMockQuerier: CountReceivedInvoicesByCompany not configured")
}
func (m *PartialMockQuerier) CountReviewsByCompanyWorkers(ctx context.Context, arg db.CountReviewsByCompanyWorkersParams) (int64, error) {
	panic("PartialMockQuerier: CountReviewsByCompanyWorkers not configured")
}
func (m *PartialMockQuerier) CountReviewsByWorkerID(ctx context.Context, reviewedWorkerID pgtype.UUID) (int64, error) {
	panic("PartialMockQuerier: CountReviewsByWorkerID not configured")
}
func (m *PartialMockQuerier) CountSearchBookings(ctx context.Context, arg db.CountSearchBookingsParams) (int64, error) {
	panic("PartialMockQuerier: CountSearchBookings not configured")
}
func (m *PartialMockQuerier) CountSearchBookingsWithDetails(ctx context.Context, arg db.CountSearchBookingsWithDetailsParams) (int64, error) {
	panic("PartialMockQuerier: CountSearchBookingsWithDetails not configured")
}
func (m *PartialMockQuerier) CountSearchCompanies(ctx context.Context, arg db.CountSearchCompaniesParams) (int64, error) {
	panic("PartialMockQuerier: CountSearchCompanies not configured")
}
func (m *PartialMockQuerier) CountSearchCompanyBookings(ctx context.Context, arg db.CountSearchCompanyBookingsParams) (int64, error) {
	panic("PartialMockQuerier: CountSearchCompanyBookings not configured")
}
func (m *PartialMockQuerier) CountSearchUsers(ctx context.Context, arg db.CountSearchUsersParams) (int64, error) {
	panic("PartialMockQuerier: CountSearchUsers not configured")
}
func (m *PartialMockQuerier) CountSearchWorkerBookings(ctx context.Context, arg db.CountSearchWorkerBookingsParams) (int64, error) {
	panic("PartialMockQuerier: CountSearchWorkerBookings not configured")
}
func (m *PartialMockQuerier) CountSignupsInCycle(ctx context.Context, arg db.CountSignupsInCycleParams) (int64, error) {
	panic("PartialMockQuerier: CountSignupsInCycle not configured")
}
func (m *PartialMockQuerier) CountSubscriptionsByCompany(ctx context.Context, companyID pgtype.UUID) (int64, error) {
	panic("PartialMockQuerier: CountSubscriptionsByCompany not configured")
}
func (m *PartialMockQuerier) CountSubscriptionsByStatusFilter(ctx context.Context, status db.SubscriptionStatus) (int64, error) {
	panic("PartialMockQuerier: CountSubscriptionsByStatusFilter not configured")
}
func (m *PartialMockQuerier) CountThisMonthJobsByWorker(ctx context.Context, workerID pgtype.UUID) (int64, error) {
	panic("PartialMockQuerier: CountThisMonthJobsByWorker not configured")
}
func (m *PartialMockQuerier) CountUnreadNotifications(ctx context.Context, userID pgtype.UUID) (int64, error) {
	panic("PartialMockQuerier: CountUnreadNotifications not configured")
}
func (m *PartialMockQuerier) CountUsersByRole(ctx context.Context, role db.UserRole) (int64, error) {
	panic("PartialMockQuerier: CountUsersByRole not configured")
}
func (m *PartialMockQuerier) CountWaitlistLeads(ctx context.Context) (db.CountWaitlistLeadsRow, error) {
	panic("PartialMockQuerier: CountWaitlistLeads not configured")
}
func (m *PartialMockQuerier) CountWorkerBookingsInDateRange(ctx context.Context, arg db.CountWorkerBookingsInDateRangeParams) (int64, error) {
	panic("PartialMockQuerier: CountWorkerBookingsInDateRange not configured")
}
func (m *PartialMockQuerier) CreateAddress(ctx context.Context, arg db.CreateAddressParams) (db.ClientAddress, error) {
	panic("PartialMockQuerier: CreateAddress not configured")
}
func (m *PartialMockQuerier) CreateArea(ctx context.Context, arg db.CreateAreaParams) (db.CreateAreaRow, error) {
	panic("PartialMockQuerier: CreateArea not configured")
}
func (m *PartialMockQuerier) CreateBillingProfile(ctx context.Context, arg db.CreateBillingProfileParams) (db.ClientBillingProfile, error) {
	panic("PartialMockQuerier: CreateBillingProfile not configured")
}
func (m *PartialMockQuerier) CreateBookingTimeSlot(ctx context.Context, arg db.CreateBookingTimeSlotParams) (db.BookingTimeSlot, error) {
	panic("PartialMockQuerier: CreateBookingTimeSlot not configured")
}
func (m *PartialMockQuerier) CreateCity(ctx context.Context, arg db.CreateCityParams) (db.CreateCityRow, error) {
	panic("PartialMockQuerier: CreateCity not configured")
}
func (m *PartialMockQuerier) CreateCompany(ctx context.Context, arg db.CreateCompanyParams) (db.Company, error) {
	panic("PartialMockQuerier: CreateCompany not configured")
}
func (m *PartialMockQuerier) CreateCompanyDocument(ctx context.Context, arg db.CreateCompanyDocumentParams) (db.CompanyDocument, error) {
	panic("PartialMockQuerier: CreateCompanyDocument not configured")
}
func (m *PartialMockQuerier) CreateCompanyPayout(ctx context.Context, arg db.CreateCompanyPayoutParams) (db.CompanyPayout, error) {
	panic("PartialMockQuerier: CreateCompanyPayout not configured")
}
func (m *PartialMockQuerier) CreateEmailOTP(ctx context.Context, arg db.CreateEmailOTPParams) (db.EmailOtpCode, error) {
	panic("PartialMockQuerier: CreateEmailOTP not configured")
}
func (m *PartialMockQuerier) CreateInvoice(ctx context.Context, arg db.CreateInvoiceParams) (db.Invoice, error) {
	panic("PartialMockQuerier: CreateInvoice not configured")
}
func (m *PartialMockQuerier) CreateInvoiceLineItem(ctx context.Context, arg db.CreateInvoiceLineItemParams) (db.InvoiceLineItem, error) {
	panic("PartialMockQuerier: CreateInvoiceLineItem not configured")
}
func (m *PartialMockQuerier) CreateInvoiceSequence(ctx context.Context, arg db.CreateInvoiceSequenceParams) error {
	panic("PartialMockQuerier: CreateInvoiceSequence not configured")
}
func (m *PartialMockQuerier) CreateJobPhoto(ctx context.Context, arg db.CreateJobPhotoParams) (db.BookingJobPhoto, error) {
	panic("PartialMockQuerier: CreateJobPhoto not configured")
}
func (m *PartialMockQuerier) CreatePaymentMethod(ctx context.Context, arg db.CreatePaymentMethodParams) (db.ClientPaymentMethod, error) {
	panic("PartialMockQuerier: CreatePaymentMethod not configured")
}
func (m *PartialMockQuerier) CreatePaymentTransaction(ctx context.Context, arg db.CreatePaymentTransactionParams) (db.PaymentTransaction, error) {
	panic("PartialMockQuerier: CreatePaymentTransaction not configured")
}
func (m *PartialMockQuerier) CreatePayoutLineItem(ctx context.Context, arg db.CreatePayoutLineItemParams) (db.PayoutLineItem, error) {
	panic("PartialMockQuerier: CreatePayoutLineItem not configured")
}
func (m *PartialMockQuerier) CreatePersonalityAnswer(ctx context.Context, arg db.CreatePersonalityAnswerParams) error {
	panic("PartialMockQuerier: CreatePersonalityAnswer not configured")
}
func (m *PartialMockQuerier) CreatePersonalityAssessment(ctx context.Context, arg db.CreatePersonalityAssessmentParams) (db.PersonalityAssessment, error) {
	panic("PartialMockQuerier: CreatePersonalityAssessment not configured")
}
func (m *PartialMockQuerier) CreatePersonalityInsight(ctx context.Context, arg db.CreatePersonalityInsightParams) (db.PersonalityInsight, error) {
	panic("PartialMockQuerier: CreatePersonalityInsight not configured")
}
func (m *PartialMockQuerier) CreatePhoneOTP(ctx context.Context, arg db.CreatePhoneOTPParams) (db.PhoneOtpCode, error) {
	panic("PartialMockQuerier: CreatePhoneOTP not configured")
}
func (m *PartialMockQuerier) CreatePlatformEvent(ctx context.Context, arg db.CreatePlatformEventParams) error {
	panic("PartialMockQuerier: CreatePlatformEvent not configured")
}
func (m *PartialMockQuerier) CreatePriceAuditEntry(ctx context.Context, arg db.CreatePriceAuditEntryParams) (db.PriceAuditLog, error) {
	panic("PartialMockQuerier: CreatePriceAuditEntry not configured")
}
func (m *PartialMockQuerier) CreateRecurringGroup(ctx context.Context, arg db.CreateRecurringGroupParams) (db.RecurringBookingGroup, error) {
	panic("PartialMockQuerier: CreateRecurringGroup not configured")
}
func (m *PartialMockQuerier) CreateReferralCode(ctx context.Context, arg db.CreateReferralCodeParams) (db.ReferralCode, error) {
	panic("PartialMockQuerier: CreateReferralCode not configured")
}
func (m *PartialMockQuerier) CreateReferralEarnedDiscount(ctx context.Context, arg db.CreateReferralEarnedDiscountParams) (db.ReferralEarnedDiscount, error) {
	panic("PartialMockQuerier: CreateReferralEarnedDiscount not configured")
}
func (m *PartialMockQuerier) CreateReferralSignup(ctx context.Context, arg db.CreateReferralSignupParams) (db.ReferralSignup, error) {
	panic("PartialMockQuerier: CreateReferralSignup not configured")
}
func (m *PartialMockQuerier) CreateRefundRequest(ctx context.Context, arg db.CreateRefundRequestParams) (db.RefundRequest, error) {
	panic("PartialMockQuerier: CreateRefundRequest not configured")
}
func (m *PartialMockQuerier) CreateReview(ctx context.Context, arg db.CreateReviewParams) (db.Review, error) {
	panic("PartialMockQuerier: CreateReview not configured")
}
func (m *PartialMockQuerier) CreateReviewPhoto(ctx context.Context, arg db.CreateReviewPhotoParams) (db.ReviewPhoto, error) {
	panic("PartialMockQuerier: CreateReviewPhoto not configured")
}
func (m *PartialMockQuerier) CreateServiceCategory(ctx context.Context, arg db.CreateServiceCategoryParams) (db.ServiceCategory, error) {
	panic("PartialMockQuerier: CreateServiceCategory not configured")
}
func (m *PartialMockQuerier) CreateServiceDefinition(ctx context.Context, arg db.CreateServiceDefinitionParams) (db.ServiceDefinition, error) {
	panic("PartialMockQuerier: CreateServiceDefinition not configured")
}
func (m *PartialMockQuerier) CreateServiceExtra(ctx context.Context, arg db.CreateServiceExtraParams) (db.ServiceExtra, error) {
	panic("PartialMockQuerier: CreateServiceExtra not configured")
}
func (m *PartialMockQuerier) CreateSubscription(ctx context.Context, arg db.CreateSubscriptionParams) (db.Subscription, error) {
	panic("PartialMockQuerier: CreateSubscription not configured")
}
func (m *PartialMockQuerier) CreateUser(ctx context.Context, arg db.CreateUserParams) (db.User, error) {
	panic("PartialMockQuerier: CreateUser not configured")
}
func (m *PartialMockQuerier) CreateWaitlistLead(ctx context.Context, arg db.CreateWaitlistLeadParams) (db.WaitlistLead, error) {
	panic("PartialMockQuerier: CreateWaitlistLead not configured")
}
func (m *PartialMockQuerier) CreateWorkerDocument(ctx context.Context, arg db.CreateWorkerDocumentParams) (db.WorkerDocument, error) {
	panic("PartialMockQuerier: CreateWorkerDocument not configured")
}
func (m *PartialMockQuerier) CreateWorkerProfile(ctx context.Context, arg db.CreateWorkerProfileParams) (db.Worker, error) {
	panic("PartialMockQuerier: CreateWorkerProfile not configured")
}
func (m *PartialMockQuerier) CreateWorkerUser(ctx context.Context, arg db.CreateWorkerUserParams) (db.User, error) {
	panic("PartialMockQuerier: CreateWorkerUser not configured")
}
func (m *PartialMockQuerier) DeactivateUser(ctx context.Context, id pgtype.UUID) error {
	panic("PartialMockQuerier: DeactivateUser not configured")
}
func (m *PartialMockQuerier) DeleteAddress(ctx context.Context, id pgtype.UUID) error {
	panic("PartialMockQuerier: DeleteAddress not configured")
}
func (m *PartialMockQuerier) DeleteAllCompanyServiceAreas(ctx context.Context, companyID pgtype.UUID) error {
	panic("PartialMockQuerier: DeleteAllCompanyServiceAreas not configured")
}
func (m *PartialMockQuerier) DeleteAllCompanyServiceCategories(ctx context.Context, companyID pgtype.UUID) error {
	panic("PartialMockQuerier: DeleteAllCompanyServiceCategories not configured")
}
func (m *PartialMockQuerier) DeleteAllWorkerServiceAreas(ctx context.Context, workerID pgtype.UUID) error {
	panic("PartialMockQuerier: DeleteAllWorkerServiceAreas not configured")
}
func (m *PartialMockQuerier) DeleteAllWorkerServiceCategories(ctx context.Context, workerID pgtype.UUID) error {
	panic("PartialMockQuerier: DeleteAllWorkerServiceCategories not configured")
}
func (m *PartialMockQuerier) DeleteArea(ctx context.Context, id pgtype.UUID) error {
	panic("PartialMockQuerier: DeleteArea not configured")
}
func (m *PartialMockQuerier) DeleteBillingProfile(ctx context.Context, id pgtype.UUID) error {
	panic("PartialMockQuerier: DeleteBillingProfile not configured")
}
func (m *PartialMockQuerier) DeleteBookingTimeSlots(ctx context.Context, bookingID pgtype.UUID) error {
	panic("PartialMockQuerier: DeleteBookingTimeSlots not configured")
}
func (m *PartialMockQuerier) DeleteCompanyDocument(ctx context.Context, id pgtype.UUID) error {
	panic("PartialMockQuerier: DeleteCompanyDocument not configured")
}
func (m *PartialMockQuerier) DeleteCompanyWorkSchedule(ctx context.Context, companyID pgtype.UUID) error {
	panic("PartialMockQuerier: DeleteCompanyWorkSchedule not configured")
}
func (m *PartialMockQuerier) DeleteExpiredEmailOTPs(ctx context.Context) error {
	panic("PartialMockQuerier: DeleteExpiredEmailOTPs not configured")
}
func (m *PartialMockQuerier) DeleteExpiredPhoneOTPs(ctx context.Context) error {
	panic("PartialMockQuerier: DeleteExpiredPhoneOTPs not configured")
}
func (m *PartialMockQuerier) DeleteJobPhoto(ctx context.Context, id pgtype.UUID) error {
	panic("PartialMockQuerier: DeleteJobPhoto not configured")
}
func (m *PartialMockQuerier) DeletePaymentMethod(ctx context.Context, id pgtype.UUID) error {
	panic("PartialMockQuerier: DeletePaymentMethod not configured")
}
func (m *PartialMockQuerier) DeletePersonalityInsight(ctx context.Context, assessmentID pgtype.UUID) error {
	panic("PartialMockQuerier: DeletePersonalityInsight not configured")
}
func (m *PartialMockQuerier) DeleteReviewPhoto(ctx context.Context, id pgtype.UUID) error {
	panic("PartialMockQuerier: DeleteReviewPhoto not configured")
}
func (m *PartialMockQuerier) DeleteUser(ctx context.Context, id pgtype.UUID) error {
	panic("PartialMockQuerier: DeleteUser not configured")
}
func (m *PartialMockQuerier) DeleteWorkerAvailability(ctx context.Context, workerID pgtype.UUID) error {
	panic("PartialMockQuerier: DeleteWorkerAvailability not configured")
}
func (m *PartialMockQuerier) DeleteWorkerDateOverride(ctx context.Context, arg db.DeleteWorkerDateOverrideParams) error {
	panic("PartialMockQuerier: DeleteWorkerDateOverride not configured")
}
func (m *PartialMockQuerier) DeleteWorkerDocument(ctx context.Context, id pgtype.UUID) error {
	panic("PartialMockQuerier: DeleteWorkerDocument not configured")
}
func (m *PartialMockQuerier) DeselectAllBookingTimeSlots(ctx context.Context, bookingID pgtype.UUID) error {
	panic("PartialMockQuerier: DeselectAllBookingTimeSlots not configured")
}
func (m *PartialMockQuerier) FindAvailableWorkersByCategory(ctx context.Context, arg db.FindAvailableWorkersByCategoryParams) ([]db.FindAvailableWorkersByCategoryRow, error) {
	panic("PartialMockQuerier: FindAvailableWorkersByCategory not configured")
}
func (m *PartialMockQuerier) FindAvailableWorkersForDateAndArea(ctx context.Context, arg db.FindAvailableWorkersForDateAndAreaParams) ([]db.FindAvailableWorkersForDateAndAreaRow, error) {
	panic("PartialMockQuerier: FindAvailableWorkersForDateAndArea not configured")
}
func (m *PartialMockQuerier) FindMatchingWorkers(ctx context.Context, cityAreaID pgtype.UUID) ([]db.FindMatchingWorkersRow, error) {
	panic("PartialMockQuerier: FindMatchingWorkers not configured")
}
func (m *PartialMockQuerier) FindMatchingWorkersByCategory(ctx context.Context, arg db.FindMatchingWorkersByCategoryParams) ([]db.FindMatchingWorkersByCategoryRow, error) {
	panic("PartialMockQuerier: FindMatchingWorkersByCategory not configured")
}
func (m *PartialMockQuerier) GetAddressByID(ctx context.Context, id pgtype.UUID) (db.ClientAddress, error) {
	panic("PartialMockQuerier: GetAddressByID not configured")
}
func (m *PartialMockQuerier) GetAllCompanyScorecards(ctx context.Context, arg db.GetAllCompanyScorecardsParams) ([]db.GetAllCompanyScorecardsRow, error) {
	panic("PartialMockQuerier: GetAllCompanyScorecards not configured")
}
func (m *PartialMockQuerier) GetAreaByID(ctx context.Context, id pgtype.UUID) (db.GetAreaByIDRow, error) {
	panic("PartialMockQuerier: GetAreaByID not configured")
}
func (m *PartialMockQuerier) GetAvailableReferralDiscount(ctx context.Context, ownerUserID pgtype.UUID) (db.ReferralEarnedDiscount, error) {
	panic("PartialMockQuerier: GetAvailableReferralDiscount not configured")
}
func (m *PartialMockQuerier) GetAverageWorkerRating(ctx context.Context, reviewedWorkerID pgtype.UUID) (pgtype.Numeric, error) {
	panic("PartialMockQuerier: GetAverageWorkerRating not configured")
}
func (m *PartialMockQuerier) GetBillingProfileByUser(ctx context.Context, userID pgtype.UUID) (db.ClientBillingProfile, error) {
	panic("PartialMockQuerier: GetBillingProfileByUser not configured")
}
func (m *PartialMockQuerier) GetBookingCountByStatus(ctx context.Context) ([]db.GetBookingCountByStatusRow, error) {
	panic("PartialMockQuerier: GetBookingCountByStatus not configured")
}
func (m *PartialMockQuerier) GetBookingDemandHeatmap(ctx context.Context, arg db.GetBookingDemandHeatmapParams) ([]db.GetBookingDemandHeatmapRow, error) {
	panic("PartialMockQuerier: GetBookingDemandHeatmap not configured")
}
func (m *PartialMockQuerier) GetBookingsByRecurringGroup(ctx context.Context, recurringGroupID pgtype.UUID) ([]db.Booking, error) {
	panic("PartialMockQuerier: GetBookingsByRecurringGroup not configured")
}
func (m *PartialMockQuerier) GetBookingsBySubscription(ctx context.Context, subscriptionID pgtype.UUID) ([]db.Booking, error) {
	panic("PartialMockQuerier: GetBookingsBySubscription not configured")
}
func (m *PartialMockQuerier) GetCityAreaCoordinates(ctx context.Context, id pgtype.UUID) (db.GetCityAreaCoordinatesRow, error) {
	panic("PartialMockQuerier: GetCityAreaCoordinates not configured")
}
func (m *PartialMockQuerier) GetCityByID(ctx context.Context, id pgtype.UUID) (db.GetCityByIDRow, error) {
	panic("PartialMockQuerier: GetCityByID not configured")
}
func (m *PartialMockQuerier) GetCityByName(ctx context.Context, lower string) (db.GetCityByNameRow, error) {
	panic("PartialMockQuerier: GetCityByName not configured")
}
func (m *PartialMockQuerier) GetClientWorkerHistory(ctx context.Context, arg db.GetClientWorkerHistoryParams) (db.GetClientWorkerHistoryRow, error) {
	panic("PartialMockQuerier: GetClientWorkerHistory not configured")
}
func (m *PartialMockQuerier) GetCommissionInvoiceByPeriod(ctx context.Context, arg db.GetCommissionInvoiceByPeriodParams) (db.Invoice, error) {
	panic("PartialMockQuerier: GetCommissionInvoiceByPeriod not configured")
}
func (m *PartialMockQuerier) GetCompanyAverageRating(ctx context.Context, companyID pgtype.UUID) (pgtype.Numeric, error) {
	panic("PartialMockQuerier: GetCompanyAverageRating not configured")
}
func (m *PartialMockQuerier) GetCompanyAvgRating(ctx context.Context, companyID pgtype.UUID) (db.GetCompanyAvgRatingRow, error) {
	panic("PartialMockQuerier: GetCompanyAvgRating not configured")
}
func (m *PartialMockQuerier) GetCompanyByCUI(ctx context.Context, cui string) (db.Company, error) {
	panic("PartialMockQuerier: GetCompanyByCUI not configured")
}
func (m *PartialMockQuerier) GetCompanyByClaimToken(ctx context.Context, claimToken pgtype.Text) (db.Company, error) {
	panic("PartialMockQuerier: GetCompanyByClaimToken not configured")
}
func (m *PartialMockQuerier) GetCompanyDocument(ctx context.Context, id pgtype.UUID) (db.CompanyDocument, error) {
	panic("PartialMockQuerier: GetCompanyDocument not configured")
}
func (m *PartialMockQuerier) GetCompanyFinancialSummary(ctx context.Context, companyID pgtype.UUID) (db.GetCompanyFinancialSummaryRow, error) {
	panic("PartialMockQuerier: GetCompanyFinancialSummary not configured")
}
func (m *PartialMockQuerier) GetCompanyPerformance(ctx context.Context, arg db.GetCompanyPerformanceParams) ([]db.GetCompanyPerformanceRow, error) {
	panic("PartialMockQuerier: GetCompanyPerformance not configured")
}
func (m *PartialMockQuerier) GetCompanyRevenueByDateRange(ctx context.Context, arg db.GetCompanyRevenueByDateRangeParams) ([]db.GetCompanyRevenueByDateRangeRow, error) {
	panic("PartialMockQuerier: GetCompanyRevenueByDateRange not configured")
}
func (m *PartialMockQuerier) GetCompanyStripeConnect(ctx context.Context, id pgtype.UUID) (db.GetCompanyStripeConnectRow, error) {
	panic("PartialMockQuerier: GetCompanyStripeConnect not configured")
}
func (m *PartialMockQuerier) GetExtraByID(ctx context.Context, id pgtype.UUID) (db.ServiceExtra, error) {
	panic("PartialMockQuerier: GetExtraByID not configured")
}
func (m *PartialMockQuerier) GetInvoiceAnalytics(ctx context.Context, arg db.GetInvoiceAnalyticsParams) (db.GetInvoiceAnalyticsRow, error) {
	panic("PartialMockQuerier: GetInvoiceAnalytics not configured")
}
func (m *PartialMockQuerier) GetInvoiceByBookingAndType(ctx context.Context, arg db.GetInvoiceByBookingAndTypeParams) (db.Invoice, error) {
	panic("PartialMockQuerier: GetInvoiceByBookingAndType not configured")
}
func (m *PartialMockQuerier) GetInvoiceByID(ctx context.Context, id pgtype.UUID) (db.Invoice, error) {
	panic("PartialMockQuerier: GetInvoiceByID not configured")
}
func (m *PartialMockQuerier) GetInvoiceCountByStatus(ctx context.Context, arg db.GetInvoiceCountByStatusParams) ([]db.GetInvoiceCountByStatusRow, error) {
	panic("PartialMockQuerier: GetInvoiceCountByStatus not configured")
}
func (m *PartialMockQuerier) GetInvoiceCountByType(ctx context.Context, arg db.GetInvoiceCountByTypeParams) ([]db.GetInvoiceCountByTypeRow, error) {
	panic("PartialMockQuerier: GetInvoiceCountByType not configured")
}
func (m *PartialMockQuerier) GetJobPhoto(ctx context.Context, id pgtype.UUID) (db.BookingJobPhoto, error) {
	panic("PartialMockQuerier: GetJobPhoto not configured")
}
func (m *PartialMockQuerier) GetNextInvoiceNumber(ctx context.Context, arg db.GetNextInvoiceNumberParams) (int32, error) {
	panic("PartialMockQuerier: GetNextInvoiceNumber not configured")
}
func (m *PartialMockQuerier) GetPaymentMethodByID(ctx context.Context, id pgtype.UUID) (db.ClientPaymentMethod, error) {
	panic("PartialMockQuerier: GetPaymentMethodByID not configured")
}
func (m *PartialMockQuerier) GetPaymentMethodByStripeID(ctx context.Context, stripePaymentMethodID pgtype.Text) (db.ClientPaymentMethod, error) {
	panic("PartialMockQuerier: GetPaymentMethodByStripeID not configured")
}
func (m *PartialMockQuerier) GetPaymentTransactionByBookingID(ctx context.Context, bookingID pgtype.UUID) (db.PaymentTransaction, error) {
	panic("PartialMockQuerier: GetPaymentTransactionByBookingID not configured")
}
func (m *PartialMockQuerier) GetPaymentTransactionByStripePI(ctx context.Context, stripePaymentIntentID string) (db.PaymentTransaction, error) {
	panic("PartialMockQuerier: GetPaymentTransactionByStripePI not configured")
}
func (m *PartialMockQuerier) GetPayoutByID(ctx context.Context, id pgtype.UUID) (db.CompanyPayout, error) {
	panic("PartialMockQuerier: GetPayoutByID not configured")
}
func (m *PartialMockQuerier) GetPersonalityAnswersByAssessmentID(ctx context.Context, assessmentID pgtype.UUID) ([]db.PersonalityAssessmentAnswer, error) {
	panic("PartialMockQuerier: GetPersonalityAnswersByAssessmentID not configured")
}
func (m *PartialMockQuerier) GetPersonalityAssessmentByWorkerID(ctx context.Context, workerID pgtype.UUID) (db.PersonalityAssessment, error) {
	panic("PartialMockQuerier: GetPersonalityAssessmentByWorkerID not configured")
}
func (m *PartialMockQuerier) GetPersonalityInsightByAssessmentID(ctx context.Context, assessmentID pgtype.UUID) (db.PersonalityInsight, error) {
	panic("PartialMockQuerier: GetPersonalityInsightByAssessmentID not configured")
}
func (m *PartialMockQuerier) GetPlatformLegalEntity(ctx context.Context) (db.PlatformLegalEntity, error) {
	panic("PartialMockQuerier: GetPlatformLegalEntity not configured")
}
func (m *PartialMockQuerier) GetPlatformRevenueReport(ctx context.Context, arg db.GetPlatformRevenueReportParams) (db.GetPlatformRevenueReportRow, error) {
	panic("PartialMockQuerier: GetPlatformRevenueReport not configured")
}
func (m *PartialMockQuerier) GetPlatformStats(ctx context.Context) (db.GetPlatformStatsRow, error) {
	panic("PartialMockQuerier: GetPlatformStats not configured")
}
func (m *PartialMockQuerier) GetPlatformTotals(ctx context.Context) (db.GetPlatformTotalsRow, error) {
	panic("PartialMockQuerier: GetPlatformTotals not configured")
}
func (m *PartialMockQuerier) GetRecurringDiscountByType(ctx context.Context, recurrenceType db.RecurrenceType) (db.RecurringDiscount, error) {
	panic("PartialMockQuerier: GetRecurringDiscountByType not configured")
}
func (m *PartialMockQuerier) GetRecurringGroupByID(ctx context.Context, id pgtype.UUID) (db.RecurringBookingGroup, error) {
	panic("PartialMockQuerier: GetRecurringGroupByID not configured")
}
func (m *PartialMockQuerier) GetRecurringGroupExtras(ctx context.Context, groupID pgtype.UUID) ([]db.GetRecurringGroupExtrasRow, error) {
	panic("PartialMockQuerier: GetRecurringGroupExtras not configured")
}
func (m *PartialMockQuerier) GetReferralCodeByCode(ctx context.Context, code string) (db.ReferralCode, error) {
	panic("PartialMockQuerier: GetReferralCodeByCode not configured")
}
func (m *PartialMockQuerier) GetReferralCodeByID(ctx context.Context, id pgtype.UUID) (db.ReferralCode, error) {
	panic("PartialMockQuerier: GetReferralCodeByID not configured")
}
func (m *PartialMockQuerier) GetReferralCodeByOwner(ctx context.Context, ownerUserID pgtype.UUID) (db.ReferralCode, error) {
	panic("PartialMockQuerier: GetReferralCodeByOwner not configured")
}
func (m *PartialMockQuerier) GetReferralDiscountIDForBooking(ctx context.Context, id pgtype.UUID) (pgtype.UUID, error) {
	panic("PartialMockQuerier: GetReferralDiscountIDForBooking not configured")
}
func (m *PartialMockQuerier) GetReferralEarnedDiscountByID(ctx context.Context, id pgtype.UUID) (db.ReferralEarnedDiscount, error) {
	panic("PartialMockQuerier: GetReferralEarnedDiscountByID not configured")
}
func (m *PartialMockQuerier) GetReferralSignupByReferredUser(ctx context.Context, referredUserID pgtype.UUID) (db.ReferralSignup, error) {
	panic("PartialMockQuerier: GetReferralSignupByReferredUser not configured")
}
func (m *PartialMockQuerier) GetReferralSignupsForCode(ctx context.Context, referralCodeID pgtype.UUID) ([]db.ReferralSignup, error) {
	panic("PartialMockQuerier: GetReferralSignupsForCode not configured")
}
func (m *PartialMockQuerier) GetRefundRequestByBookingID(ctx context.Context, bookingID pgtype.UUID) (db.RefundRequest, error) {
	panic("PartialMockQuerier: GetRefundRequestByBookingID not configured")
}
func (m *PartialMockQuerier) GetRefundRequestByID(ctx context.Context, id pgtype.UUID) (db.RefundRequest, error) {
	panic("PartialMockQuerier: GetRefundRequestByID not configured")
}
func (m *PartialMockQuerier) GetRevenueByDateRange(ctx context.Context, arg db.GetRevenueByDateRangeParams) ([]db.GetRevenueByDateRangeRow, error) {
	panic("PartialMockQuerier: GetRevenueByDateRange not configured")
}
func (m *PartialMockQuerier) GetRevenueByMonth(ctx context.Context, limit int32) ([]db.GetRevenueByMonthRow, error) {
	panic("PartialMockQuerier: GetRevenueByMonth not configured")
}
func (m *PartialMockQuerier) GetRevenueByServiceType(ctx context.Context, arg db.GetRevenueByServiceTypeParams) ([]db.GetRevenueByServiceTypeRow, error) {
	panic("PartialMockQuerier: GetRevenueByServiceType not configured")
}
func (m *PartialMockQuerier) GetReviewByBookingID(ctx context.Context, bookingID pgtype.UUID) (db.Review, error) {
	if m.GetReviewByBookingIDFn == nil {
		panic("PartialMockQuerier: GetReviewByBookingID not configured")
	}
	return m.GetReviewByBookingIDFn(ctx, bookingID)
}
func (m *PartialMockQuerier) GetReviewByID(ctx context.Context, id pgtype.UUID) (db.Review, error) {
	panic("PartialMockQuerier: GetReviewByID not configured")
}
func (m *PartialMockQuerier) GetSelectedTimeSlot(ctx context.Context, bookingID pgtype.UUID) (db.BookingTimeSlot, error) {
	panic("PartialMockQuerier: GetSelectedTimeSlot not configured")
}
func (m *PartialMockQuerier) GetServiceByID(ctx context.Context, id pgtype.UUID) (db.ServiceDefinition, error) {
	panic("PartialMockQuerier: GetServiceByID not configured")
}
func (m *PartialMockQuerier) GetServiceByType(ctx context.Context, serviceType db.ServiceType) (db.ServiceDefinition, error) {
	if m.GetServiceByTypeFn == nil {
		panic(fmt.Sprintf("PartialMockQuerier: %s not configured", "GetServiceByType"))
	}
	return m.GetServiceByTypeFn(ctx, serviceType)
}
func (m *PartialMockQuerier) GetServiceCategoryByID(ctx context.Context, id pgtype.UUID) (db.ServiceCategory, error) {
	panic("PartialMockQuerier: GetServiceCategoryByID not configured")
}
func (m *PartialMockQuerier) GetServiceCategoryBySlug(ctx context.Context, slug string) (db.ServiceCategory, error) {
	panic("PartialMockQuerier: GetServiceCategoryBySlug not configured")
}
func (m *PartialMockQuerier) GetSubscriptionByID(ctx context.Context, id pgtype.UUID) (db.Subscription, error) {
	panic("PartialMockQuerier: GetSubscriptionByID not configured")
}
func (m *PartialMockQuerier) GetSubscriptionByStripeID(ctx context.Context, stripeSubscriptionID pgtype.Text) (db.Subscription, error) {
	panic("PartialMockQuerier: GetSubscriptionByStripeID not configured")
}
func (m *PartialMockQuerier) GetSubscriptionExtras(ctx context.Context, subscriptionID pgtype.UUID) ([]db.GetSubscriptionExtrasRow, error) {
	panic("PartialMockQuerier: GetSubscriptionExtras not configured")
}
func (m *PartialMockQuerier) GetSubscriptionStats(ctx context.Context) (db.GetSubscriptionStatsRow, error) {
	panic("PartialMockQuerier: GetSubscriptionStats not configured")
}
func (m *PartialMockQuerier) GetTopCompaniesByRevenue(ctx context.Context, arg db.GetTopCompaniesByRevenueParams) ([]db.GetTopCompaniesByRevenueRow, error) {
	panic("PartialMockQuerier: GetTopCompaniesByRevenue not configured")
}
func (m *PartialMockQuerier) GetTotalPayoutsInPeriod(ctx context.Context, arg db.GetTotalPayoutsInPeriodParams) (db.GetTotalPayoutsInPeriodRow, error) {
	panic("PartialMockQuerier: GetTotalPayoutsInPeriod not configured")
}
func (m *PartialMockQuerier) GetTotalRefundsInPeriod(ctx context.Context, arg db.GetTotalRefundsInPeriodParams) (int64, error) {
	panic("PartialMockQuerier: GetTotalRefundsInPeriod not configured")
}
func (m *PartialMockQuerier) GetUnclaimedCompanyByContactEmail(ctx context.Context, contactEmail string) (db.Company, error) {
	panic("PartialMockQuerier: GetUnclaimedCompanyByContactEmail not configured")
}
func (m *PartialMockQuerier) GetUpcomingBookingsByRecurringGroup(ctx context.Context, recurringGroupID pgtype.UUID) ([]db.Booking, error) {
	panic("PartialMockQuerier: GetUpcomingBookingsByRecurringGroup not configured")
}
func (m *PartialMockQuerier) GetUpcomingBookingsBySubscription(ctx context.Context, subscriptionID pgtype.UUID) ([]db.Booking, error) {
	panic("PartialMockQuerier: GetUpcomingBookingsBySubscription not configured")
}
func (m *PartialMockQuerier) GetUserByGoogleID(ctx context.Context, googleID pgtype.Text) (db.User, error) {
	panic("PartialMockQuerier: GetUserByGoogleID not configured")
}
func (m *PartialMockQuerier) GetUserStripeCustomerID(ctx context.Context, id pgtype.UUID) (pgtype.Text, error) {
	panic("PartialMockQuerier: GetUserStripeCustomerID not configured")
}
func (m *PartialMockQuerier) GetValidEmailOTP(ctx context.Context, arg db.GetValidEmailOTPParams) (db.EmailOtpCode, error) {
	panic("PartialMockQuerier: GetValidEmailOTP not configured")
}
func (m *PartialMockQuerier) GetValidPhoneOTP(ctx context.Context, arg db.GetValidPhoneOTPParams) (db.PhoneOtpCode, error) {
	panic("PartialMockQuerier: GetValidPhoneOTP not configured")
}
func (m *PartialMockQuerier) GetWorkerByInviteToken(ctx context.Context, inviteToken pgtype.Text) (db.Worker, error) {
	panic("PartialMockQuerier: GetWorkerByInviteToken not configured")
}
func (m *PartialMockQuerier) GetWorkerByUserID(ctx context.Context, userID pgtype.UUID) (db.Worker, error) {
	panic("PartialMockQuerier: GetWorkerByUserID not configured")
}
func (m *PartialMockQuerier) GetWorkerDailyJobLocations(ctx context.Context, arg db.GetWorkerDailyJobLocationsParams) ([]db.GetWorkerDailyJobLocationsRow, error) {
	panic("PartialMockQuerier: GetWorkerDailyJobLocations not configured")
}
func (m *PartialMockQuerier) GetWorkerDateOverride(ctx context.Context, arg db.GetWorkerDateOverrideParams) (db.WorkerDateOverride, error) {
	panic("PartialMockQuerier: GetWorkerDateOverride not configured")
}
func (m *PartialMockQuerier) GetWorkerDocument(ctx context.Context, id pgtype.UUID) (db.WorkerDocument, error) {
	panic("PartialMockQuerier: GetWorkerDocument not configured")
}
func (m *PartialMockQuerier) GetWorkerEarningsByDateRange(ctx context.Context, arg db.GetWorkerEarningsByDateRangeParams) ([]db.GetWorkerEarningsByDateRangeRow, error) {
	panic("PartialMockQuerier: GetWorkerEarningsByDateRange not configured")
}
func (m *PartialMockQuerier) GetWorkerPerformanceStats(ctx context.Context, id pgtype.UUID) (db.GetWorkerPerformanceStatsRow, error) {
	panic("PartialMockQuerier: GetWorkerPerformanceStats not configured")
}
func (m *PartialMockQuerier) GetWorkerSubRatings(ctx context.Context, reviewedWorkerID pgtype.UUID) (db.GetWorkerSubRatingsRow, error) {
	panic("PartialMockQuerier: GetWorkerSubRatings not configured")
}
func (m *PartialMockQuerier) HasPersonalityAssessment(ctx context.Context, workerID pgtype.UUID) (bool, error) {
	panic("PartialMockQuerier: HasPersonalityAssessment not configured")
}
func (m *PartialMockQuerier) IncrementReferralCycle(ctx context.Context, id pgtype.UUID) (db.ReferralCode, error) {
	panic("PartialMockQuerier: IncrementReferralCycle not configured")
}
func (m *PartialMockQuerier) InsertBookingExtra(ctx context.Context, arg db.InsertBookingExtraParams) error {
	panic("PartialMockQuerier: InsertBookingExtra not configured")
}
func (m *PartialMockQuerier) InsertCompanyServiceArea(ctx context.Context, arg db.InsertCompanyServiceAreaParams) (db.CompanyServiceArea, error) {
	panic("PartialMockQuerier: InsertCompanyServiceArea not configured")
}
func (m *PartialMockQuerier) InsertCompanyServiceCategory(ctx context.Context, arg db.InsertCompanyServiceCategoryParams) error {
	panic("PartialMockQuerier: InsertCompanyServiceCategory not configured")
}
func (m *PartialMockQuerier) InsertRecurringGroupExtra(ctx context.Context, arg db.InsertRecurringGroupExtraParams) error {
	panic("PartialMockQuerier: InsertRecurringGroupExtra not configured")
}
func (m *PartialMockQuerier) InsertSubscriptionExtra(ctx context.Context, arg db.InsertSubscriptionExtraParams) error {
	panic("PartialMockQuerier: InsertSubscriptionExtra not configured")
}
func (m *PartialMockQuerier) InsertWorkerServiceArea(ctx context.Context, arg db.InsertWorkerServiceAreaParams) (db.WorkerServiceArea, error) {
	panic("PartialMockQuerier: InsertWorkerServiceArea not configured")
}
func (m *PartialMockQuerier) InsertWorkerServiceCategory(ctx context.Context, arg db.InsertWorkerServiceCategoryParams) error {
	panic("PartialMockQuerier: InsertWorkerServiceCategory not configured")
}
func (m *PartialMockQuerier) LinkWorkerToUser(ctx context.Context, arg db.LinkWorkerToUserParams) (db.Worker, error) {
	panic("PartialMockQuerier: LinkWorkerToUser not configured")
}
func (m *PartialMockQuerier) ListActiveCities(ctx context.Context) ([]db.ListActiveCitiesRow, error) {
	panic("PartialMockQuerier: ListActiveCities not configured")
}
func (m *PartialMockQuerier) ListActiveExtras(ctx context.Context) ([]db.ServiceExtra, error) {
	panic("PartialMockQuerier: ListActiveExtras not configured")
}
func (m *PartialMockQuerier) ListActiveExtrasByCategory(ctx context.Context, categoryID pgtype.UUID) ([]db.ServiceExtra, error) {
	panic("PartialMockQuerier: ListActiveExtrasByCategory not configured")
}
func (m *PartialMockQuerier) ListActiveRecurringDiscounts(ctx context.Context) ([]db.RecurringDiscount, error) {
	panic("PartialMockQuerier: ListActiveRecurringDiscounts not configured")
}
func (m *PartialMockQuerier) ListActiveRecurringGroupsByClient(ctx context.Context, clientUserID pgtype.UUID) ([]db.RecurringBookingGroup, error) {
	panic("PartialMockQuerier: ListActiveRecurringGroupsByClient not configured")
}
func (m *PartialMockQuerier) ListActiveServiceCategories(ctx context.Context) ([]db.ServiceCategory, error) {
	panic("PartialMockQuerier: ListActiveServiceCategories not configured")
}
func (m *PartialMockQuerier) ListActiveServices(ctx context.Context) ([]db.ServiceDefinition, error) {
	panic("PartialMockQuerier: ListActiveServices not configured")
}
func (m *PartialMockQuerier) ListActiveSubscriptionsByClient(ctx context.Context, clientUserID pgtype.UUID) ([]db.Subscription, error) {
	panic("PartialMockQuerier: ListActiveSubscriptionsByClient not configured")
}
func (m *PartialMockQuerier) ListAddressesByUser(ctx context.Context, userID pgtype.UUID) ([]db.ClientAddress, error) {
	panic("PartialMockQuerier: ListAddressesByUser not configured")
}
func (m *PartialMockQuerier) ListAllActiveWorkers(ctx context.Context) ([]db.ListAllActiveWorkersRow, error) {
	panic("PartialMockQuerier: ListAllActiveWorkers not configured")
}
func (m *PartialMockQuerier) ListAllBookings(ctx context.Context, arg db.ListAllBookingsParams) ([]db.Booking, error) {
	panic("PartialMockQuerier: ListAllBookings not configured")
}
func (m *PartialMockQuerier) ListAllCompanies(ctx context.Context, arg db.ListAllCompaniesParams) ([]db.Company, error) {
	panic("PartialMockQuerier: ListAllCompanies not configured")
}
func (m *PartialMockQuerier) ListAllExtras(ctx context.Context) ([]db.ServiceExtra, error) {
	panic("PartialMockQuerier: ListAllExtras not configured")
}
func (m *PartialMockQuerier) ListAllInvoices(ctx context.Context, arg db.ListAllInvoicesParams) ([]db.Invoice, error) {
	panic("PartialMockQuerier: ListAllInvoices not configured")
}
func (m *PartialMockQuerier) ListAllPaymentTransactions(ctx context.Context, arg db.ListAllPaymentTransactionsParams) ([]db.PaymentTransaction, error) {
	panic("PartialMockQuerier: ListAllPaymentTransactions not configured")
}
func (m *PartialMockQuerier) ListAllPayouts(ctx context.Context, arg db.ListAllPayoutsParams) ([]db.CompanyPayout, error) {
	panic("PartialMockQuerier: ListAllPayouts not configured")
}
func (m *PartialMockQuerier) ListAllRefundRequests(ctx context.Context, arg db.ListAllRefundRequestsParams) ([]db.RefundRequest, error) {
	panic("PartialMockQuerier: ListAllRefundRequests not configured")
}
func (m *PartialMockQuerier) ListAllReviews(ctx context.Context, arg db.ListAllReviewsParams) ([]db.Review, error) {
	panic("PartialMockQuerier: ListAllReviews not configured")
}
func (m *PartialMockQuerier) ListAllReviewsFiltered(ctx context.Context, arg db.ListAllReviewsFilteredParams) ([]db.Review, error) {
	panic("PartialMockQuerier: ListAllReviewsFiltered not configured")
}
func (m *PartialMockQuerier) ListAllServiceCategories(ctx context.Context) ([]db.ServiceCategory, error) {
	panic("PartialMockQuerier: ListAllServiceCategories not configured")
}
func (m *PartialMockQuerier) ListAllServices(ctx context.Context) ([]db.ServiceDefinition, error) {
	panic("PartialMockQuerier: ListAllServices not configured")
}
func (m *PartialMockQuerier) ListAllSubscriptions(ctx context.Context, arg db.ListAllSubscriptionsParams) ([]db.Subscription, error) {
	panic("PartialMockQuerier: ListAllSubscriptions not configured")
}
func (m *PartialMockQuerier) ListAllUsers(ctx context.Context) ([]db.User, error) {
	panic("PartialMockQuerier: ListAllUsers not configured")
}
func (m *PartialMockQuerier) ListAreasByCity(ctx context.Context, cityID pgtype.UUID) ([]db.ListAreasByCityRow, error) {
	panic("PartialMockQuerier: ListAreasByCity not configured")
}
func (m *PartialMockQuerier) ListBookingExtras(ctx context.Context, bookingID pgtype.UUID) ([]db.ListBookingExtrasRow, error) {
	if m.ListBookingExtrasFn == nil {
		panic("PartialMockQuerier: ListBookingExtras not configured")
	}
	return m.ListBookingExtrasFn(ctx, bookingID)
}
func (m *PartialMockQuerier) ListBookingTimeSlots(ctx context.Context, bookingID pgtype.UUID) ([]db.BookingTimeSlot, error) {
	if m.ListBookingTimeSlotsFn == nil {
		panic("PartialMockQuerier: ListBookingTimeSlots not configured")
	}
	return m.ListBookingTimeSlotsFn(ctx, bookingID)
}
func (m *PartialMockQuerier) ListBookingsByClient(ctx context.Context, arg db.ListBookingsByClientParams) ([]db.Booking, error) {
	panic("PartialMockQuerier: ListBookingsByClient not configured")
}
func (m *PartialMockQuerier) ListBookingsByClientAndStatus(ctx context.Context, arg db.ListBookingsByClientAndStatusParams) ([]db.Booking, error) {
	panic("PartialMockQuerier: ListBookingsByClientAndStatus not configured")
}
func (m *PartialMockQuerier) ListBookingsByCompany(ctx context.Context, arg db.ListBookingsByCompanyParams) ([]db.Booking, error) {
	panic("PartialMockQuerier: ListBookingsByCompany not configured")
}
func (m *PartialMockQuerier) ListBookingsByCompanyAndDateRange(ctx context.Context, arg db.ListBookingsByCompanyAndDateRangeParams) ([]db.Booking, error) {
	panic("PartialMockQuerier: ListBookingsByCompanyAndDateRange not configured")
}
func (m *PartialMockQuerier) ListBookingsByCompanyAndStatus(ctx context.Context, arg db.ListBookingsByCompanyAndStatusParams) ([]db.Booking, error) {
	panic("PartialMockQuerier: ListBookingsByCompanyAndStatus not configured")
}
func (m *PartialMockQuerier) ListBookingsByStatus(ctx context.Context, arg db.ListBookingsByStatusParams) ([]db.Booking, error) {
	panic("PartialMockQuerier: ListBookingsByStatus not configured")
}
func (m *PartialMockQuerier) ListBookingsByWorker(ctx context.Context, workerID pgtype.UUID) ([]db.Booking, error) {
	panic("PartialMockQuerier: ListBookingsByWorker not configured")
}
func (m *PartialMockQuerier) ListBookingsByWorkerAndDateRange(ctx context.Context, arg db.ListBookingsByWorkerAndDateRangeParams) ([]db.Booking, error) {
	panic("PartialMockQuerier: ListBookingsByWorkerAndDateRange not configured")
}
func (m *PartialMockQuerier) ListCompaniesByStatus(ctx context.Context, arg db.ListCompaniesByStatusParams) ([]db.Company, error) {
	panic("PartialMockQuerier: ListCompaniesByStatus not configured")
}
func (m *PartialMockQuerier) ListCompanyDocuments(ctx context.Context, companyID pgtype.UUID) ([]db.CompanyDocument, error) {
	panic("PartialMockQuerier: ListCompanyDocuments not configured")
}
func (m *PartialMockQuerier) ListCompanyServiceAreas(ctx context.Context, companyID pgtype.UUID) ([]db.ListCompanyServiceAreasRow, error) {
	panic("PartialMockQuerier: ListCompanyServiceAreas not configured")
}
func (m *PartialMockQuerier) ListCompanyServiceCategories(ctx context.Context, companyID pgtype.UUID) ([]db.ListCompanyServiceCategoriesRow, error) {
	panic("PartialMockQuerier: ListCompanyServiceCategories not configured")
}
func (m *PartialMockQuerier) ListCompanyWorkSchedule(ctx context.Context, companyID pgtype.UUID) ([]db.CompanyWorkSchedule, error) {
	panic("PartialMockQuerier: ListCompanyWorkSchedule not configured")
}
func (m *PartialMockQuerier) ListEnabledCities(ctx context.Context) ([]db.ListEnabledCitiesRow, error) {
	panic("PartialMockQuerier: ListEnabledCities not configured")
}
func (m *PartialMockQuerier) ListInvoiceLineItems(ctx context.Context, invoiceID pgtype.UUID) ([]db.InvoiceLineItem, error) {
	panic("PartialMockQuerier: ListInvoiceLineItems not configured")
}
func (m *PartialMockQuerier) ListInvoicesByClient(ctx context.Context, arg db.ListInvoicesByClientParams) ([]db.Invoice, error) {
	panic("PartialMockQuerier: ListInvoicesByClient not configured")
}
func (m *PartialMockQuerier) ListInvoicesByCompany(ctx context.Context, arg db.ListInvoicesByCompanyParams) ([]db.Invoice, error) {
	panic("PartialMockQuerier: ListInvoicesByCompany not configured")
}
func (m *PartialMockQuerier) ListInvoicesByCompanyAndStatus(ctx context.Context, arg db.ListInvoicesByCompanyAndStatusParams) ([]db.Invoice, error) {
	panic("PartialMockQuerier: ListInvoicesByCompanyAndStatus not configured")
}
func (m *PartialMockQuerier) ListInvoicesByCompanyID(ctx context.Context, arg db.ListInvoicesByCompanyIDParams) ([]db.Invoice, error) {
	panic("PartialMockQuerier: ListInvoicesByCompanyID not configured")
}
func (m *PartialMockQuerier) ListInvoicesByType(ctx context.Context, arg db.ListInvoicesByTypeParams) ([]db.Invoice, error) {
	panic("PartialMockQuerier: ListInvoicesByType not configured")
}
func (m *PartialMockQuerier) ListInvoicesByTypeAndStatus(ctx context.Context, arg db.ListInvoicesByTypeAndStatusParams) ([]db.Invoice, error) {
	panic("PartialMockQuerier: ListInvoicesByTypeAndStatus not configured")
}
func (m *PartialMockQuerier) ListJobPhotosByBooking(ctx context.Context, bookingID pgtype.UUID) ([]db.BookingJobPhoto, error) {
	if m.ListJobPhotosByBookingFn == nil {
		panic("PartialMockQuerier: ListJobPhotosByBooking not configured")
	}
	return m.ListJobPhotosByBookingFn(ctx, bookingID)
}
func (m *PartialMockQuerier) ListNotificationsByUser(ctx context.Context, arg db.ListNotificationsByUserParams) ([]db.Notification, error) {
	panic("PartialMockQuerier: ListNotificationsByUser not configured")
}
func (m *PartialMockQuerier) ListPaymentHistoryByUser(ctx context.Context, arg db.ListPaymentHistoryByUserParams) ([]db.PaymentTransaction, error) {
	panic("PartialMockQuerier: ListPaymentHistoryByUser not configured")
}
func (m *PartialMockQuerier) ListPaymentMethodsByUser(ctx context.Context, userID pgtype.UUID) ([]db.ClientPaymentMethod, error) {
	panic("PartialMockQuerier: ListPaymentMethodsByUser not configured")
}
func (m *PartialMockQuerier) ListPaymentTransactionsByBooking(ctx context.Context, bookingID pgtype.UUID) ([]db.PaymentTransaction, error) {
	panic("PartialMockQuerier: ListPaymentTransactionsByBooking not configured")
}
func (m *PartialMockQuerier) ListPaymentTransactionsByStatus(ctx context.Context, arg db.ListPaymentTransactionsByStatusParams) ([]db.PaymentTransaction, error) {
	panic("PartialMockQuerier: ListPaymentTransactionsByStatus not configured")
}
func (m *PartialMockQuerier) ListPayoutLineItems(ctx context.Context, payoutID pgtype.UUID) ([]db.PayoutLineItem, error) {
	panic("PartialMockQuerier: ListPayoutLineItems not configured")
}
func (m *PartialMockQuerier) ListPayoutsByCompany(ctx context.Context, arg db.ListPayoutsByCompanyParams) ([]db.CompanyPayout, error) {
	panic("PartialMockQuerier: ListPayoutsByCompany not configured")
}
func (m *PartialMockQuerier) ListPayoutsByCompanyAndStatus(ctx context.Context, arg db.ListPayoutsByCompanyAndStatusParams) ([]db.CompanyPayout, error) {
	panic("PartialMockQuerier: ListPayoutsByCompanyAndStatus not configured")
}
func (m *PartialMockQuerier) ListPayoutsByStatus(ctx context.Context, arg db.ListPayoutsByStatusParams) ([]db.CompanyPayout, error) {
	panic("PartialMockQuerier: ListPayoutsByStatus not configured")
}
func (m *PartialMockQuerier) ListPendingCompanyDocuments(ctx context.Context) ([]db.CompanyDocument, error) {
	panic("PartialMockQuerier: ListPendingCompanyDocuments not configured")
}
func (m *PartialMockQuerier) ListPendingWorkerDocuments(ctx context.Context) ([]db.WorkerDocument, error) {
	panic("PartialMockQuerier: ListPendingWorkerDocuments not configured")
}
func (m *PartialMockQuerier) ListPlatformSettings(ctx context.Context) ([]db.PlatformSetting, error) {
	panic("PartialMockQuerier: ListPlatformSettings not configured")
}
func (m *PartialMockQuerier) ListPriceAuditLog(ctx context.Context, arg db.ListPriceAuditLogParams) ([]db.ListPriceAuditLogRow, error) {
	panic("PartialMockQuerier: ListPriceAuditLog not configured")
}
func (m *PartialMockQuerier) ListPriceAuditLogByEntity(ctx context.Context, arg db.ListPriceAuditLogByEntityParams) ([]db.ListPriceAuditLogByEntityRow, error) {
	panic("PartialMockQuerier: ListPriceAuditLogByEntity not configured")
}
func (m *PartialMockQuerier) ListReceivedInvoicesByCompany(ctx context.Context, arg db.ListReceivedInvoicesByCompanyParams) ([]db.Invoice, error) {
	panic("PartialMockQuerier: ListReceivedInvoicesByCompany not configured")
}
func (m *PartialMockQuerier) ListRecurringDiscounts(ctx context.Context) ([]db.RecurringDiscount, error) {
	panic("PartialMockQuerier: ListRecurringDiscounts not configured")
}
func (m *PartialMockQuerier) ListRecurringGroupsByClient(ctx context.Context, clientUserID pgtype.UUID) ([]db.RecurringBookingGroup, error) {
	panic("PartialMockQuerier: ListRecurringGroupsByClient not configured")
}
func (m *PartialMockQuerier) ListReferralEarnedDiscountsByOwner(ctx context.Context, ownerUserID pgtype.UUID) ([]db.ReferralEarnedDiscount, error) {
	panic("PartialMockQuerier: ListReferralEarnedDiscountsByOwner not configured")
}
func (m *PartialMockQuerier) ListRefundRequestsByStatus(ctx context.Context, arg db.ListRefundRequestsByStatusParams) ([]db.RefundRequest, error) {
	panic("PartialMockQuerier: ListRefundRequestsByStatus not configured")
}
func (m *PartialMockQuerier) ListRefundRequestsByUser(ctx context.Context, requestedByUserID pgtype.UUID) ([]db.RefundRequest, error) {
	panic("PartialMockQuerier: ListRefundRequestsByUser not configured")
}
func (m *PartialMockQuerier) ListReviewPhotos(ctx context.Context, reviewID pgtype.UUID) ([]db.ReviewPhoto, error) {
	panic("PartialMockQuerier: ListReviewPhotos not configured")
}
func (m *PartialMockQuerier) ListReviewsByCompanyWorkers(ctx context.Context, arg db.ListReviewsByCompanyWorkersParams) ([]db.Review, error) {
	panic("PartialMockQuerier: ListReviewsByCompanyWorkers not configured")
}
func (m *PartialMockQuerier) ListReviewsByWorkerID(ctx context.Context, arg db.ListReviewsByWorkerIDParams) ([]db.Review, error) {
	panic("PartialMockQuerier: ListReviewsByWorkerID not configured")
}
func (m *PartialMockQuerier) ListServicesByCategory(ctx context.Context, categoryID pgtype.UUID) ([]db.ServiceDefinition, error) {
	panic("PartialMockQuerier: ListServicesByCategory not configured")
}
func (m *PartialMockQuerier) ListSubscriptionsByClient(ctx context.Context, clientUserID pgtype.UUID) ([]db.Subscription, error) {
	panic("PartialMockQuerier: ListSubscriptionsByClient not configured")
}
func (m *PartialMockQuerier) ListSubscriptionsByCompany(ctx context.Context, arg db.ListSubscriptionsByCompanyParams) ([]db.Subscription, error) {
	panic("PartialMockQuerier: ListSubscriptionsByCompany not configured")
}
func (m *PartialMockQuerier) ListSubscriptionsByStatus(ctx context.Context, arg db.ListSubscriptionsByStatusParams) ([]db.Subscription, error) {
	panic("PartialMockQuerier: ListSubscriptionsByStatus not configured")
}
func (m *PartialMockQuerier) ListSubscriptionsByWorker(ctx context.Context, workerID pgtype.UUID) ([]db.Subscription, error) {
	panic("PartialMockQuerier: ListSubscriptionsByWorker not configured")
}
func (m *PartialMockQuerier) ListTodaysJobsByWorker(ctx context.Context, workerID pgtype.UUID) ([]db.Booking, error) {
	panic("PartialMockQuerier: ListTodaysJobsByWorker not configured")
}
func (m *PartialMockQuerier) ListUnpaidCompanyTransactions(ctx context.Context, arg db.ListUnpaidCompanyTransactionsParams) ([]db.PaymentTransaction, error) {
	panic("PartialMockQuerier: ListUnpaidCompanyTransactions not configured")
}
func (m *PartialMockQuerier) ListUsersByRole(ctx context.Context, role db.UserRole) ([]db.User, error) {
	panic("PartialMockQuerier: ListUsersByRole not configured")
}
func (m *PartialMockQuerier) ListWaitlistLeads(ctx context.Context, arg db.ListWaitlistLeadsParams) ([]db.WaitlistLead, error) {
	panic("PartialMockQuerier: ListWaitlistLeads not configured")
}
func (m *PartialMockQuerier) ListWorkerAvailability(ctx context.Context, workerID pgtype.UUID) ([]db.WorkerAvailability, error) {
	panic("PartialMockQuerier: ListWorkerAvailability not configured")
}
func (m *PartialMockQuerier) ListWorkerBookingsForDate(ctx context.Context, arg db.ListWorkerBookingsForDateParams) ([]db.ListWorkerBookingsForDateRow, error) {
	panic("PartialMockQuerier: ListWorkerBookingsForDate not configured")
}
func (m *PartialMockQuerier) ListWorkerDateOverrides(ctx context.Context, arg db.ListWorkerDateOverridesParams) ([]db.WorkerDateOverride, error) {
	panic("PartialMockQuerier: ListWorkerDateOverrides not configured")
}
func (m *PartialMockQuerier) ListWorkerDocuments(ctx context.Context, workerID pgtype.UUID) ([]db.WorkerDocument, error) {
	panic("PartialMockQuerier: ListWorkerDocuments not configured")
}
func (m *PartialMockQuerier) ListWorkerServiceAreas(ctx context.Context, workerID pgtype.UUID) ([]db.ListWorkerServiceAreasRow, error) {
	panic("PartialMockQuerier: ListWorkerServiceAreas not configured")
}
func (m *PartialMockQuerier) ListWorkerServiceCategories(ctx context.Context, workerID pgtype.UUID) ([]db.ListWorkerServiceCategoriesRow, error) {
	panic("PartialMockQuerier: ListWorkerServiceCategories not configured")
}
func (m *PartialMockQuerier) ListWorkersByCompany(ctx context.Context, companyID pgtype.UUID) ([]db.Worker, error) {
	panic("PartialMockQuerier: ListWorkersByCompany not configured")
}
func (m *PartialMockQuerier) MarkAllNotificationsRead(ctx context.Context, userID pgtype.UUID) error {
	panic("PartialMockQuerier: MarkAllNotificationsRead not configured")
}
func (m *PartialMockQuerier) MarkBookingPaid(ctx context.Context, id pgtype.UUID) (db.Booking, error) {
	panic("PartialMockQuerier: MarkBookingPaid not configured")
}
func (m *PartialMockQuerier) MarkBookingPaidAndConfirmed(ctx context.Context, id pgtype.UUID) (db.Booking, error) {
	panic("PartialMockQuerier: MarkBookingPaidAndConfirmed not configured")
}
func (m *PartialMockQuerier) MarkEmailOTPUsed(ctx context.Context, id pgtype.UUID) error {
	panic("PartialMockQuerier: MarkEmailOTPUsed not configured")
}
func (m *PartialMockQuerier) MarkInvoiceAsPaid(ctx context.Context, id pgtype.UUID) (db.Invoice, error) {
	panic("PartialMockQuerier: MarkInvoiceAsPaid not configured")
}
func (m *PartialMockQuerier) MarkNotificationRead(ctx context.Context, id pgtype.UUID) error {
	panic("PartialMockQuerier: MarkNotificationRead not configured")
}
func (m *PartialMockQuerier) MarkPhoneOTPUsed(ctx context.Context, id pgtype.UUID) error {
	panic("PartialMockQuerier: MarkPhoneOTPUsed not configured")
}
func (m *PartialMockQuerier) MarkReferralSignupCompleted(ctx context.Context, arg db.MarkReferralSignupCompletedParams) (db.ReferralSignup, error) {
	panic("PartialMockQuerier: MarkReferralSignupCompleted not configured")
}
func (m *PartialMockQuerier) PauseRecurringGroup(ctx context.Context, id pgtype.UUID) (db.RecurringBookingGroup, error) {
	panic("PartialMockQuerier: PauseRecurringGroup not configured")
}
func (m *PartialMockQuerier) PauseSubscription(ctx context.Context, id pgtype.UUID) (db.Subscription, error) {
	panic("PartialMockQuerier: PauseSubscription not configured")
}
func (m *PartialMockQuerier) ReactivateWorkersByCompany(ctx context.Context, companyID pgtype.UUID) error {
	panic("PartialMockQuerier: ReactivateWorkersByCompany not configured")
}
func (m *PartialMockQuerier) ReassignFutureSubscriptionBookings(ctx context.Context, arg db.ReassignFutureSubscriptionBookingsParams) error {
	panic("PartialMockQuerier: ReassignFutureSubscriptionBookings not configured")
}
func (m *PartialMockQuerier) ReassignSingleBookingWorker(ctx context.Context, arg db.ReassignSingleBookingWorkerParams) (db.Booking, error) {
	panic("PartialMockQuerier: ReassignSingleBookingWorker not configured")
}
func (m *PartialMockQuerier) ReleaseReferralDiscount(ctx context.Context, id pgtype.UUID) (db.ReferralEarnedDiscount, error) {
	panic("PartialMockQuerier: ReleaseReferralDiscount not configured")
}
func (m *PartialMockQuerier) RequestSubscriptionWorkerChange(ctx context.Context, arg db.RequestSubscriptionWorkerChangeParams) (db.Subscription, error) {
	panic("PartialMockQuerier: RequestSubscriptionWorkerChange not configured")
}
func (m *PartialMockQuerier) RescheduleBooking(ctx context.Context, arg db.RescheduleBookingParams) (db.Booking, error) {
	panic("PartialMockQuerier: RescheduleBooking not configured")
}
func (m *PartialMockQuerier) ReserveReferralDiscount(ctx context.Context, arg db.ReserveReferralDiscountParams) (db.ReferralEarnedDiscount, error) {
	panic("PartialMockQuerier: ReserveReferralDiscount not configured")
}
func (m *PartialMockQuerier) ResolveSubscriptionWorkerChange(ctx context.Context, arg db.ResolveSubscriptionWorkerChangeParams) (db.Subscription, error) {
	panic("PartialMockQuerier: ResolveSubscriptionWorkerChange not configured")
}
func (m *PartialMockQuerier) ResumeRecurringGroup(ctx context.Context, id pgtype.UUID) (db.RecurringBookingGroup, error) {
	panic("PartialMockQuerier: ResumeRecurringGroup not configured")
}
func (m *PartialMockQuerier) ResumeSubscription(ctx context.Context, id pgtype.UUID) (db.Subscription, error) {
	panic("PartialMockQuerier: ResumeSubscription not configured")
}
func (m *PartialMockQuerier) SaveANAFError(ctx context.Context, arg db.SaveANAFErrorParams) (db.Company, error) {
	panic("PartialMockQuerier: SaveANAFError not configured")
}
func (m *PartialMockQuerier) SaveANAFVerification(ctx context.Context, arg db.SaveANAFVerificationParams) (db.Company, error) {
	panic("PartialMockQuerier: SaveANAFVerification not configured")
}
func (m *PartialMockQuerier) SearchBookings(ctx context.Context, arg db.SearchBookingsParams) ([]db.Booking, error) {
	panic("PartialMockQuerier: SearchBookings not configured")
}
func (m *PartialMockQuerier) SearchBookingsWithDetails(ctx context.Context, arg db.SearchBookingsWithDetailsParams) ([]db.SearchBookingsWithDetailsRow, error) {
	panic("PartialMockQuerier: SearchBookingsWithDetails not configured")
}
func (m *PartialMockQuerier) SearchCompanies(ctx context.Context, arg db.SearchCompaniesParams) ([]db.Company, error) {
	panic("PartialMockQuerier: SearchCompanies not configured")
}
func (m *PartialMockQuerier) SearchCompanyBookings(ctx context.Context, arg db.SearchCompanyBookingsParams) ([]db.Booking, error) {
	panic("PartialMockQuerier: SearchCompanyBookings not configured")
}
func (m *PartialMockQuerier) SearchUsers(ctx context.Context, arg db.SearchUsersParams) ([]db.User, error) {
	panic("PartialMockQuerier: SearchUsers not configured")
}
func (m *PartialMockQuerier) SearchUsersByName(ctx context.Context, dollar_1 pgtype.Text) ([]db.User, error) {
	panic("PartialMockQuerier: SearchUsersByName not configured")
}
func (m *PartialMockQuerier) SearchWorkerBookings(ctx context.Context, arg db.SearchWorkerBookingsParams) ([]db.Booking, error) {
	panic("PartialMockQuerier: SearchWorkerBookings not configured")
}
func (m *PartialMockQuerier) SelectBookingTimeSlot(ctx context.Context, id pgtype.UUID) (db.BookingTimeSlot, error) {
	panic("PartialMockQuerier: SelectBookingTimeSlot not configured")
}
func (m *PartialMockQuerier) SetBookingFinalTotal(ctx context.Context, arg db.SetBookingFinalTotalParams) (db.Booking, error) {
	panic("PartialMockQuerier: SetBookingFinalTotal not configured")
}
func (m *PartialMockQuerier) SetBookingPreferredWorker(ctx context.Context, arg db.SetBookingPreferredWorkerParams) (db.Booking, error) {
	panic("PartialMockQuerier: SetBookingPreferredWorker not configured")
}
func (m *PartialMockQuerier) SetCompanyAdminUser(ctx context.Context, arg db.SetCompanyAdminUserParams) (db.Company, error) {
	panic("PartialMockQuerier: SetCompanyAdminUser not configured")
}
func (m *PartialMockQuerier) SetCompanyCommissionOverride(ctx context.Context, arg db.SetCompanyCommissionOverrideParams) (db.Company, error) {
	panic("PartialMockQuerier: SetCompanyCommissionOverride not configured")
}
func (m *PartialMockQuerier) SetCompanyStripeConnect(ctx context.Context, arg db.SetCompanyStripeConnectParams) error {
	panic("PartialMockQuerier: SetCompanyStripeConnect not configured")
}
func (m *PartialMockQuerier) SetDefaultAddress(ctx context.Context, arg db.SetDefaultAddressParams) error {
	panic("PartialMockQuerier: SetDefaultAddress not configured")
}
func (m *PartialMockQuerier) SetDefaultPaymentMethod(ctx context.Context, arg db.SetDefaultPaymentMethodParams) error {
	panic("PartialMockQuerier: SetDefaultPaymentMethod not configured")
}
func (m *PartialMockQuerier) SetUserPhoneVerified(ctx context.Context, arg db.SetUserPhoneVerifiedParams) (db.User, error) {
	panic("PartialMockQuerier: SetUserPhoneVerified not configured")
}
func (m *PartialMockQuerier) SetUserReferralCodeUsed(ctx context.Context, arg db.SetUserReferralCodeUsedParams) (db.User, error) {
	panic("PartialMockQuerier: SetUserReferralCodeUsed not configured")
}
func (m *PartialMockQuerier) SetUserStripeCustomerID(ctx context.Context, arg db.SetUserStripeCustomerIDParams) error {
	panic("PartialMockQuerier: SetUserStripeCustomerID not configured")
}
func (m *PartialMockQuerier) SetWorkerAvailability(ctx context.Context, arg db.SetWorkerAvailabilityParams) (db.WorkerAvailability, error) {
	panic("PartialMockQuerier: SetWorkerAvailability not configured")
}
func (m *PartialMockQuerier) StartBooking(ctx context.Context, id pgtype.UUID) (db.Booking, error) {
	panic("PartialMockQuerier: StartBooking not configured")
}
func (m *PartialMockQuerier) SumCompanyEarnings(ctx context.Context, arg db.SumCompanyEarningsParams) (db.SumCompanyEarningsRow, error) {
	panic("PartialMockQuerier: SumCompanyEarnings not configured")
}
func (m *PartialMockQuerier) SumRefundedAmountByBooking(ctx context.Context, bookingID pgtype.UUID) (int32, error) {
	panic("PartialMockQuerier: SumRefundedAmountByBooking not configured")
}
func (m *PartialMockQuerier) SumThisMonthEarningsByWorker(ctx context.Context, workerID pgtype.UUID) (pgtype.Numeric, error) {
	panic("PartialMockQuerier: SumThisMonthEarningsByWorker not configured")
}
func (m *PartialMockQuerier) SuspendWorkersByCompany(ctx context.Context, companyID pgtype.UUID) error {
	panic("PartialMockQuerier: SuspendWorkersByCompany not configured")
}
func (m *PartialMockQuerier) UpdateAddress(ctx context.Context, arg db.UpdateAddressParams) (db.ClientAddress, error) {
	panic("PartialMockQuerier: UpdateAddress not configured")
}
func (m *PartialMockQuerier) UpdateBillingProfile(ctx context.Context, arg db.UpdateBillingProfileParams) (db.ClientBillingProfile, error) {
	panic("PartialMockQuerier: UpdateBillingProfile not configured")
}
func (m *PartialMockQuerier) UpdateBookingPayment(ctx context.Context, arg db.UpdateBookingPaymentParams) (db.Booking, error) {
	panic("PartialMockQuerier: UpdateBookingPayment not configured")
}
func (m *PartialMockQuerier) UpdateBookingSchedule(ctx context.Context, arg db.UpdateBookingScheduleParams) (db.Booking, error) {
	panic("PartialMockQuerier: UpdateBookingSchedule not configured")
}
func (m *PartialMockQuerier) UpdateCityActive(ctx context.Context, arg db.UpdateCityActiveParams) (db.UpdateCityActiveRow, error) {
	panic("PartialMockQuerier: UpdateCityActive not configured")
}
func (m *PartialMockQuerier) UpdateCityPricingMultiplier(ctx context.Context, arg db.UpdateCityPricingMultiplierParams) (db.UpdateCityPricingMultiplierRow, error) {
	panic("PartialMockQuerier: UpdateCityPricingMultiplier not configured")
}
func (m *PartialMockQuerier) UpdateCompanyDocumentStatus(ctx context.Context, arg db.UpdateCompanyDocumentStatusParams) (db.CompanyDocument, error) {
	panic("PartialMockQuerier: UpdateCompanyDocumentStatus not configured")
}
func (m *PartialMockQuerier) UpdateCompanyLogo(ctx context.Context, arg db.UpdateCompanyLogoParams) (db.Company, error) {
	panic("PartialMockQuerier: UpdateCompanyLogo not configured")
}
func (m *PartialMockQuerier) UpdateCompanyOwnProfile(ctx context.Context, arg db.UpdateCompanyOwnProfileParams) (db.Company, error) {
	panic("PartialMockQuerier: UpdateCompanyOwnProfile not configured")
}
func (m *PartialMockQuerier) UpdateInvoiceEFactura(ctx context.Context, arg db.UpdateInvoiceEFacturaParams) error {
	panic("PartialMockQuerier: UpdateInvoiceEFactura not configured")
}
func (m *PartialMockQuerier) UpdateInvoiceKeez(ctx context.Context, arg db.UpdateInvoiceKeezParams) error {
	panic("PartialMockQuerier: UpdateInvoiceKeez not configured")
}
func (m *PartialMockQuerier) UpdateInvoiceStatus(ctx context.Context, arg db.UpdateInvoiceStatusParams) (db.Invoice, error) {
	panic("PartialMockQuerier: UpdateInvoiceStatus not configured")
}
func (m *PartialMockQuerier) UpdatePaymentTransactionDisputed(ctx context.Context, arg db.UpdatePaymentTransactionDisputedParams) (db.PaymentTransaction, error) {
	panic("PartialMockQuerier: UpdatePaymentTransactionDisputed not configured")
}
func (m *PartialMockQuerier) UpdatePaymentTransactionFailed(ctx context.Context, arg db.UpdatePaymentTransactionFailedParams) (db.PaymentTransaction, error) {
	panic("PartialMockQuerier: UpdatePaymentTransactionFailed not configured")
}
func (m *PartialMockQuerier) UpdatePaymentTransactionRefund(ctx context.Context, arg db.UpdatePaymentTransactionRefundParams) (db.PaymentTransaction, error) {
	panic("PartialMockQuerier: UpdatePaymentTransactionRefund not configured")
}
func (m *PartialMockQuerier) UpdatePaymentTransactionStatus(ctx context.Context, arg db.UpdatePaymentTransactionStatusParams) (db.PaymentTransaction, error) {
	panic("PartialMockQuerier: UpdatePaymentTransactionStatus not configured")
}
func (m *PartialMockQuerier) UpdatePayoutFailed(ctx context.Context, arg db.UpdatePayoutFailedParams) (db.CompanyPayout, error) {
	panic("PartialMockQuerier: UpdatePayoutFailed not configured")
}
func (m *PartialMockQuerier) UpdatePayoutStatus(ctx context.Context, arg db.UpdatePayoutStatusParams) (db.CompanyPayout, error) {
	panic("PartialMockQuerier: UpdatePayoutStatus not configured")
}
func (m *PartialMockQuerier) UpdatePlatformLegalEntity(ctx context.Context, arg db.UpdatePlatformLegalEntityParams) (db.PlatformLegalEntity, error) {
	panic("PartialMockQuerier: UpdatePlatformLegalEntity not configured")
}
func (m *PartialMockQuerier) UpdatePlatformSetting(ctx context.Context, arg db.UpdatePlatformSettingParams) (db.PlatformSetting, error) {
	panic("PartialMockQuerier: UpdatePlatformSetting not configured")
}
func (m *PartialMockQuerier) UpdateRecurringDiscount(ctx context.Context, arg db.UpdateRecurringDiscountParams) (db.RecurringDiscount, error) {
	panic("PartialMockQuerier: UpdateRecurringDiscount not configured")
}
func (m *PartialMockQuerier) UpdateRefundRequestStatus(ctx context.Context, arg db.UpdateRefundRequestStatusParams) (db.RefundRequest, error) {
	panic("PartialMockQuerier: UpdateRefundRequestStatus not configured")
}
func (m *PartialMockQuerier) UpdateServiceCategory(ctx context.Context, arg db.UpdateServiceCategoryParams) (db.ServiceCategory, error) {
	panic("PartialMockQuerier: UpdateServiceCategory not configured")
}
func (m *PartialMockQuerier) UpdateServiceDefinition(ctx context.Context, arg db.UpdateServiceDefinitionParams) (db.ServiceDefinition, error) {
	panic("PartialMockQuerier: UpdateServiceDefinition not configured")
}
func (m *PartialMockQuerier) UpdateServiceExtra(ctx context.Context, arg db.UpdateServiceExtraParams) (db.ServiceExtra, error) {
	panic("PartialMockQuerier: UpdateServiceExtra not configured")
}
func (m *PartialMockQuerier) UpdateSubscriptionPeriod(ctx context.Context, arg db.UpdateSubscriptionPeriodParams) (db.Subscription, error) {
	panic("PartialMockQuerier: UpdateSubscriptionPeriod not configured")
}
func (m *PartialMockQuerier) UpdateSubscriptionStatus(ctx context.Context, arg db.UpdateSubscriptionStatusParams) (db.Subscription, error) {
	panic("PartialMockQuerier: UpdateSubscriptionStatus not configured")
}
func (m *PartialMockQuerier) UpdateSubscriptionStripeIDs(ctx context.Context, arg db.UpdateSubscriptionStripeIDsParams) (db.Subscription, error) {
	panic("PartialMockQuerier: UpdateSubscriptionStripeIDs not configured")
}
func (m *PartialMockQuerier) UpdateSubscriptionWorker(ctx context.Context, arg db.UpdateSubscriptionWorkerParams) (db.Subscription, error) {
	panic("PartialMockQuerier: UpdateSubscriptionWorker not configured")
}
func (m *PartialMockQuerier) UpdateUser(ctx context.Context, arg db.UpdateUserParams) (db.User, error) {
	panic("PartialMockQuerier: UpdateUser not configured")
}
func (m *PartialMockQuerier) UpdateUserAvatar(ctx context.Context, arg db.UpdateUserAvatarParams) (db.User, error) {
	panic("PartialMockQuerier: UpdateUserAvatar not configured")
}
func (m *PartialMockQuerier) UpdateUserFCMToken(ctx context.Context, arg db.UpdateUserFCMTokenParams) error {
	panic("PartialMockQuerier: UpdateUserFCMToken not configured")
}
func (m *PartialMockQuerier) UpdateUserPhone(ctx context.Context, arg db.UpdateUserPhoneParams) (db.User, error) {
	panic("PartialMockQuerier: UpdateUserPhone not configured")
}
func (m *PartialMockQuerier) UpdateUserRole(ctx context.Context, arg db.UpdateUserRoleParams) (db.User, error) {
	panic("PartialMockQuerier: UpdateUserRole not configured")
}
func (m *PartialMockQuerier) UpdateWorkerBio(ctx context.Context, arg db.UpdateWorkerBioParams) (db.Worker, error) {
	panic("PartialMockQuerier: UpdateWorkerBio not configured")
}
func (m *PartialMockQuerier) UpdateWorkerDocumentStatus(ctx context.Context, arg db.UpdateWorkerDocumentStatusParams) (db.WorkerDocument, error) {
	panic("PartialMockQuerier: UpdateWorkerDocumentStatus not configured")
}
func (m *PartialMockQuerier) UpdateWorkerMaxDailyBookings(ctx context.Context, arg db.UpdateWorkerMaxDailyBookingsParams) (db.Worker, error) {
	panic("PartialMockQuerier: UpdateWorkerMaxDailyBookings not configured")
}
func (m *PartialMockQuerier) UpdateWorkerStatus(ctx context.Context, arg db.UpdateWorkerStatusParams) (db.Worker, error) {
	panic("PartialMockQuerier: UpdateWorkerStatus not configured")
}
func (m *PartialMockQuerier) UpdateWorkerUserPhone(ctx context.Context, arg db.UpdateWorkerUserPhoneParams) error {
	panic("PartialMockQuerier: UpdateWorkerUserPhone not configured")
}
func (m *PartialMockQuerier) UpsertCompanyWorkScheduleDay(ctx context.Context, arg db.UpsertCompanyWorkScheduleDayParams) (db.CompanyWorkSchedule, error) {
	panic("PartialMockQuerier: UpsertCompanyWorkScheduleDay not configured")
}
func (m *PartialMockQuerier) UpsertPlatformLegalEntity(ctx context.Context, arg db.UpsertPlatformLegalEntityParams) (db.PlatformLegalEntity, error) {
	panic("PartialMockQuerier: UpsertPlatformLegalEntity not configured")
}
func (m *PartialMockQuerier) UpsertWorkerDateOverride(ctx context.Context, arg db.UpsertWorkerDateOverrideParams) (db.WorkerDateOverride, error) {
	panic("PartialMockQuerier: UpsertWorkerDateOverride not configured")
}

// Dispute operations — stub implementations; configure Fn fields when a test requires them.

func (m *PartialMockQuerier) AddDisputeEvidenceURLs(ctx context.Context, arg db.AddDisputeEvidenceURLsParams) (db.BookingDispute, error) {
	panic("PartialMockQuerier: AddDisputeEvidenceURLs not configured")
}
func (m *PartialMockQuerier) AutoCloseExpiredDisputes(ctx context.Context) ([]db.BookingDispute, error) {
	panic("PartialMockQuerier: AutoCloseExpiredDisputes not configured")
}
func (m *PartialMockQuerier) CountAllDisputes(ctx context.Context) (int64, error) {
	panic("PartialMockQuerier: CountAllDisputes not configured")
}
func (m *PartialMockQuerier) CountDisputesByStatus(ctx context.Context, status db.DisputeStatus) (int64, error) {
	panic("PartialMockQuerier: CountDisputesByStatus not configured")
}
func (m *PartialMockQuerier) CreateDispute(ctx context.Context, arg db.CreateDisputeParams) (db.BookingDispute, error) {
	panic("PartialMockQuerier: CreateDispute not configured")
}
func (m *PartialMockQuerier) GetDisputeByBookingID(ctx context.Context, bookingID pgtype.UUID) (db.BookingDispute, error) {
	panic("PartialMockQuerier: GetDisputeByBookingID not configured")
}
func (m *PartialMockQuerier) GetDisputeByID(ctx context.Context, id pgtype.UUID) (db.BookingDispute, error) {
	panic("PartialMockQuerier: GetDisputeByID not configured")
}
func (m *PartialMockQuerier) ListAllDisputes(ctx context.Context, arg db.ListAllDisputesParams) ([]db.BookingDispute, error) {
	panic("PartialMockQuerier: ListAllDisputes not configured")
}
func (m *PartialMockQuerier) ListDisputesByStatus(ctx context.Context, arg db.ListDisputesByStatusParams) ([]db.BookingDispute, error) {
	panic("PartialMockQuerier: ListDisputesByStatus not configured")
}
func (m *PartialMockQuerier) ResolveDispute(ctx context.Context, arg db.ResolveDisputeParams) (db.BookingDispute, error) {
	panic("PartialMockQuerier: ResolveDispute not configured")
}
func (m *PartialMockQuerier) UpdateDisputeCompanyResponse(ctx context.Context, arg db.UpdateDisputeCompanyResponseParams) (db.BookingDispute, error) {
	panic("PartialMockQuerier: UpdateDisputeCompanyResponse not configured")
}

// ─── Company category request methods (migration 000064) ─────────────────────

func (m *PartialMockQuerier) CountPendingCategoryRequests(ctx context.Context) (int64, error) {
	panic("PartialMockQuerier: CountPendingCategoryRequests not configured")
}

func (m *PartialMockQuerier) CreateCompanyCategoryRequest(ctx context.Context, arg db.CreateCompanyCategoryRequestParams) (db.CompanyCategoryRequest, error) {
	panic("PartialMockQuerier: CreateCompanyCategoryRequest not configured")
}

func (m *PartialMockQuerier) GetCompanyCategoryRequest(ctx context.Context, id pgtype.UUID) (db.CompanyCategoryRequest, error) {
	panic("PartialMockQuerier: GetCompanyCategoryRequest not configured")
}

func (m *PartialMockQuerier) HasPendingCategoryRequest(ctx context.Context, arg db.HasPendingCategoryRequestParams) (bool, error) {
	panic("PartialMockQuerier: HasPendingCategoryRequest not configured")
}

func (m *PartialMockQuerier) ListCompanyCategoryRequests(ctx context.Context, companyID pgtype.UUID) ([]db.ListCompanyCategoryRequestsRow, error) {
	panic("PartialMockQuerier: ListCompanyCategoryRequests not configured")
}

func (m *PartialMockQuerier) ListPendingCategoryRequests(ctx context.Context) ([]db.ListPendingCategoryRequestsRow, error) {
	panic("PartialMockQuerier: ListPendingCategoryRequests not configured")
}

func (m *PartialMockQuerier) UpdateCompanyCategoryRequestStatus(ctx context.Context, arg db.UpdateCompanyCategoryRequestStatusParams) (db.CompanyCategoryRequest, error) {
	panic("PartialMockQuerier: UpdateCompanyCategoryRequestStatus not configured")
}

func (m *PartialMockQuerier) DeleteCompanyServiceCategory(ctx context.Context, arg db.DeleteCompanyServiceCategoryParams) error {
	panic("PartialMockQuerier: DeleteCompanyServiceCategory not configured")
}

func (m *PartialMockQuerier) SetWorkerInvitedCategories(ctx context.Context, arg db.SetWorkerInvitedCategoriesParams) error {
	panic("PartialMockQuerier: SetWorkerInvitedCategories not configured")
}

func (m *PartialMockQuerier) GetWorkerInvitedCategories(ctx context.Context, id pgtype.UUID) ([]pgtype.UUID, error) {
	panic("PartialMockQuerier: GetWorkerInvitedCategories not configured")
}

func (m *PartialMockQuerier) ListGlobalAdmins(ctx context.Context) ([]db.User, error) {
	panic("PartialMockQuerier: ListGlobalAdmins not configured")
}
