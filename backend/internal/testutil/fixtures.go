package testutil

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"go2fix-backend/internal/auth"
	db "go2fix-backend/internal/db/generated"
)

// randomUUID generates a random valid pgtype.UUID.
func randomUUID() pgtype.UUID {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		// fallback: use hex of a predictable counter
		h := hex.EncodeToString([]byte(fmt.Sprintf("%032d", time.Now().UnixNano())))
		copy(b[:], []byte(h)[:16])
	}
	return pgtype.UUID{Bytes: b, Valid: true}
}

// float64ToNumeric converts a float64 to pgtype.Numeric using Scan.
func float64ToNumeric(f float64) pgtype.Numeric {
	var n pgtype.Numeric
	_ = n.Scan(fmt.Sprintf("%f", f))
	return n
}

// PromoCodeFixture returns a db.PromoCode populated with sensible test defaults.
// Pass functional options to override individual fields.
func PromoCodeFixture(opts ...func(*db.PromoCode)) db.PromoCode {
	p := db.PromoCode{
		ID:             randomUUID(),
		Code:           "TEST10",
		DiscountType:   "percent",
		DiscountValue:  float64ToNumeric(10),
		MinOrderAmount: float64ToNumeric(0),
		MaxUses:        pgtype.Int4{}, // unlimited by default
		UsesCount:      0,
		MaxUsesPerUser: 1,
		IsActive:       true,
		ActiveFrom:     pgtype.Timestamptz{Time: time.Now().Add(-time.Hour), Valid: true},
		ActiveUntil:    pgtype.Timestamptz{}, // no expiry by default
		CreatedBy:      randomUUID(),
		CreatedAt:      pgtype.Timestamptz{Time: time.Now(), Valid: true},
		UpdatedAt:      pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	for _, o := range opts {
		o(&p)
	}
	return p
}

// BookingFixture returns a db.Booking with sensible test defaults.
func BookingFixture(opts ...func(*db.Booking)) db.Booking {
	b := db.Booking{
		ID:                     randomUUID(),
		ReferenceCode:          "G2F-123456",
		ClientUserID:           randomUUID(),
		ServiceType:            db.ServiceTypeStandardCleaning,
		ScheduledDate:          pgtype.Date{Time: time.Now().AddDate(0, 0, 3), Valid: true},
		ScheduledStartTime:     pgtype.Time{Microseconds: 10 * 3_600_000_000, Valid: true}, // 10:00
		EstimatedDurationHours: float64ToNumeric(2),
		HourlyRate:             float64ToNumeric(50),
		EstimatedTotal:         float64ToNumeric(100),
		PlatformCommissionPct:  float64ToNumeric(25),
		Status:                 db.BookingStatusAssigned,
		PaymentStatus:          pgtype.Text{String: "pending", Valid: true},
		RescheduleCount:        0,
		CreatedAt:              pgtype.Timestamptz{Time: time.Now(), Valid: true},
		UpdatedAt:              pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	for _, o := range opts {
		o(&b)
	}
	return b
}

// WorkerFixture returns a db.Worker with sensible test defaults.
func WorkerFixture(opts ...func(*db.Worker)) db.Worker {
	w := db.Worker{
		ID:        randomUUID(),
		UserID:    randomUUID(),
		CompanyID: randomUUID(),
		Status:    db.WorkerStatusActive,
		IsCompanyAdmin: pgtype.Bool{Bool: false, Valid: true},
		RatingAvg:          pgtype.Numeric{},
		TotalJobsCompleted: pgtype.Int4{Int32: 0, Valid: true},
		MaxDailyBookings:   pgtype.Int4{}, // no limit by default
		CreatedAt:          pgtype.Timestamptz{Time: time.Now(), Valid: true},
		UpdatedAt:          pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	for _, o := range opts {
		o(&w)
	}
	return w
}

// UserFixture returns a db.User with sensible test defaults.
func UserFixture(opts ...func(*db.User)) db.User {
	u := db.User{
		ID:                randomUUID(),
		Email:             "test@example.com",
		FullName:          "Test User",
		Phone:             pgtype.Text{String: "+40700000000", Valid: true},
		Role:              db.UserRoleClient,
		Status:            db.UserStatusActive,
		PhoneVerified:     false,
		PreferredLanguage: pgtype.Text{String: "ro", Valid: true},
		CreatedAt:         pgtype.Timestamptz{Time: time.Now(), Valid: true},
		UpdatedAt:         pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	for _, o := range opts {
		o(&u)
	}
	return u
}

// CompanyFixture returns a db.Company with sensible test defaults.
func CompanyFixture(opts ...func(*db.Company)) db.Company {
	c := db.Company{
		ID:                  randomUUID(),
		CompanyName:         "Test Company SRL",
		Cui:                 "RO12345678",
		CompanyType:         db.CompanyTypeSrl,
		LegalRepresentative: "Ion Popescu",
		ContactEmail:        "company@example.com",
		ContactPhone:        "+40700000001",
		Address:             "Str. Exemplu 1",
		City:                "Bucharest",
		County:              "Ilfov",
		Status:              db.CompanyStatusApproved,
		IsVatPayer:          false,
		CreatedAt:           pgtype.Timestamptz{Time: time.Now(), Valid: true},
		UpdatedAt:           pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	for _, o := range opts {
		o(&c)
	}
	return c
}

// ReviewFixture returns a db.Review with sensible test defaults.
func ReviewFixture(opts ...func(*db.Review)) db.Review {
	r := db.Review{
		ID:         randomUUID(),
		BookingID:  randomUUID(),
		Rating:     5,
		ReviewType: "client_to_worker",
		Status:     "pending",
		CreatedAt:  pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	for _, o := range opts {
		o(&r)
	}
	return r
}

// AuthClaims builds an auth.Claims for use in test contexts.
func AuthClaims(role, userID string) *auth.Claims {
	return &auth.Claims{
		Role:   role,
		UserID: userID,
	}
}
