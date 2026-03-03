package resolver

// Tests for booking mutations: CreateBookingRequest (guest validation),
// AssignWorkerToBooking (auth + business logic), and CancelBooking (auth).

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

// minimalBookingInput builds a CreateBookingInput that satisfies all date/time
// and address requirements. Use the opts to toggle guest fields.
func minimalBookingInput(opts ...func(*model.CreateBookingInput)) model.CreateBookingInput {
	tomorrow := time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	email := "guest@example.com"
	name := "Ion Popescu"
	phone := "+40700000000"
	input := model.CreateBookingInput{
		ServiceType:        model.ServiceTypeStandardCleaning,
		GuestEmail:         &email,
		GuestName:          &name,
		GuestPhone:         &phone,
		ScheduledDate:      &tomorrow,
		ScheduledStartTime: strPtr("10:00"),
		NumRooms:           2,
		NumBathrooms:       1,
		Address: &model.AddAddressInput{
			StreetAddress: "Str. Test 1",
			City:          "Bucharest",
			County:        "Ilfov",
		},
	}
	for _, o := range opts {
		o(&input)
	}
	return input
}

// ---------------------------------------------------------------------------
// CreateBookingRequest — guest validation
// ---------------------------------------------------------------------------

func TestCreateBookingRequest_GuestValidation(t *testing.T) {
	// These tests run with an anonymous (no-auth) context; the resolver checks
	// guest fields when claims == nil.

	t.Run("missing guestEmail returns validation error", func(t *testing.T) {
		input := minimalBookingInput(func(i *model.CreateBookingInput) {
			i.GuestEmail = nil
		})
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		_, err := mr.CreateBookingRequest(context.Background(), input)
		if err == nil || !strings.Contains(err.Error(), "guestEmail") {
			t.Errorf("expected guestEmail error, got %v", err)
		}
	})

	t.Run("missing guestName returns validation error", func(t *testing.T) {
		input := minimalBookingInput(func(i *model.CreateBookingInput) {
			i.GuestName = nil
		})
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		_, err := mr.CreateBookingRequest(context.Background(), input)
		if err == nil || !strings.Contains(err.Error(), "guestName") {
			t.Errorf("expected guestName error, got %v", err)
		}
	})

	t.Run("missing guestPhone returns validation error", func(t *testing.T) {
		input := minimalBookingInput(func(i *model.CreateBookingInput) {
			i.GuestPhone = nil
		})
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		_, err := mr.CreateBookingRequest(context.Background(), input)
		if err == nil || !strings.Contains(err.Error(), "guestPhone") {
			t.Errorf("expected guestPhone error, got %v", err)
		}
	})

	t.Run("missing all guest fields returns validation error", func(t *testing.T) {
		input := minimalBookingInput(func(i *model.CreateBookingInput) {
			i.GuestEmail = nil
			i.GuestName = nil
			i.GuestPhone = nil
		})
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		_, err := mr.CreateBookingRequest(context.Background(), input)
		if err == nil {
			t.Error("expected error for missing guest fields")
		}
		if !strings.Contains(err.Error(), "guest bookings require") {
			t.Errorf("unexpected error message: %v", err)
		}
	})
}

// ---------------------------------------------------------------------------
// AssignWorkerToBooking
// ---------------------------------------------------------------------------

func TestAssignWorkerToBooking(t *testing.T) {
	t.Run("nil auth returns not authenticated", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		_, err := mr.AssignWorkerToBooking(context.Background(), "booking-id", "worker-id")
		if err == nil || err.Error() != "not authenticated" {
			t.Errorf("expected 'not authenticated', got %v", err)
		}
	})

	t.Run("client role returns not authorized", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		ctx := authCtx("client", "00000000-0000-0000-0000-000000000001")
		_, err := mr.AssignWorkerToBooking(ctx, "booking-id", "worker-id")
		if err == nil || err.Error() != "not authorized" {
			t.Errorf("expected 'not authorized', got %v", err)
		}
	})

	t.Run("worker at daily limit returns daily limit error", func(t *testing.T) {
		worker := testutil.WorkerFixture(func(w *db.Worker) {
			w.MaxDailyBookings = pgtype.Int4{Int32: 3, Valid: true}
		})
		booking := testutil.BookingFixture()

		q := &testutil.PartialMockQuerier{
			GetWorkerByIDFn: func(_ context.Context, _ pgtype.UUID) (db.Worker, error) {
				return worker, nil
			},
			GetBookingByIDFn: func(_ context.Context, _ pgtype.UUID) (db.Booking, error) {
				return booking, nil
			},
			WorkerHasCategoryFn: func(_ context.Context, _ db.WorkerHasCategoryParams) (bool, error) {
				return true, nil
			},
			CountWorkerBookingsForDateFn: func(_ context.Context, _ db.CountWorkerBookingsForDateParams) (int64, error) {
				return 3, nil // at the limit
			},
		}

		mr := newMutationResolver(q)
		_, err := mr.AssignWorkerToBooking(adminCtx(), uuidToString(booking.ID), uuidToString(worker.ID))
		if err == nil || !strings.Contains(err.Error(), "daily booking limit") {
			t.Errorf("expected daily limit error, got %v", err)
		}
	})

	t.Run("worker missing required category returns qualification error", func(t *testing.T) {
		categoryID := testutil.BookingFixture().ID // a valid, non-zero UUID
		worker := testutil.WorkerFixture()
		booking := testutil.BookingFixture(func(b *db.Booking) {
			b.CategoryID = categoryID // booking requires this category
		})

		q := &testutil.PartialMockQuerier{
			GetWorkerByIDFn: func(_ context.Context, _ pgtype.UUID) (db.Worker, error) {
				return worker, nil
			},
			GetBookingByIDFn: func(_ context.Context, _ pgtype.UUID) (db.Booking, error) {
				return booking, nil
			},
			WorkerHasCategoryFn: func(_ context.Context, _ db.WorkerHasCategoryParams) (bool, error) {
				return false, nil // not qualified
			},
		}

		mr := newMutationResolver(q)
		_, err := mr.AssignWorkerToBooking(adminCtx(), uuidToString(booking.ID), uuidToString(worker.ID))
		if err == nil || !strings.Contains(err.Error(), "not qualified") {
			t.Errorf("expected qualification error, got %v", err)
		}
	})

	t.Run("company_admin cannot assign worker from different company", func(t *testing.T) {
		adminUserID := pgtype.UUID{
			Bytes: [16]byte{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1},
			Valid: true,
		}
		myCompanyID := pgtype.UUID{
			Bytes: [16]byte{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2},
			Valid: true,
		}
		otherCompanyID := pgtype.UUID{
			Bytes: [16]byte{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3},
			Valid: true,
		}
		myCompany := testutil.CompanyFixture(func(c *db.Company) {
			c.ID = myCompanyID
			c.AdminUserID = adminUserID
		})
		// Worker belongs to a different company.
		worker := testutil.WorkerFixture(func(w *db.Worker) {
			w.CompanyID = otherCompanyID
		})
		booking := testutil.BookingFixture()

		q := &testutil.PartialMockQuerier{
			GetWorkerByIDFn: func(_ context.Context, _ pgtype.UUID) (db.Worker, error) {
				return worker, nil
			},
			GetCompanyByAdminUserIDFn: func(_ context.Context, _ pgtype.UUID) (db.Company, error) {
				return myCompany, nil
			},
		}

		mr := newMutationResolver(q)
		ctx := authCtx("company_admin", uuidToString(adminUserID))
		_, err := mr.AssignWorkerToBooking(ctx, uuidToString(booking.ID), uuidToString(worker.ID))
		if err == nil || !strings.Contains(err.Error(), "does not belong to your company") {
			t.Errorf("expected company ownership error, got %v", err)
		}
	})

	t.Run("global_admin assigns worker successfully", func(t *testing.T) {
		worker := testutil.WorkerFixture()
		booking := testutil.BookingFixture()

		// assignedBooking has all optional FK UUIDs zeroed so that enrichBooking
		// skips the .Valid-gated calls (ClientUserID, WorkerID, CompanyID, AddressID).
		// Only GetServiceByType and the four unconditional calls are reached.
		assignedBooking := db.Booking{
			ID:            booking.ID,
			ReferenceCode: booking.ReferenceCode,
			ServiceType:   booking.ServiceType,
			Status:        booking.Status,
		}

		q := &testutil.PartialMockQuerier{
			GetWorkerByIDFn: func(_ context.Context, _ pgtype.UUID) (db.Worker, error) {
				return worker, nil
			},
			GetBookingByIDFn: func(_ context.Context, _ pgtype.UUID) (db.Booking, error) {
				return booking, nil
			},
			// booking.CategoryID is zero UUID (not Valid) so WorkerHasCategory
			// is skipped; we provide it anyway as a safety net.
			WorkerHasCategoryFn: func(_ context.Context, _ db.WorkerHasCategoryParams) (bool, error) {
				return true, nil
			},
			AssignWorkerToBookingFn: func(_ context.Context, _ db.AssignWorkerToBookingParams) (db.Booking, error) {
				return assignedBooking, nil
			},
			// enrichBooking calls GetServiceByType unconditionally.
			GetServiceByTypeFn: func(_ context.Context, _ db.ServiceType) (db.ServiceDefinition, error) {
				return db.ServiceDefinition{}, errors.New("not found")
			},
			// enrichBooking calls these four unconditionally (not gated by .Valid);
			// returning errors causes the if-err==nil guard to skip each body.
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
		result, err := mr.AssignWorkerToBooking(adminCtx(), uuidToString(booking.ID), uuidToString(worker.ID))
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result == nil {
			t.Fatal("expected non-nil booking")
		}
	})
}

// ---------------------------------------------------------------------------
// CancelBooking — auth check only
// ---------------------------------------------------------------------------

func TestCancelBooking_AuthCheck(t *testing.T) {
	// CancelBooking requires AuthzHelper which in turn needs *db.Queries (the
	// concrete type, not the interface). For unit tests we only verify the
	// initial auth guard, which executes before AuthzHelper is called.

	t.Run("nil auth returns not authenticated", func(t *testing.T) {
		mr := newMutationResolver(&testutil.PartialMockQuerier{})
		_, err := mr.CancelBooking(context.Background(), "booking-id", nil)
		if err == nil || err.Error() != "not authenticated" {
			t.Errorf("expected 'not authenticated', got %v", err)
		}
	})
}
