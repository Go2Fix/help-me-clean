package resolver

// Tests for promo-code resolvers (ValidatePromoCode, ApplyPromoCodeToBooking,
// CreatePromoCode, UpdatePromoCode).
//
// These tests run entirely in-process with a PartialMockQuerier; no database
// or network is required.

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/graph/model"
	"go2fix-backend/internal/testutil"
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// newMutationResolver wraps a Resolver as a mutationResolver so we can call
// mutation methods directly.
func newMutationResolver(q db.Querier) *mutationResolver {
	r := &Resolver{Queries: q}
	return &mutationResolver{r}
}

func newQueryResolver(q db.Querier) *queryResolver {
	r := &Resolver{Queries: q}
	return &queryResolver{r}
}

// authCtx returns a context with the given role / userID embedded.
func authCtx(role, userID string) context.Context {
	return testutil.AuthContext(role, userID)
}

// adminCtx is shorthand for a global_admin context.
func adminCtx() context.Context {
	return authCtx("global_admin", "00000000-0000-0000-0000-000000000001")
}

// clientCtx is shorthand for a client context whose userID matches the UUID
// embedded in the booking fixture.
func clientCtxWith(userID pgtype.UUID) context.Context {
	return authCtx("client", uuidToString(userID))
}

// ---------------------------------------------------------------------------
// ValidatePromoCode
// ---------------------------------------------------------------------------

func TestValidatePromoCode(t *testing.T) {
	t.Run("inactive code returns valid=false", func(t *testing.T) {
		promo := testutil.PromoCodeFixture(func(p *db.PromoCode) {
			p.IsActive = false
		})
		q := &testutil.PartialMockQuerier{
			GetPromoCodeByCodeFn: func(_ context.Context, _ interface{}) (db.PromoCode, error) {
				return promo, nil
			},
		}
		qr := newQueryResolver(q)
		result, err := qr.ValidatePromoCode(context.Background(), "TEST10", 100)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Valid {
			t.Error("expected valid=false for inactive code")
		}
		if result.ErrorMessage == nil || *result.ErrorMessage == "" {
			t.Error("expected a non-empty ErrorMessage")
		}
	})

	t.Run("expired code returns valid=false", func(t *testing.T) {
		promo := testutil.PromoCodeFixture(func(p *db.PromoCode) {
			expired := time.Now().Add(-24 * time.Hour)
			p.ActiveUntil = pgtype.Timestamptz{Time: expired, Valid: true}
		})
		q := &testutil.PartialMockQuerier{
			GetPromoCodeByCodeFn: func(_ context.Context, _ interface{}) (db.PromoCode, error) {
				return promo, nil
			},
		}
		qr := newQueryResolver(q)
		result, err := qr.ValidatePromoCode(context.Background(), "TEST10", 100)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Valid {
			t.Error("expected valid=false for expired code")
		}
	})

	t.Run("max uses exhausted returns valid=false", func(t *testing.T) {
		promo := testutil.PromoCodeFixture(func(p *db.PromoCode) {
			p.MaxUses = pgtype.Int4{Int32: 5, Valid: true}
			p.UsesCount = 5
		})
		q := &testutil.PartialMockQuerier{
			GetPromoCodeByCodeFn: func(_ context.Context, _ interface{}) (db.PromoCode, error) {
				return promo, nil
			},
		}
		qr := newQueryResolver(q)
		result, err := qr.ValidatePromoCode(context.Background(), "TEST10", 100)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Valid {
			t.Error("expected valid=false when max uses exhausted")
		}
	})

	t.Run("order below minimum amount returns valid=false", func(t *testing.T) {
		promo := testutil.PromoCodeFixture(func(p *db.PromoCode) {
			p.MinOrderAmount = float64ToNumeric(200)
		})
		q := &testutil.PartialMockQuerier{
			GetPromoCodeByCodeFn: func(_ context.Context, _ interface{}) (db.PromoCode, error) {
				return promo, nil
			},
		}
		qr := newQueryResolver(q)
		result, err := qr.ValidatePromoCode(context.Background(), "TEST10", 100)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Valid {
			t.Error("expected valid=false when order is below minimum")
		}
	})

	t.Run("active percent code returns valid=true with discount", func(t *testing.T) {
		promo := testutil.PromoCodeFixture() // 10% off, no min order
		q := &testutil.PartialMockQuerier{
			GetPromoCodeByCodeFn: func(_ context.Context, _ interface{}) (db.PromoCode, error) {
				return promo, nil
			},
		}
		qr := newQueryResolver(q)
		result, err := qr.ValidatePromoCode(context.Background(), "TEST10", 100)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !result.Valid {
			t.Errorf("expected valid=true; errorMessage=%v", result.ErrorMessage)
		}
		if result.DiscountAmount != 10 {
			t.Errorf("expected discount=10, got %f", result.DiscountAmount)
		}
	})

	t.Run("unknown code returns valid=false without error", func(t *testing.T) {
		q := &testutil.PartialMockQuerier{
			GetPromoCodeByCodeFn: func(_ context.Context, _ interface{}) (db.PromoCode, error) {
				return db.PromoCode{}, errors.New("no rows")
			},
		}
		qr := newQueryResolver(q)
		result, err := qr.ValidatePromoCode(context.Background(), "NOTEXIST", 100)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Valid {
			t.Error("expected valid=false for unknown code")
		}
	})
}

// ---------------------------------------------------------------------------
// ApplyPromoCodeToBooking
// ---------------------------------------------------------------------------

func TestApplyPromoCodeToBooking(t *testing.T) {
	t.Run("nil auth returns not authenticated error", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		_, err := mr.ApplyPromoCodeToBooking(context.Background(), "some-booking-id", "TEST10")
		if err == nil || err.Error() != "not authenticated" {
			t.Errorf("expected 'not authenticated', got %v", err)
		}
	})

	t.Run("booking not owned by caller returns error", func(t *testing.T) {
		booking := testutil.BookingFixture() // ClientUserID is a random UUID
		q := &testutil.PartialMockQuerier{
			GetBookingByIDFn: func(_ context.Context, _ pgtype.UUID) (db.Booking, error) {
				return booking, nil
			},
		}
		mr := newMutationResolver(q)
		// Use a different userID than the booking owner
		ctx := authCtx("client", "00000000-0000-0000-0000-000000000002")
		_, err := mr.ApplyPromoCodeToBooking(ctx, uuidToString(booking.ID), "TEST10")
		if err == nil || err.Error() != "booking does not belong to you" {
			t.Errorf("expected ownership error, got %v", err)
		}
	})

	t.Run("per-user limit exceeded returns error", func(t *testing.T) {
		clientID := testutil.PromoCodeFixture().CreatedBy // reuse a random UUID
		// Create booking owned by this client
		booking := testutil.BookingFixture(func(b *db.Booking) {
			b.ClientUserID = clientID
		})
		promo := testutil.PromoCodeFixture(func(p *db.PromoCode) {
			p.MaxUsesPerUser = 1
		})
		q := &testutil.PartialMockQuerier{
			GetBookingByIDFn: func(_ context.Context, _ pgtype.UUID) (db.Booking, error) {
				return booking, nil
			},
			GetPromoCodeByCodeFn: func(_ context.Context, _ interface{}) (db.PromoCode, error) {
				return promo, nil
			},
			CountPromoCodeUsesByUserFn: func(_ context.Context, _ db.CountPromoCodeUsesByUserParams) (int64, error) {
				return 1, nil // already used once
			},
		}
		mr := newMutationResolver(q)
		ctx := clientCtxWith(clientID)
		_, err := mr.ApplyPromoCodeToBooking(ctx, uuidToString(booking.ID), "TEST10")
		if err == nil || !strings.Contains(err.Error(), "limita") {
			t.Errorf("expected per-user limit error, got %v", err)
		}
	})

	t.Run("success path applies promo and returns updated booking", func(t *testing.T) {
		clientID := testutil.PromoCodeFixture().CreatedBy
		booking := testutil.BookingFixture(func(b *db.Booking) {
			b.ClientUserID = clientID
			b.EstimatedTotal = float64ToNumeric(100)
		})
		promo := testutil.PromoCodeFixture() // 10% off, MaxUsesPerUser=1

		// updatedBooking has all optional foreign key UUIDs zeroed so that
		// enrichBooking skips every secondary DB call (AddressID, ClientUserID,
		// CompanyID, WorkerID are all checked via .Valid before fetching).
		updatedBooking := db.Booking{
			ID:            booking.ID,
			ReferenceCode: booking.ReferenceCode,
			ServiceType:   booking.ServiceType,
			Status:        booking.Status,
			PromoCodeID:   promo.ID,
		}

		q := &testutil.PartialMockQuerier{
			GetBookingByIDFn: func(_ context.Context, _ pgtype.UUID) (db.Booking, error) {
				return booking, nil
			},
			GetPromoCodeByCodeFn: func(_ context.Context, _ interface{}) (db.PromoCode, error) {
				return promo, nil
			},
			CountPromoCodeUsesByUserFn: func(_ context.Context, _ db.CountPromoCodeUsesByUserParams) (int64, error) {
				return 0, nil
			},
			ApplyPromoCodeToBookingFn: func(_ context.Context, _ db.ApplyPromoCodeToBookingParams) (db.Booking, error) {
				return updatedBooking, nil
			},
			CreatePromoCodeUseFn: func(_ context.Context, _ db.CreatePromoCodeUseParams) (db.PromoCodeUse, error) {
				return db.PromoCodeUse{}, nil
			},
			IncrementPromoCodeUsesFn: func(_ context.Context, _ pgtype.UUID) (db.PromoCode, error) {
				return promo, nil
			},
			// enrichBooking calls GetServiceByType for the service name.
			GetServiceByTypeFn: func(_ context.Context, _ db.ServiceType) (db.ServiceDefinition, error) {
				return db.ServiceDefinition{}, errors.New("not found")
			},
			// enrichBooking calls these unconditionally (not gated by .Valid);
			// returning an error causes the if-err==nil guard to skip the body.
			ListBookingTimeSlotsFn: func(_ context.Context, _ pgtype.UUID) ([]db.BookingTimeSlot, error) {
				return nil, errors.New("no rows")
			},
			GetReviewByBookingIDFn: func(_ context.Context, _ pgtype.UUID) (db.Review, error) {
				return db.Review{}, errors.New("no rows")
			},
			ListJobPhotosByBookingFn: func(_ context.Context, _ pgtype.UUID) ([]db.BookingJobPhoto, error) {
				return nil, errors.New("no rows")
			},
			ListBookingExtrasFn: func(_ context.Context, _ pgtype.UUID) ([]db.ListBookingExtrasRow, error) {
				return nil, errors.New("no rows")
			},
		}
		mr := newMutationResolver(q)
		ctx := clientCtxWith(clientID)
		result, err := mr.ApplyPromoCodeToBooking(ctx, uuidToString(booking.ID), "TEST10")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result == nil {
			t.Fatal("expected non-nil booking result")
		}
	})
}

// ---------------------------------------------------------------------------
// CreatePromoCode
// ---------------------------------------------------------------------------

func TestCreatePromoCode(t *testing.T) {
	validInput := model.CreatePromoCodeInput{
		Code:          "SAVE20",
		DiscountType:  "percent",
		DiscountValue: 20,
	}

	t.Run("nil claims returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		_, err := mr.CreatePromoCode(context.Background(), validInput)
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})

	t.Run("non-admin role returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		ctx := authCtx("company_admin", "00000000-0000-0000-0000-000000000001")
		_, err := mr.CreatePromoCode(ctx, validInput)
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})

	t.Run("global_admin creates promo code successfully", func(t *testing.T) {
		created := testutil.PromoCodeFixture(func(p *db.PromoCode) {
			p.Code = "SAVE20"
			p.DiscountType = "percent"
		})
		q := &testutil.PartialMockQuerier{
			CreatePromoCodeFn: func(_ context.Context, _ db.CreatePromoCodeParams) (db.PromoCode, error) {
				return created, nil
			},
		}
		mr := newMutationResolver(q)
		result, err := mr.CreatePromoCode(adminCtx(), validInput)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result == nil || result.Code != "SAVE20" {
			t.Errorf("unexpected result: %+v", result)
		}
	})

	t.Run("invalid discount type returns validation error", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		input := model.CreatePromoCodeInput{
			Code:          "BAD",
			DiscountType:  "invalid_type",
			DiscountValue: 10,
		}
		_, err := mr.CreatePromoCode(adminCtx(), input)
		if err == nil || !strings.Contains(err.Error(), "discountType") {
			t.Errorf("expected discountType validation error, got %v", err)
		}
	})

	t.Run("zero discount value returns validation error", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		input := model.CreatePromoCodeInput{
			Code:          "ZERO",
			DiscountType:  "percent",
			DiscountValue: 0,
		}
		_, err := mr.CreatePromoCode(adminCtx(), input)
		if err == nil || !strings.Contains(err.Error(), "discountValue") {
			t.Errorf("expected discountValue validation error, got %v", err)
		}
	})

	t.Run("percent discount over 100 returns validation error", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		input := model.CreatePromoCodeInput{
			Code:          "OVER",
			DiscountType:  "percent",
			DiscountValue: 150,
		}
		_, err := mr.CreatePromoCode(adminCtx(), input)
		if err == nil || !strings.Contains(err.Error(), "100") {
			t.Errorf("expected percent>100 error, got %v", err)
		}
	})
}

// ---------------------------------------------------------------------------
// UpdatePromoCode
// ---------------------------------------------------------------------------

func TestUpdatePromoCode(t *testing.T) {
	t.Run("nil claims returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		_, err := mr.UpdatePromoCode(context.Background(), "some-id", model.UpdatePromoCodeInput{})
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})

	t.Run("non-admin role returns admin access required", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		ctx := authCtx("client", "00000000-0000-0000-0000-000000000001")
		_, err := mr.UpdatePromoCode(ctx, "some-id", model.UpdatePromoCodeInput{})
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})

	t.Run("global_admin can update promo code", func(t *testing.T) {
		existing := testutil.PromoCodeFixture()
		updated := existing
		newIsActive := false

		q := &testutil.PartialMockQuerier{
			GetPromoCodeByIDFn: func(_ context.Context, _ pgtype.UUID) (db.PromoCode, error) {
				return existing, nil
			},
			UpdatePromoCodeFn: func(_ context.Context, _ db.UpdatePromoCodeParams) (db.PromoCode, error) {
				updated.IsActive = false
				return updated, nil
			},
		}
		mr := newMutationResolver(q)
		result, err := mr.UpdatePromoCode(adminCtx(), uuidToString(existing.ID), model.UpdatePromoCodeInput{
			IsActive: &newIsActive,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.IsActive {
			t.Error("expected IsActive=false after update")
		}
	})

	t.Run("invalid discount type in update returns validation error", func(t *testing.T) {
		existing := testutil.PromoCodeFixture()
		q := &testutil.PartialMockQuerier{
			GetPromoCodeByIDFn: func(_ context.Context, _ pgtype.UUID) (db.PromoCode, error) {
				return existing, nil
			},
		}
		mr := newMutationResolver(q)
		badType := "bad_type"
		_, err := mr.UpdatePromoCode(adminCtx(), uuidToString(existing.ID), model.UpdatePromoCodeInput{
			DiscountType: &badType,
		})
		if err == nil || !strings.Contains(err.Error(), "discountType") {
			t.Errorf("expected discountType validation error, got %v", err)
		}
	})
}

// ---------------------------------------------------------------------------
// ListPromoCodes
// ---------------------------------------------------------------------------

func TestListPromoCodes(t *testing.T) {
	t.Run("nil claims returns admin access required", func(t *testing.T) {
		qr := newQueryResolver(&testutil.PartialMockQuerier{})
		_, err := qr.ListPromoCodes(context.Background(), nil, nil)
		if err == nil || err.Error() != "admin access required" {
			t.Errorf("expected 'admin access required', got %v", err)
		}
	})

	t.Run("global_admin can list promo codes", func(t *testing.T) {
		rows := []db.PromoCode{testutil.PromoCodeFixture()}
		q := &testutil.PartialMockQuerier{
			ListPromoCodesFn: func(_ context.Context, _ db.ListPromoCodesParams) ([]db.PromoCode, error) {
				return rows, nil
			},
			CountAllPromoCodesFn: func(_ context.Context) (int64, error) {
				return 1, nil
			},
		}
		qr := newQueryResolver(q)
		result, err := qr.ListPromoCodes(adminCtx(), nil, nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.TotalCount != 1 {
			t.Errorf("expected TotalCount=1, got %d", result.TotalCount)
		}
	})
}

// validatePromoCodeActive is internal to the resolver package — test it directly.
func TestValidatePromoCodeActive(t *testing.T) {
	t.Run("active code with no expiry returns true", func(t *testing.T) {
		p := testutil.PromoCodeFixture()
		ok, msg := validatePromoCodeActive(p)
		if !ok {
			t.Errorf("expected ok=true, got msg=%q", msg)
		}
	})

	t.Run("inactive code returns false", func(t *testing.T) {
		p := testutil.PromoCodeFixture(func(p *db.PromoCode) { p.IsActive = false })
		ok, _ := validatePromoCodeActive(p)
		if ok {
			t.Error("expected ok=false for inactive code")
		}
	})

	t.Run("future start date returns false", func(t *testing.T) {
		p := testutil.PromoCodeFixture(func(p *db.PromoCode) {
			p.ActiveFrom = pgtype.Timestamptz{Time: time.Now().Add(time.Hour), Valid: true}
		})
		ok, _ := validatePromoCodeActive(p)
		if ok {
			t.Error("expected ok=false for future start date")
		}
	})

	t.Run("past expiry returns false", func(t *testing.T) {
		p := testutil.PromoCodeFixture(func(p *db.PromoCode) {
			p.ActiveUntil = pgtype.Timestamptz{Time: time.Now().Add(-time.Hour), Valid: true}
		})
		ok, _ := validatePromoCodeActive(p)
		if ok {
			t.Error("expected ok=false for expired code")
		}
	})
}
