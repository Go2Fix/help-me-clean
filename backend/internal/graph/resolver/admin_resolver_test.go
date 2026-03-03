package resolver

// Tests for admin-only mutations.
// Each mutation is tested for:
//   1. nil claims → "admin access required" (or similar auth error)
//   2. company_admin claims → "admin access required"

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"

	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/graph/model"
	"go2fix-backend/internal/testutil"
)

// ---------------------------------------------------------------------------
// AdminCancelBooking
// ---------------------------------------------------------------------------

func TestAdminCancelBooking(t *testing.T) {
	t.Run("nil claims returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		_, err := mr.AdminCancelBooking(context.Background(), "some-id", "test reason")
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})

	t.Run("company_admin role returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		ctx := authCtx("company_admin", "00000000-0000-0000-0000-000000000001")
		_, err := mr.AdminCancelBooking(ctx, "some-id", "test reason")
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})

	t.Run("global_admin can cancel booking", func(t *testing.T) {
		// Use a minimal booking with all FK UUIDs zeroed so that the
		// dispatchBookingCancelledByAdmin goroutine skips all DB calls
		// (ClientUserID, CompanyID, WorkerID are all checked via .Valid).
		minimalBooking := db.Booking{
			ID:            testutil.BookingFixture().ID,
			ReferenceCode: "G2F-ADMIN-TEST",
			ServiceType:   db.ServiceTypeStandardCleaning,
			Status:        db.BookingStatusCancelledByAdmin,
		}
		q := &testutil.PartialMockQuerier{
			AdminCancelBookingWithReasonFn: func(_ context.Context, _ db.AdminCancelBookingWithReasonParams) (db.Booking, error) {
				return minimalBooking, nil
			},
		}
		mr := newMutationResolver(q)
		result, err := mr.AdminCancelBooking(adminCtx(), uuidToString(minimalBooking.ID), "admin reason")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result == nil {
			t.Fatal("expected non-nil booking")
		}
	})
}

// ---------------------------------------------------------------------------
// SuspendUser
// ---------------------------------------------------------------------------

func TestSuspendUser(t *testing.T) {
	t.Run("nil claims returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		_, err := mr.SuspendUser(context.Background(), "some-id", "reason")
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})

	t.Run("company_admin role returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		ctx := authCtx("company_admin", "00000000-0000-0000-0000-000000000001")
		_, err := mr.SuspendUser(ctx, "some-id", "reason")
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})
}

// ---------------------------------------------------------------------------
// ReactivateUser
// ---------------------------------------------------------------------------

func TestReactivateUser(t *testing.T) {
	t.Run("nil claims returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		_, err := mr.ReactivateUser(context.Background(), "some-id")
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})

	t.Run("company_admin role returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		ctx := authCtx("company_admin", "00000000-0000-0000-0000-000000000001")
		_, err := mr.ReactivateUser(ctx, "some-id")
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})
}

// ---------------------------------------------------------------------------
// DeleteReview
// ---------------------------------------------------------------------------

func TestDeleteReview(t *testing.T) {
	t.Run("nil claims returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		_, err := mr.DeleteReview(context.Background(), "some-id")
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})

	t.Run("company_admin role returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		ctx := authCtx("company_admin", "00000000-0000-0000-0000-000000000001")
		_, err := mr.DeleteReview(ctx, "some-id")
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})

	t.Run("global_admin can delete review", func(t *testing.T) {
		q := &testutil.PartialMockQuerier{
			DeleteReviewFn: func(_ context.Context, _ pgtype.UUID) error {
				return nil
			},
		}
		mr := newMutationResolver(q)
		ok, err := mr.DeleteReview(adminCtx(), "00000000-0000-0000-0000-000000000001")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !ok {
			t.Error("expected ok=true")
		}
	})
}

// ---------------------------------------------------------------------------
// ApproveReview
// ---------------------------------------------------------------------------

func TestApproveReview(t *testing.T) {
	t.Run("nil claims returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		_, err := mr.ApproveReview(context.Background(), "some-id")
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})

	t.Run("company_admin role returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		ctx := authCtx("company_admin", "00000000-0000-0000-0000-000000000001")
		_, err := mr.ApproveReview(ctx, "some-id")
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})
}

// ---------------------------------------------------------------------------
// RejectReview
// ---------------------------------------------------------------------------

func TestRejectReview(t *testing.T) {
	t.Run("nil claims returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		_, err := mr.RejectReview(context.Background(), "some-id")
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})

	t.Run("company_admin role returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		ctx := authCtx("company_admin", "00000000-0000-0000-0000-000000000001")
		_, err := mr.RejectReview(ctx, "some-id")
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})
}

// ---------------------------------------------------------------------------
// RejectCompany
// ---------------------------------------------------------------------------

func TestRejectCompany(t *testing.T) {
	t.Run("nil claims returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		_, err := mr.RejectCompany(context.Background(), "some-id", "too incomplete")
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})

	t.Run("company_admin role returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		ctx := authCtx("company_admin", "00000000-0000-0000-0000-000000000001")
		_, err := mr.RejectCompany(ctx, "some-id", "too incomplete")
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})
}

// ---------------------------------------------------------------------------
// SuspendCompany
// ---------------------------------------------------------------------------

func TestSuspendCompany(t *testing.T) {
	t.Run("nil claims returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		_, err := mr.SuspendCompany(context.Background(), "some-id", "violation")
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})

	t.Run("company_admin role returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		ctx := authCtx("company_admin", "00000000-0000-0000-0000-000000000001")
		_, err := mr.SuspendCompany(ctx, "some-id", "violation")
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})
}

// ---------------------------------------------------------------------------
// AdminUpdateCompanyProfile
// ---------------------------------------------------------------------------

func TestAdminUpdateCompanyProfile(t *testing.T) {
	input := model.AdminUpdateCompanyInput{
		ID:           "00000000-0000-0000-0000-000000000001",
		CompanyName:  "Updated SRL",
		Cui:          "RO99999999",
		Address:      "Str. Test 1",
		ContactPhone: "+40700000001",
		ContactEmail: "updated@example.com",
	}

	t.Run("nil claims returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		_, err := mr.AdminUpdateCompanyProfile(context.Background(), input)
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})

	t.Run("company_admin role returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		ctx := authCtx("company_admin", "00000000-0000-0000-0000-000000000001")
		_, err := mr.AdminUpdateCompanyProfile(ctx, input)
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})
}

// ---------------------------------------------------------------------------
// AdminUpdateCompanyStatus
// ---------------------------------------------------------------------------

func TestAdminUpdateCompanyStatus(t *testing.T) {
	t.Run("nil claims returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		_, err := mr.AdminUpdateCompanyStatus(context.Background(), "some-id", model.CompanyStatusApproved)
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})

	t.Run("company_admin role returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		ctx := authCtx("company_admin", "00000000-0000-0000-0000-000000000001")
		_, err := mr.AdminUpdateCompanyStatus(ctx, "some-id", model.CompanyStatusApproved)
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})

	t.Run("global_admin can update company status", func(t *testing.T) {
		company := testutil.CompanyFixture()
		q := &testutil.PartialMockQuerier{
			UpdateCompanyStatusFn: func(_ context.Context, _ db.UpdateCompanyStatusParams) (db.Company, error) {
				return company, nil
			},
		}
		mr := newMutationResolver(q)
		result, err := mr.AdminUpdateCompanyStatus(adminCtx(), uuidToString(company.ID), model.CompanyStatusApproved)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result == nil {
			t.Fatal("expected non-nil company")
		}
	})
}
