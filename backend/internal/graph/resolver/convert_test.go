package resolver

import (
	"math"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/graph/model"
)

// ---------------------------------------------------------------------------
// UUID helpers
// ---------------------------------------------------------------------------

func TestUuidToString(t *testing.T) {
	t.Run("valid UUID converts to standard format", func(t *testing.T) {
		// UUID: 550e8400-e29b-41d4-a716-446655440000
		b := [16]byte{
			0x55, 0x0e, 0x84, 0x00,
			0xe2, 0x9b,
			0x41, 0xd4,
			0xa7, 0x16,
			0x44, 0x66, 0x55, 0x44, 0x00, 0x00,
		}
		u := pgtype.UUID{Bytes: b, Valid: true}
		result := uuidToString(u)
		expected := "550e8400-e29b-41d4-a716-446655440000"
		if result != expected {
			t.Errorf("expected %q, got %q", expected, result)
		}
	})

	t.Run("invalid UUID returns empty string", func(t *testing.T) {
		u := pgtype.UUID{Valid: false}
		result := uuidToString(u)
		if result != "" {
			t.Errorf("expected empty string, got %q", result)
		}
	})

	t.Run("zero UUID returns zero-formatted string", func(t *testing.T) {
		u := pgtype.UUID{Bytes: [16]byte{}, Valid: true}
		result := uuidToString(u)
		expected := "00000000-0000-0000-0000-000000000000"
		if result != expected {
			t.Errorf("expected %q, got %q", expected, result)
		}
	})

	t.Run("all-ff UUID", func(t *testing.T) {
		var b [16]byte
		for i := range b {
			b[i] = 0xff
		}
		u := pgtype.UUID{Bytes: b, Valid: true}
		result := uuidToString(u)
		expected := "ffffffff-ffff-ffff-ffff-ffffffffffff"
		if result != expected {
			t.Errorf("expected %q, got %q", expected, result)
		}
	})
}

func TestStringToUUID(t *testing.T) {
	t.Run("valid UUID string with dashes", func(t *testing.T) {
		result := stringToUUID("550e8400-e29b-41d4-a716-446655440000")
		if !result.Valid {
			t.Fatal("expected Valid=true")
		}
		expected := [16]byte{
			0x55, 0x0e, 0x84, 0x00,
			0xe2, 0x9b,
			0x41, 0xd4,
			0xa7, 0x16,
			0x44, 0x66, 0x55, 0x44, 0x00, 0x00,
		}
		if result.Bytes != expected {
			t.Errorf("expected bytes %v, got %v", expected, result.Bytes)
		}
	})

	t.Run("round trip: stringToUUID then uuidToString", func(t *testing.T) {
		input := "abcdef01-2345-6789-abcd-ef0123456789"
		u := stringToUUID(input)
		if !u.Valid {
			t.Fatal("expected Valid=true")
		}
		output := uuidToString(u)
		if output != input {
			t.Errorf("round trip failed: input %q, output %q", input, output)
		}
	})

	t.Run("too short string returns invalid UUID", func(t *testing.T) {
		result := stringToUUID("abc")
		if result.Valid {
			t.Error("expected Valid=false for too short string")
		}
	})

	t.Run("empty string returns invalid UUID", func(t *testing.T) {
		result := stringToUUID("")
		if result.Valid {
			t.Error("expected Valid=false for empty string")
		}
	})

	t.Run("non-hex characters return invalid UUID", func(t *testing.T) {
		result := stringToUUID("zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz")
		if result.Valid {
			t.Error("expected Valid=false for non-hex characters")
		}
	})

	t.Run("UUID without dashes (32 hex chars)", func(t *testing.T) {
		result := stringToUUID("550e8400e29b41d4a716446655440000")
		if !result.Valid {
			t.Fatal("expected Valid=true for 32 hex chars without dashes")
		}
		str := uuidToString(result)
		if str != "550e8400-e29b-41d4-a716-446655440000" {
			t.Errorf("unexpected output %q", str)
		}
	})
}

// ---------------------------------------------------------------------------
// Nullable helpers
// ---------------------------------------------------------------------------

func TestTextPtr(t *testing.T) {
	t.Run("valid text returns pointer", func(t *testing.T) {
		text := pgtype.Text{String: "hello", Valid: true}
		result := textPtr(text)
		if result == nil {
			t.Fatal("expected non-nil pointer")
		}
		if *result != "hello" {
			t.Errorf("expected 'hello', got %q", *result)
		}
	})

	t.Run("invalid text returns nil", func(t *testing.T) {
		text := pgtype.Text{Valid: false}
		result := textPtr(text)
		if result != nil {
			t.Errorf("expected nil, got %q", *result)
		}
	})

	t.Run("valid text with empty string returns pointer to empty string", func(t *testing.T) {
		text := pgtype.Text{String: "", Valid: true}
		result := textPtr(text)
		if result == nil {
			t.Fatal("expected non-nil pointer for valid empty string")
		}
		if *result != "" {
			t.Errorf("expected empty string, got %q", *result)
		}
	})
}

func TestTextVal(t *testing.T) {
	t.Run("valid text returns string value", func(t *testing.T) {
		text := pgtype.Text{String: "world", Valid: true}
		result := textVal(text)
		if result != "world" {
			t.Errorf("expected 'world', got %q", result)
		}
	})

	t.Run("invalid text returns empty string", func(t *testing.T) {
		text := pgtype.Text{String: "ignored", Valid: false}
		result := textVal(text)
		if result != "" {
			t.Errorf("expected empty string, got %q", result)
		}
	})
}

func TestInt4Ptr(t *testing.T) {
	t.Run("valid int returns pointer", func(t *testing.T) {
		i := pgtype.Int4{Int32: 42, Valid: true}
		result := int4Ptr(i)
		if result == nil {
			t.Fatal("expected non-nil pointer")
		}
		if *result != 42 {
			t.Errorf("expected 42, got %d", *result)
		}
	})

	t.Run("invalid int returns nil", func(t *testing.T) {
		i := pgtype.Int4{Valid: false}
		result := int4Ptr(i)
		if result != nil {
			t.Errorf("expected nil, got %d", *result)
		}
	})

	t.Run("zero value valid int returns pointer to zero", func(t *testing.T) {
		i := pgtype.Int4{Int32: 0, Valid: true}
		result := int4Ptr(i)
		if result == nil {
			t.Fatal("expected non-nil pointer for zero")
		}
		if *result != 0 {
			t.Errorf("expected 0, got %d", *result)
		}
	})

	t.Run("negative value", func(t *testing.T) {
		i := pgtype.Int4{Int32: -10, Valid: true}
		result := int4Ptr(i)
		if result == nil {
			t.Fatal("expected non-nil pointer")
		}
		if *result != -10 {
			t.Errorf("expected -10, got %d", *result)
		}
	})
}

func TestInt4Val(t *testing.T) {
	t.Run("valid int returns value", func(t *testing.T) {
		i := pgtype.Int4{Int32: 99, Valid: true}
		result := int4Val(i)
		if result != 99 {
			t.Errorf("expected 99, got %d", result)
		}
	})

	t.Run("invalid int returns 0", func(t *testing.T) {
		i := pgtype.Int4{Int32: 99, Valid: false}
		result := int4Val(i)
		if result != 0 {
			t.Errorf("expected 0, got %d", result)
		}
	})
}

func TestBoolPtr(t *testing.T) {
	t.Run("valid true returns pointer to true", func(t *testing.T) {
		b := pgtype.Bool{Bool: true, Valid: true}
		result := boolPtr(b)
		if result == nil {
			t.Fatal("expected non-nil pointer")
		}
		if *result != true {
			t.Errorf("expected true, got %v", *result)
		}
	})

	t.Run("valid false returns pointer to false", func(t *testing.T) {
		b := pgtype.Bool{Bool: false, Valid: true}
		result := boolPtr(b)
		if result == nil {
			t.Fatal("expected non-nil pointer")
		}
		if *result != false {
			t.Errorf("expected false, got %v", *result)
		}
	})

	t.Run("invalid returns nil", func(t *testing.T) {
		b := pgtype.Bool{Valid: false}
		result := boolPtr(b)
		if result != nil {
			t.Errorf("expected nil, got %v", *result)
		}
	})
}

func TestBoolVal(t *testing.T) {
	t.Run("valid true returns true", func(t *testing.T) {
		b := pgtype.Bool{Bool: true, Valid: true}
		if boolVal(b) != true {
			t.Error("expected true")
		}
	})

	t.Run("valid false returns false", func(t *testing.T) {
		b := pgtype.Bool{Bool: false, Valid: true}
		if boolVal(b) != false {
			t.Error("expected false")
		}
	})

	t.Run("invalid returns false", func(t *testing.T) {
		b := pgtype.Bool{Bool: true, Valid: false}
		if boolVal(b) != false {
			t.Error("expected false for invalid")
		}
	})
}

func TestFloat8Ptr(t *testing.T) {
	t.Run("valid float returns pointer", func(t *testing.T) {
		f := pgtype.Float8{Float64: 3.14, Valid: true}
		result := float8Ptr(f)
		if result == nil {
			t.Fatal("expected non-nil pointer")
		}
		if math.Abs(*result-3.14) > 0.001 {
			t.Errorf("expected 3.14, got %f", *result)
		}
	})

	t.Run("invalid float returns nil", func(t *testing.T) {
		f := pgtype.Float8{Valid: false}
		result := float8Ptr(f)
		if result != nil {
			t.Errorf("expected nil, got %f", *result)
		}
	})

	t.Run("zero valid float returns pointer to zero", func(t *testing.T) {
		f := pgtype.Float8{Float64: 0, Valid: true}
		result := float8Ptr(f)
		if result == nil {
			t.Fatal("expected non-nil pointer for zero")
		}
		if *result != 0 {
			t.Errorf("expected 0, got %f", *result)
		}
	})
}

func TestNumericToFloat(t *testing.T) {
	t.Run("invalid numeric returns 0", func(t *testing.T) {
		n := pgtype.Numeric{Valid: false}
		result := numericToFloat(n)
		if result != 0 {
			t.Errorf("expected 0, got %f", result)
		}
	})

	t.Run("valid numeric with scanned value", func(t *testing.T) {
		var n pgtype.Numeric
		err := n.Scan("42.50")
		if err != nil {
			t.Fatalf("failed to scan numeric: %v", err)
		}
		result := numericToFloat(n)
		if math.Abs(result-42.50) > 0.01 {
			t.Errorf("expected 42.50, got %f", result)
		}
	})

	t.Run("zero numeric", func(t *testing.T) {
		var n pgtype.Numeric
		err := n.Scan("0")
		if err != nil {
			t.Fatalf("failed to scan numeric: %v", err)
		}
		result := numericToFloat(n)
		if result != 0 {
			t.Errorf("expected 0, got %f", result)
		}
	})
}

// ---------------------------------------------------------------------------
// Timestamp helpers
// ---------------------------------------------------------------------------

func TestTimestamptzToTime(t *testing.T) {
	t.Run("valid timestamp returns time", func(t *testing.T) {
		now := time.Now().UTC()
		ts := pgtype.Timestamptz{Time: now, Valid: true}
		result := timestamptzToTime(ts)
		if !result.Equal(now) {
			t.Errorf("expected %v, got %v", now, result)
		}
	})

	t.Run("invalid timestamp returns zero time", func(t *testing.T) {
		ts := pgtype.Timestamptz{Valid: false}
		result := timestamptzToTime(ts)
		if !result.IsZero() {
			t.Errorf("expected zero time, got %v", result)
		}
	})
}

func TestTimestamptzToTimePtr(t *testing.T) {
	t.Run("valid timestamp returns pointer", func(t *testing.T) {
		now := time.Now().UTC()
		ts := pgtype.Timestamptz{Time: now, Valid: true}
		result := timestamptzToTimePtr(ts)
		if result == nil {
			t.Fatal("expected non-nil pointer")
		}
		if !result.Equal(now) {
			t.Errorf("expected %v, got %v", now, *result)
		}
	})

	t.Run("invalid timestamp returns nil", func(t *testing.T) {
		ts := pgtype.Timestamptz{Valid: false}
		result := timestamptzToTimePtr(ts)
		if result != nil {
			t.Errorf("expected nil, got %v", *result)
		}
	})
}

// ---------------------------------------------------------------------------
// Date and time helpers
// ---------------------------------------------------------------------------

func TestDateToString(t *testing.T) {
	t.Run("valid date formats correctly", func(t *testing.T) {
		d := pgtype.Date{Time: time.Date(2025, 3, 15, 0, 0, 0, 0, time.UTC), Valid: true}
		result := dateToString(d)
		if result != "2025-03-15" {
			t.Errorf("expected '2025-03-15', got %q", result)
		}
	})

	t.Run("invalid date returns empty string", func(t *testing.T) {
		d := pgtype.Date{Valid: false}
		result := dateToString(d)
		if result != "" {
			t.Errorf("expected empty string, got %q", result)
		}
	})
}

func TestTimeToString(t *testing.T) {
	t.Run("valid time formats as HH:MM", func(t *testing.T) {
		tests := []struct {
			name         string
			microseconds int64
			expected     string
		}{
			{"midnight", 0, "00:00"},
			{"9:30 AM", 9*3_600_000_000 + 30*60_000_000, "09:30"},
			{"2:45 PM", 14*3_600_000_000 + 45*60_000_000, "14:45"},
			{"11:59 PM", 23*3_600_000_000 + 59*60_000_000, "23:59"},
			{"noon", 12 * 3_600_000_000, "12:00"},
		}

		for _, tc := range tests {
			t.Run(tc.name, func(t *testing.T) {
				pgTime := pgtype.Time{Microseconds: tc.microseconds, Valid: true}
				result := timeToString(pgTime)
				if result != tc.expected {
					t.Errorf("expected %q, got %q", tc.expected, result)
				}
			})
		}
	})

	t.Run("invalid time returns empty string", func(t *testing.T) {
		pgTime := pgtype.Time{Valid: false}
		result := timeToString(pgTime)
		if result != "" {
			t.Errorf("expected empty string, got %q", result)
		}
	})
}

// ---------------------------------------------------------------------------
// String/Text conversion helpers
// ---------------------------------------------------------------------------

func TestStringToText(t *testing.T) {
	t.Run("non-nil string returns valid Text", func(t *testing.T) {
		s := "hello"
		result := stringToText(&s)
		if !result.Valid {
			t.Fatal("expected Valid=true")
		}
		if result.String != "hello" {
			t.Errorf("expected 'hello', got %q", result.String)
		}
	})

	t.Run("nil returns invalid Text", func(t *testing.T) {
		result := stringToText(nil)
		if result.Valid {
			t.Error("expected Valid=false for nil")
		}
	})

	t.Run("pointer to empty string returns valid Text", func(t *testing.T) {
		s := ""
		result := stringToText(&s)
		if !result.Valid {
			t.Fatal("expected Valid=true for empty string pointer")
		}
		if result.String != "" {
			t.Errorf("expected empty string, got %q", result.String)
		}
	})
}

func TestStringToTextVal(t *testing.T) {
	t.Run("returns valid Text with string value", func(t *testing.T) {
		result := stringToTextVal("test")
		if !result.Valid {
			t.Fatal("expected Valid=true")
		}
		if result.String != "test" {
			t.Errorf("expected 'test', got %q", result.String)
		}
	})

	t.Run("empty string returns valid Text", func(t *testing.T) {
		result := stringToTextVal("")
		if !result.Valid {
			t.Fatal("expected Valid=true")
		}
		if result.String != "" {
			t.Errorf("expected empty string, got %q", result.String)
		}
	})
}

func TestPgTextEmpty(t *testing.T) {
	t.Run("returns invalid Text", func(t *testing.T) {
		result := pgTextEmpty()
		if result.Valid {
			t.Error("expected Valid=false")
		}
		if result.String != "" {
			t.Errorf("expected empty String, got %q", result.String)
		}
	})
}

// ---------------------------------------------------------------------------
// Int conversion helpers
// ---------------------------------------------------------------------------

func TestIntToInt4(t *testing.T) {
	t.Run("non-nil int returns valid Int4", func(t *testing.T) {
		v := 100
		result := intToInt4(&v)
		if !result.Valid {
			t.Fatal("expected Valid=true")
		}
		if result.Int32 != 100 {
			t.Errorf("expected 100, got %d", result.Int32)
		}
	})

	t.Run("nil returns invalid Int4", func(t *testing.T) {
		result := intToInt4(nil)
		if result.Valid {
			t.Error("expected Valid=false for nil")
		}
	})
}

func TestIntToInt4Val(t *testing.T) {
	t.Run("converts int to valid Int4", func(t *testing.T) {
		result := intToInt4Val(55)
		if !result.Valid {
			t.Fatal("expected Valid=true")
		}
		if result.Int32 != 55 {
			t.Errorf("expected 55, got %d", result.Int32)
		}
	})
}

// ---------------------------------------------------------------------------
// Bool and float conversion helpers
// ---------------------------------------------------------------------------

func TestBoolToPgBool(t *testing.T) {
	t.Run("non-nil true returns valid Bool", func(t *testing.T) {
		v := true
		result := boolToPgBool(&v)
		if !result.Valid {
			t.Fatal("expected Valid=true")
		}
		if result.Bool != true {
			t.Error("expected true")
		}
	})

	t.Run("non-nil false returns valid Bool", func(t *testing.T) {
		v := false
		result := boolToPgBool(&v)
		if !result.Valid {
			t.Fatal("expected Valid=true")
		}
		if result.Bool != false {
			t.Error("expected false")
		}
	})

	t.Run("nil returns invalid Bool", func(t *testing.T) {
		result := boolToPgBool(nil)
		if result.Valid {
			t.Error("expected Valid=false for nil")
		}
	})
}

func TestFloat64PtrToFloat8(t *testing.T) {
	t.Run("non-nil float returns valid Float8", func(t *testing.T) {
		v := 9.99
		result := float64PtrToFloat8(&v)
		if !result.Valid {
			t.Fatal("expected Valid=true")
		}
		if math.Abs(result.Float64-9.99) > 0.001 {
			t.Errorf("expected 9.99, got %f", result.Float64)
		}
	})

	t.Run("nil returns invalid Float8", func(t *testing.T) {
		result := float64PtrToFloat8(nil)
		if result.Valid {
			t.Error("expected Valid=false for nil")
		}
	})
}

// ---------------------------------------------------------------------------
// Enum conversions: DB (lowercase) <-> GQL (UPPERCASE)
// ---------------------------------------------------------------------------

func TestDbUserRoleToGQL(t *testing.T) {
	tests := []struct {
		db  db.UserRole
		gql model.UserRole
	}{
		{db.UserRoleClient, model.UserRoleClient},
		{db.UserRoleCompanyAdmin, model.UserRoleCompanyAdmin},
		{db.UserRoleWorker, model.UserRoleWorker},
		{db.UserRoleGlobalAdmin, model.UserRoleGlobalAdmin},
	}

	for _, tc := range tests {
		t.Run(string(tc.db), func(t *testing.T) {
			result := dbUserRoleToGQL(tc.db)
			if result != tc.gql {
				t.Errorf("expected %q, got %q", tc.gql, result)
			}
		})
	}
}

func TestGqlUserRoleToDb(t *testing.T) {
	tests := []struct {
		gql model.UserRole
		db  db.UserRole
	}{
		{model.UserRoleClient, db.UserRoleClient},
		{model.UserRoleCompanyAdmin, db.UserRoleCompanyAdmin},
		{model.UserRoleWorker, db.UserRoleWorker},
		{model.UserRoleGlobalAdmin, db.UserRoleGlobalAdmin},
	}

	for _, tc := range tests {
		t.Run(string(tc.gql), func(t *testing.T) {
			result := gqlUserRoleToDb(tc.gql)
			if result != tc.db {
				t.Errorf("expected %q, got %q", tc.db, result)
			}
		})
	}
}

func TestUserRoleRoundTrip(t *testing.T) {
	for _, role := range []db.UserRole{
		db.UserRoleClient, db.UserRoleCompanyAdmin,
		db.UserRoleWorker, db.UserRoleGlobalAdmin,
	} {
		t.Run(string(role), func(t *testing.T) {
			gql := dbUserRoleToGQL(role)
			back := gqlUserRoleToDb(gql)
			if back != role {
				t.Errorf("round trip failed: %q -> %q -> %q", role, gql, back)
			}
		})
	}
}

func TestDbBookingStatusToGQL(t *testing.T) {
	tests := []struct {
		db  db.BookingStatus
		gql model.BookingStatus
	}{
		{db.BookingStatusAssigned, model.BookingStatusAssigned},
		{db.BookingStatusConfirmed, model.BookingStatusConfirmed},
		{db.BookingStatusInProgress, model.BookingStatusInProgress},
		{db.BookingStatusCompleted, model.BookingStatusCompleted},
		{db.BookingStatusCancelledByClient, model.BookingStatusCancelledByClient},
		{db.BookingStatusCancelledByCompany, model.BookingStatusCancelledByCompany},
		{db.BookingStatusCancelledByAdmin, model.BookingStatusCancelledByAdmin},
	}

	for _, tc := range tests {
		t.Run(string(tc.db), func(t *testing.T) {
			result := dbBookingStatusToGQL(tc.db)
			if result != tc.gql {
				t.Errorf("expected %q, got %q", tc.gql, result)
			}
		})
	}
}

func TestGqlBookingStatusToDb(t *testing.T) {
	tests := []struct {
		gql model.BookingStatus
		db  db.BookingStatus
	}{
		{model.BookingStatusAssigned, db.BookingStatusAssigned},
		{model.BookingStatusConfirmed, db.BookingStatusConfirmed},
		{model.BookingStatusInProgress, db.BookingStatusInProgress},
		{model.BookingStatusCompleted, db.BookingStatusCompleted},
		{model.BookingStatusCancelledByClient, db.BookingStatusCancelledByClient},
		{model.BookingStatusCancelledByCompany, db.BookingStatusCancelledByCompany},
		{model.BookingStatusCancelledByAdmin, db.BookingStatusCancelledByAdmin},
	}

	for _, tc := range tests {
		t.Run(string(tc.gql), func(t *testing.T) {
			result := gqlBookingStatusToDb(tc.gql)
			if result != tc.db {
				t.Errorf("expected %q, got %q", tc.db, result)
			}
		})
	}
}

func TestDbServiceTypeToGQL(t *testing.T) {
	tests := []struct {
		db  db.ServiceType
		gql model.ServiceType
	}{
		{db.ServiceTypeStandardCleaning, model.ServiceTypeStandardCleaning},
		{db.ServiceTypeDeepCleaning, model.ServiceTypeDeepCleaning},
		{db.ServiceTypeMoveInOutCleaning, model.ServiceTypeMoveInOutCleaning},
		{db.ServiceTypePostConstruction, model.ServiceTypePostConstruction},
		{db.ServiceTypeOfficeCleaning, model.ServiceTypeOfficeCleaning},
		{db.ServiceTypeWindowCleaning, model.ServiceTypeWindowCleaning},
	}

	for _, tc := range tests {
		t.Run(string(tc.db), func(t *testing.T) {
			result := dbServiceTypeToGQL(tc.db)
			if result != tc.gql {
				t.Errorf("expected %q, got %q", tc.gql, result)
			}
		})
	}
}

func TestGqlServiceTypeToDb(t *testing.T) {
	tests := []struct {
		gql model.ServiceType
		db  db.ServiceType
	}{
		{model.ServiceTypeStandardCleaning, db.ServiceTypeStandardCleaning},
		{model.ServiceTypeDeepCleaning, db.ServiceTypeDeepCleaning},
		{model.ServiceTypeMoveInOutCleaning, db.ServiceTypeMoveInOutCleaning},
		{model.ServiceTypePostConstruction, db.ServiceTypePostConstruction},
		{model.ServiceTypeOfficeCleaning, db.ServiceTypeOfficeCleaning},
		{model.ServiceTypeWindowCleaning, db.ServiceTypeWindowCleaning},
	}

	for _, tc := range tests {
		t.Run(string(tc.gql), func(t *testing.T) {
			result := gqlServiceTypeToDb(tc.gql)
			if result != tc.db {
				t.Errorf("expected %q, got %q", tc.db, result)
			}
		})
	}
}

func TestServiceTypeRoundTrip(t *testing.T) {
	for _, st := range []db.ServiceType{
		db.ServiceTypeStandardCleaning, db.ServiceTypeDeepCleaning,
		db.ServiceTypeMoveInOutCleaning, db.ServiceTypePostConstruction,
		db.ServiceTypeOfficeCleaning, db.ServiceTypeWindowCleaning,
	} {
		t.Run(string(st), func(t *testing.T) {
			gql := dbServiceTypeToGQL(st)
			back := gqlServiceTypeToDb(gql)
			if back != st {
				t.Errorf("round trip failed: %q -> %q -> %q", st, gql, back)
			}
		})
	}
}

func TestDbCompanyStatusToGQL(t *testing.T) {
	tests := []struct {
		db  db.CompanyStatus
		gql model.CompanyStatus
	}{
		{db.CompanyStatusPendingReview, model.CompanyStatusPendingReview},
		{db.CompanyStatusApproved, model.CompanyStatusApproved},
		{db.CompanyStatusRejected, model.CompanyStatusRejected},
		{db.CompanyStatusSuspended, model.CompanyStatusSuspended},
	}

	for _, tc := range tests {
		t.Run(string(tc.db), func(t *testing.T) {
			result := dbCompanyStatusToGQL(tc.db)
			if result != tc.gql {
				t.Errorf("expected %q, got %q", tc.gql, result)
			}
		})
	}
}

func TestGqlCompanyStatusToDb(t *testing.T) {
	tests := []struct {
		gql model.CompanyStatus
		db  db.CompanyStatus
	}{
		{model.CompanyStatusPendingReview, db.CompanyStatusPendingReview},
		{model.CompanyStatusApproved, db.CompanyStatusApproved},
		{model.CompanyStatusRejected, db.CompanyStatusRejected},
		{model.CompanyStatusSuspended, db.CompanyStatusSuspended},
	}

	for _, tc := range tests {
		t.Run(string(tc.gql), func(t *testing.T) {
			result := gqlCompanyStatusToDb(tc.gql)
			if result != tc.db {
				t.Errorf("expected %q, got %q", tc.db, result)
			}
		})
	}
}

func TestDbCompanyTypeToGQL(t *testing.T) {
	tests := []struct {
		db  db.CompanyType
		gql model.CompanyType
	}{
		{db.CompanyTypeSrl, model.CompanyTypeSrl},
		{db.CompanyTypePfa, model.CompanyTypePfa},
		{db.CompanyTypeIi, model.CompanyTypeIi},
	}

	for _, tc := range tests {
		t.Run(string(tc.db), func(t *testing.T) {
			result := dbCompanyTypeToGQL(tc.db)
			if result != tc.gql {
				t.Errorf("expected %q, got %q", tc.gql, result)
			}
		})
	}
}

func TestGqlCompanyTypeToDb(t *testing.T) {
	tests := []struct {
		gql model.CompanyType
		db  db.CompanyType
	}{
		{model.CompanyTypeSrl, db.CompanyTypeSrl},
		{model.CompanyTypePfa, db.CompanyTypePfa},
		{model.CompanyTypeIi, db.CompanyTypeIi},
	}

	for _, tc := range tests {
		t.Run(string(tc.gql), func(t *testing.T) {
			result := gqlCompanyTypeToDb(tc.gql)
			if result != tc.db {
				t.Errorf("expected %q, got %q", tc.db, result)
			}
		})
	}
}

func TestDbWorkerStatusToGQL(t *testing.T) {
	tests := []struct {
		db  db.WorkerStatus
		gql model.WorkerStatus
	}{
		{db.WorkerStatusInvited, model.WorkerStatusInvited},
		{db.WorkerStatusActive, model.WorkerStatusActive},
		{db.WorkerStatusInactive, model.WorkerStatusInactive},
		{db.WorkerStatusSuspended, model.WorkerStatusSuspended},
	}

	for _, tc := range tests {
		t.Run(string(tc.db), func(t *testing.T) {
			result := dbWorkerStatusToGQL(tc.db)
			if result != tc.gql {
				t.Errorf("expected %q, got %q", tc.gql, result)
			}
		})
	}
}

func TestGqlWorkerStatusToDb(t *testing.T) {
	tests := []struct {
		gql model.WorkerStatus
		db  db.WorkerStatus
	}{
		{model.WorkerStatusInvited, db.WorkerStatusInvited},
		{model.WorkerStatusActive, db.WorkerStatusActive},
		{model.WorkerStatusInactive, db.WorkerStatusInactive},
		{model.WorkerStatusSuspended, db.WorkerStatusSuspended},
	}

	for _, tc := range tests {
		t.Run(string(tc.gql), func(t *testing.T) {
			result := gqlWorkerStatusToDb(tc.gql)
			if result != tc.db {
				t.Errorf("expected %q, got %q", tc.db, result)
			}
		})
	}
}

func TestDbUserStatusToGQL(t *testing.T) {
	tests := []struct {
		db  db.UserStatus
		gql model.UserStatus
	}{
		{db.UserStatusActive, model.UserStatusActive},
		{db.UserStatusInactive, model.UserStatusInactive},
		{db.UserStatusSuspended, model.UserStatusSuspended},
		{db.UserStatusPending, model.UserStatusPending},
	}

	for _, tc := range tests {
		t.Run(string(tc.db), func(t *testing.T) {
			result := dbUserStatusToGQL(tc.db)
			if result != tc.gql {
				t.Errorf("expected %q, got %q", tc.gql, result)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Model converters
// ---------------------------------------------------------------------------

// makeUUID is a test helper that creates a pgtype.UUID from a byte value.
func makeUUID(fill byte) pgtype.UUID {
	var b [16]byte
	for i := range b {
		b[i] = fill
	}
	return pgtype.UUID{Bytes: b, Valid: true}
}

func makeTimestamptz(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: t, Valid: true}
}

func makeText(s string) pgtype.Text {
	return pgtype.Text{String: s, Valid: true}
}

func makeNumeric(val string) pgtype.Numeric {
	var n pgtype.Numeric
	n.Scan(val)
	return n
}

func TestDbUserToGQL(t *testing.T) {
	t.Run("converts full user with all fields", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Microsecond)
		phone := "1234567890"
		avatar := "https://example.com/avatar.jpg"

		dbUser := db.User{
			ID:                makeUUID(0xAA),
			Email:             "test@example.com",
			FullName:          "Test User",
			Phone:             pgtype.Text{String: phone, Valid: true},
			AvatarUrl:         pgtype.Text{String: avatar, Valid: true},
			Role:              db.UserRoleClient,
			Status:            db.UserStatusActive,
			PreferredLanguage: makeText("en"),
			CreatedAt:         makeTimestamptz(now),
		}

		result := dbUserToGQL(dbUser)

		if result == nil {
			t.Fatal("expected non-nil result")
		}
		expectedID := uuidToString(makeUUID(0xAA))
		if result.ID != expectedID {
			t.Errorf("expected ID %q, got %q", expectedID, result.ID)
		}
		if result.Email != "test@example.com" {
			t.Errorf("expected Email 'test@example.com', got %q", result.Email)
		}
		if result.FullName != "Test User" {
			t.Errorf("expected FullName 'Test User', got %q", result.FullName)
		}
		if result.Phone == nil || *result.Phone != phone {
			t.Errorf("expected Phone %q, got %v", phone, result.Phone)
		}
		if result.AvatarURL == nil || *result.AvatarURL != avatar {
			t.Errorf("expected AvatarURL %q, got %v", avatar, result.AvatarURL)
		}
		if result.Role != model.UserRoleClient {
			t.Errorf("expected Role CLIENT, got %q", result.Role)
		}
		if result.Status != model.UserStatusActive {
			t.Errorf("expected Status ACTIVE, got %q", result.Status)
		}
		if result.PreferredLanguage != "en" {
			t.Errorf("expected PreferredLanguage 'en', got %q", result.PreferredLanguage)
		}
		if !result.CreatedAt.Equal(now) {
			t.Errorf("expected CreatedAt %v, got %v", now, result.CreatedAt)
		}
	})

	t.Run("converts user with nil optional fields", func(t *testing.T) {
		dbUser := db.User{
			ID:                makeUUID(0xBB),
			Email:             "minimal@example.com",
			FullName:          "Minimal User",
			Phone:             pgtype.Text{Valid: false},
			AvatarUrl:         pgtype.Text{Valid: false},
			Role:              db.UserRoleGlobalAdmin,
			Status:            db.UserStatusPending,
			PreferredLanguage: pgtype.Text{Valid: false},
			CreatedAt:         pgtype.Timestamptz{Valid: false},
		}

		result := dbUserToGQL(dbUser)

		if result.Phone != nil {
			t.Errorf("expected nil Phone, got %q", *result.Phone)
		}
		if result.AvatarURL != nil {
			t.Errorf("expected nil AvatarURL, got %q", *result.AvatarURL)
		}
		if result.PreferredLanguage != "" {
			t.Errorf("expected empty PreferredLanguage, got %q", result.PreferredLanguage)
		}
		if result.Role != model.UserRoleGlobalAdmin {
			t.Errorf("expected Role GLOBAL_ADMIN, got %q", result.Role)
		}
		if result.Status != model.UserStatusPending {
			t.Errorf("expected Status PENDING, got %q", result.Status)
		}
	})
}

func TestDbBookingToGQL(t *testing.T) {
	t.Run("converts full booking with all fields populated", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Microsecond)
		startedAt := now.Add(-2 * time.Hour)
		completedAt := now.Add(-1 * time.Hour)

		dbBooking := db.Booking{
			ID:                     makeUUID(0x11),
			ReferenceCode:          "G2F-2025-001",
			ServiceType:            db.ServiceTypeDeepCleaning,
			ScheduledDate:          pgtype.Date{Time: time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC), Valid: true},
			ScheduledStartTime:     pgtype.Time{Microseconds: 10 * 3_600_000_000, Valid: true}, // 10:00
			EstimatedDurationHours: makeNumeric("3.5"),
			PropertyType:           makeText("apartment"),
			NumRooms:               pgtype.Int4{Int32: 3, Valid: true},
			NumBathrooms:           pgtype.Int4{Int32: 2, Valid: true},
			AreaSqm:                pgtype.Int4{Int32: 80, Valid: true},
			HasPets:                pgtype.Bool{Bool: true, Valid: true},
			SpecialInstructions:    makeText("Ring bell twice"),
			HourlyRate:             makeNumeric("50.00"),
			EstimatedTotal:         makeNumeric("175.00"),
			FinalTotal:             makeNumeric("180.00"),
			PlatformCommissionPct:  makeNumeric("15.00"),
			Status:                 db.BookingStatusCompleted,
			StartedAt:              makeTimestamptz(startedAt),
			CompletedAt:            makeTimestamptz(completedAt),
			CancelledAt:            pgtype.Timestamptz{Valid: false},
			CancellationReason:     pgtype.Text{Valid: false},
			PaymentStatus:          makeText("paid"),
			PaidAt:                 makeTimestamptz(now),
			CreatedAt:              makeTimestamptz(now),
		}

		result := dbBookingToGQL(dbBooking)

		if result == nil {
			t.Fatal("expected non-nil result")
		}

		expectedID := uuidToString(makeUUID(0x11))
		if result.ID != expectedID {
			t.Errorf("expected ID %q, got %q", expectedID, result.ID)
		}
		if result.ReferenceCode != "G2F-2025-001" {
			t.Errorf("expected ReferenceCode 'G2F-2025-001', got %q", result.ReferenceCode)
		}
		if result.ServiceType != model.ServiceTypeDeepCleaning {
			t.Errorf("expected ServiceType DEEP_CLEANING, got %q", result.ServiceType)
		}
		if result.ScheduledDate != "2025-06-15" {
			t.Errorf("expected ScheduledDate '2025-06-15', got %q", result.ScheduledDate)
		}
		if result.ScheduledStartTime != "10:00" {
			t.Errorf("expected ScheduledStartTime '10:00', got %q", result.ScheduledStartTime)
		}
		if math.Abs(result.EstimatedDurationHours-3.5) > 0.01 {
			t.Errorf("expected EstimatedDurationHours 3.5, got %f", result.EstimatedDurationHours)
		}
		if result.PropertyType == nil || *result.PropertyType != "apartment" {
			t.Errorf("expected PropertyType 'apartment', got %v", result.PropertyType)
		}
		if result.NumRooms == nil || *result.NumRooms != 3 {
			t.Errorf("expected NumRooms 3, got %v", result.NumRooms)
		}
		if result.NumBathrooms == nil || *result.NumBathrooms != 2 {
			t.Errorf("expected NumBathrooms 2, got %v", result.NumBathrooms)
		}
		if result.AreaSqm == nil || *result.AreaSqm != 80 {
			t.Errorf("expected AreaSqm 80, got %v", result.AreaSqm)
		}
		if result.HasPets == nil || *result.HasPets != true {
			t.Errorf("expected HasPets true, got %v", result.HasPets)
		}
		if result.SpecialInstructions == nil || *result.SpecialInstructions != "Ring bell twice" {
			t.Errorf("expected SpecialInstructions 'Ring bell twice', got %v", result.SpecialInstructions)
		}
		if math.Abs(result.HourlyRate-50.00) > 0.01 {
			t.Errorf("expected HourlyRate 50.00, got %f", result.HourlyRate)
		}
		if math.Abs(result.EstimatedTotal-175.00) > 0.01 {
			t.Errorf("expected EstimatedTotal 175.00, got %f", result.EstimatedTotal)
		}
		if result.FinalTotal == nil || math.Abs(*result.FinalTotal-180.00) > 0.01 {
			t.Errorf("expected FinalTotal 180.00, got %v", result.FinalTotal)
		}
		if math.Abs(result.PlatformCommissionPct-15.00) > 0.01 {
			t.Errorf("expected PlatformCommissionPct 15.00, got %f", result.PlatformCommissionPct)
		}
		if result.Status != model.BookingStatusCompleted {
			t.Errorf("expected Status COMPLETED, got %q", result.Status)
		}
		if result.StartedAt == nil || !result.StartedAt.Equal(startedAt) {
			t.Errorf("expected StartedAt %v, got %v", startedAt, result.StartedAt)
		}
		if result.CompletedAt == nil || !result.CompletedAt.Equal(completedAt) {
			t.Errorf("expected CompletedAt %v, got %v", completedAt, result.CompletedAt)
		}
		if result.CancelledAt != nil {
			t.Errorf("expected nil CancelledAt, got %v", result.CancelledAt)
		}
		if result.CancellationReason != nil {
			t.Errorf("expected nil CancellationReason, got %v", result.CancellationReason)
		}
		if result.PaymentStatus != "paid" {
			t.Errorf("expected PaymentStatus 'paid', got %q", result.PaymentStatus)
		}
		if result.PaidAt == nil || !result.PaidAt.Equal(now) {
			t.Errorf("expected PaidAt %v, got %v", now, result.PaidAt)
		}
	})

	t.Run("defaults payment status to pending when empty", func(t *testing.T) {
		dbBooking := db.Booking{
			ID:            makeUUID(0x22),
			ReferenceCode: "G2F-2025-002",
			ServiceType:   db.ServiceTypeStandardCleaning,
			PaymentStatus: pgtype.Text{Valid: false},
			Status:        db.BookingStatusConfirmed,
			CreatedAt:     makeTimestamptz(time.Now().UTC()),
		}

		result := dbBookingToGQL(dbBooking)

		if result.PaymentStatus != "pending" {
			t.Errorf("expected PaymentStatus 'pending', got %q", result.PaymentStatus)
		}
	})

	t.Run("defaults payment status to pending when empty string", func(t *testing.T) {
		dbBooking := db.Booking{
			ID:            makeUUID(0x33),
			ReferenceCode: "G2F-2025-003",
			ServiceType:   db.ServiceTypeStandardCleaning,
			PaymentStatus: pgtype.Text{String: "", Valid: true},
			Status:        db.BookingStatusConfirmed,
			CreatedAt:     makeTimestamptz(time.Now().UTC()),
		}

		result := dbBookingToGQL(dbBooking)

		if result.PaymentStatus != "pending" {
			t.Errorf("expected PaymentStatus 'pending' for empty string, got %q", result.PaymentStatus)
		}
	})

	t.Run("nil FinalTotal is preserved as nil", func(t *testing.T) {
		dbBooking := db.Booking{
			ID:            makeUUID(0x44),
			ReferenceCode: "G2F-2025-004",
			ServiceType:   db.ServiceTypeStandardCleaning,
			FinalTotal:    pgtype.Numeric{Valid: false},
			Status:        db.BookingStatusConfirmed,
			PaymentStatus: makeText("pending"),
			CreatedAt:     makeTimestamptz(time.Now().UTC()),
		}

		result := dbBookingToGQL(dbBooking)

		if result.FinalTotal != nil {
			t.Errorf("expected nil FinalTotal, got %v", *result.FinalTotal)
		}
	})

	t.Run("minimal booking with zero/invalid optional fields", func(t *testing.T) {
		dbBooking := db.Booking{
			ID:                     makeUUID(0x55),
			ReferenceCode:          "G2F-2025-005",
			ServiceType:            db.ServiceTypeOfficeCleaning,
			ScheduledDate:          pgtype.Date{Valid: false},
			ScheduledStartTime:     pgtype.Time{Valid: false},
			EstimatedDurationHours: pgtype.Numeric{Valid: false},
			PropertyType:           pgtype.Text{Valid: false},
			NumRooms:               pgtype.Int4{Valid: false},
			NumBathrooms:           pgtype.Int4{Valid: false},
			AreaSqm:                pgtype.Int4{Valid: false},
			HasPets:                pgtype.Bool{Valid: false},
			SpecialInstructions:    pgtype.Text{Valid: false},
			HourlyRate:             pgtype.Numeric{Valid: false},
			EstimatedTotal:         pgtype.Numeric{Valid: false},
			FinalTotal:             pgtype.Numeric{Valid: false},
			PlatformCommissionPct:  pgtype.Numeric{Valid: false},
			Status:                 db.BookingStatusConfirmed,
			StartedAt:              pgtype.Timestamptz{Valid: false},
			CompletedAt:            pgtype.Timestamptz{Valid: false},
			CancelledAt:            pgtype.Timestamptz{Valid: false},
			CancellationReason:     pgtype.Text{Valid: false},
			PaymentStatus:          pgtype.Text{Valid: false},
			PaidAt:                 pgtype.Timestamptz{Valid: false},
			CreatedAt:              pgtype.Timestamptz{Valid: false},
		}

		result := dbBookingToGQL(dbBooking)

		if result.ScheduledDate != "" {
			t.Errorf("expected empty ScheduledDate, got %q", result.ScheduledDate)
		}
		if result.ScheduledStartTime != "" {
			t.Errorf("expected empty ScheduledStartTime, got %q", result.ScheduledStartTime)
		}
		if result.PropertyType != nil {
			t.Errorf("expected nil PropertyType, got %v", result.PropertyType)
		}
		if result.NumRooms != nil {
			t.Errorf("expected nil NumRooms, got %v", result.NumRooms)
		}
		if result.NumBathrooms != nil {
			t.Errorf("expected nil NumBathrooms, got %v", result.NumBathrooms)
		}
		if result.AreaSqm != nil {
			t.Errorf("expected nil AreaSqm, got %v", result.AreaSqm)
		}
		if result.HasPets != nil {
			t.Errorf("expected nil HasPets, got %v", result.HasPets)
		}
		if result.SpecialInstructions != nil {
			t.Errorf("expected nil SpecialInstructions, got %v", result.SpecialInstructions)
		}
		if result.FinalTotal != nil {
			t.Errorf("expected nil FinalTotal, got %v", result.FinalTotal)
		}
		if result.StartedAt != nil {
			t.Errorf("expected nil StartedAt, got %v", result.StartedAt)
		}
		if result.CompletedAt != nil {
			t.Errorf("expected nil CompletedAt, got %v", result.CompletedAt)
		}
		if result.CancelledAt != nil {
			t.Errorf("expected nil CancelledAt, got %v", result.CancelledAt)
		}
		if result.CancellationReason != nil {
			t.Errorf("expected nil CancellationReason, got %v", result.CancellationReason)
		}
		if result.PaidAt != nil {
			t.Errorf("expected nil PaidAt, got %v", result.PaidAt)
		}
	})
}

func TestDbCompanyToGQL(t *testing.T) {
	t.Run("converts full company with all fields", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Microsecond)
		desc := "A cleaning company"
		logo := "https://example.com/logo.png"

		dbCompany := db.Company{
			ID:                  makeUUID(0xCC),
			CompanyName:         "CleanCo SRL",
			Cui:                 "RO12345678",
			CompanyType:         db.CompanyTypeSrl,
			LegalRepresentative: "John Doe",
			ContactEmail:        "contact@cleanco.com",
			ContactPhone:        "+40712345678",
			Address:             "Str. Curatenie 42",
			City:                "Bucharest",
			County:              "Bucharest",
			Description:         pgtype.Text{String: desc, Valid: true},
			LogoUrl:             pgtype.Text{String: logo, Valid: true},
			Status:              db.CompanyStatusApproved,
			RejectionReason:     pgtype.Text{Valid: false},
			MaxServiceRadiusKm:  pgtype.Int4{Int32: 25, Valid: true},
			RatingAvg:           makeNumeric("4.75"),
			TotalJobsCompleted:  pgtype.Int4{Int32: 150, Valid: true},
			CreatedAt:           makeTimestamptz(now),
		}

		result := dbCompanyToGQL(dbCompany)

		if result == nil {
			t.Fatal("expected non-nil result")
		}

		expectedID := uuidToString(makeUUID(0xCC))
		if result.ID != expectedID {
			t.Errorf("expected ID %q, got %q", expectedID, result.ID)
		}
		if result.CompanyName != "CleanCo SRL" {
			t.Errorf("expected CompanyName 'CleanCo SRL', got %q", result.CompanyName)
		}
		if result.Cui != "RO12345678" {
			t.Errorf("expected Cui 'RO12345678', got %q", result.Cui)
		}
		if result.CompanyType != model.CompanyTypeSrl {
			t.Errorf("expected CompanyType SRL, got %q", result.CompanyType)
		}
		if result.LegalRepresentative != "John Doe" {
			t.Errorf("expected LegalRepresentative 'John Doe', got %q", result.LegalRepresentative)
		}
		if result.ContactEmail != "contact@cleanco.com" {
			t.Errorf("expected ContactEmail 'contact@cleanco.com', got %q", result.ContactEmail)
		}
		if result.ContactPhone != "+40712345678" {
			t.Errorf("expected ContactPhone '+40712345678', got %q", result.ContactPhone)
		}
		if result.Address != "Str. Curatenie 42" {
			t.Errorf("expected Address 'Str. Curatenie 42', got %q", result.Address)
		}
		if result.City != "Bucharest" {
			t.Errorf("expected City 'Bucharest', got %q", result.City)
		}
		if result.County != "Bucharest" {
			t.Errorf("expected County 'Bucharest', got %q", result.County)
		}
		if result.Description == nil || *result.Description != desc {
			t.Errorf("expected Description %q, got %v", desc, result.Description)
		}
		if result.LogoURL == nil || *result.LogoURL != logo {
			t.Errorf("expected LogoURL %q, got %v", logo, result.LogoURL)
		}
		if result.Status != model.CompanyStatusApproved {
			t.Errorf("expected Status APPROVED, got %q", result.Status)
		}
		if result.RejectionReason != nil {
			t.Errorf("expected nil RejectionReason, got %v", result.RejectionReason)
		}
		if result.MaxServiceRadiusKm != 25 {
			t.Errorf("expected MaxServiceRadiusKm 25, got %d", result.MaxServiceRadiusKm)
		}
		if math.Abs(result.RatingAvg-4.75) > 0.01 {
			t.Errorf("expected RatingAvg 4.75, got %f", result.RatingAvg)
		}
		if result.TotalJobsCompleted != 150 {
			t.Errorf("expected TotalJobsCompleted 150, got %d", result.TotalJobsCompleted)
		}
		if !result.CreatedAt.Equal(now) {
			t.Errorf("expected CreatedAt %v, got %v", now, result.CreatedAt)
		}
	})

	t.Run("company with nil optional fields", func(t *testing.T) {
		dbCompany := db.Company{
			ID:                  makeUUID(0xDD),
			CompanyName:         "MinCo",
			Cui:                 "RO00000001",
			CompanyType:         db.CompanyTypePfa,
			LegalRepresentative: "Jane",
			ContactEmail:        "j@m.com",
			ContactPhone:        "0000",
			Address:             "Addr",
			City:                "City",
			County:              "County",
			Description:         pgtype.Text{Valid: false},
			LogoUrl:             pgtype.Text{Valid: false},
			Status:              db.CompanyStatusPendingReview,
			RejectionReason:     pgtype.Text{Valid: false},
			MaxServiceRadiusKm:  pgtype.Int4{Valid: false},
			RatingAvg:           pgtype.Numeric{Valid: false},
			TotalJobsCompleted:  pgtype.Int4{Valid: false},
			CreatedAt:           pgtype.Timestamptz{Valid: false},
		}

		result := dbCompanyToGQL(dbCompany)

		if result.Description != nil {
			t.Errorf("expected nil Description, got %v", result.Description)
		}
		if result.LogoURL != nil {
			t.Errorf("expected nil LogoURL, got %v", result.LogoURL)
		}
		if result.MaxServiceRadiusKm != 0 {
			t.Errorf("expected MaxServiceRadiusKm 0 for invalid, got %d", result.MaxServiceRadiusKm)
		}
		if result.RatingAvg != 0 {
			t.Errorf("expected RatingAvg 0 for invalid, got %f", result.RatingAvg)
		}
		if result.TotalJobsCompleted != 0 {
			t.Errorf("expected TotalJobsCompleted 0 for invalid, got %d", result.TotalJobsCompleted)
		}
	})
}

func TestDbWorkerToGQL(t *testing.T) {
	t.Run("converts full worker profile", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Microsecond)

		dbWorker := db.Worker{
			ID:                 makeUUID(0xE1),
			UserID:             makeUUID(0xE2),
			Status:             db.WorkerStatusActive,
			IsCompanyAdmin:     pgtype.Bool{Bool: true, Valid: true},
			RatingAvg:          makeNumeric("4.90"),
			TotalJobsCompleted: pgtype.Int4{Int32: 200, Valid: true},
			CreatedAt:          makeTimestamptz(now),
		}

		dbUser := db.User{
			ID:        makeUUID(0xE2),
			FullName:  "Maria Popescu",
			Email:     "maria@clean.com",
			Phone:     makeText("+40726433942"),
			AvatarUrl: makeText("https://example.com/maria.jpg"),
		}

		result := dbWorkerToGQL(dbWorker, &dbUser)

		if result == nil {
			t.Fatal("expected non-nil result")
		}

		expectedID := uuidToString(makeUUID(0xE1))
		if result.ID != expectedID {
			t.Errorf("expected ID %q, got %q", expectedID, result.ID)
		}
		if result.FullName != "Maria Popescu" {
			t.Errorf("expected FullName 'Maria Popescu', got %q", result.FullName)
		}
		if result.Phone == nil || *result.Phone != "+40726433942" {
			t.Errorf("expected Phone '+40726433942', got %v", result.Phone)
		}
		if result.Email == nil || *result.Email != "maria@clean.com" {
			t.Errorf("expected Email 'maria@clean.com', got %v", result.Email)
		}
		if result.Status != model.WorkerStatusActive {
			t.Errorf("expected Status ACTIVE, got %q", result.Status)
		}
		if result.IsCompanyAdmin != true {
			t.Error("expected IsCompanyAdmin true")
		}
		if math.Abs(result.RatingAvg-4.90) > 0.01 {
			t.Errorf("expected RatingAvg 4.90, got %f", result.RatingAvg)
		}
		if result.TotalJobsCompleted != 200 {
			t.Errorf("expected TotalJobsCompleted 200, got %d", result.TotalJobsCompleted)
		}
	})

	t.Run("worker with nil optional fields", func(t *testing.T) {
		dbWorker := db.Worker{
			ID:                 makeUUID(0xE2),
			UserID:             makeUUID(0xE3),
			Status:             db.WorkerStatusInvited,
			IsCompanyAdmin:     pgtype.Bool{Valid: false},
			RatingAvg:          pgtype.Numeric{Valid: false},
			TotalJobsCompleted: pgtype.Int4{Valid: false},
			CreatedAt:          pgtype.Timestamptz{Valid: false},
		}

		dbUser := db.User{
			ID:        makeUUID(0xE3),
			FullName:  "Minimal Worker",
			Email:     "minimal@clean.com",
			Phone:     pgtype.Text{Valid: false},
			AvatarUrl: pgtype.Text{Valid: false},
		}

		result := dbWorkerToGQL(dbWorker, &dbUser)

		if result.Phone != nil {
			t.Errorf("expected nil Phone, got %v", result.Phone)
		}
		if result.Email == nil || *result.Email != "minimal@clean.com" {
			t.Errorf("expected Email 'minimal@clean.com', got %v", result.Email)
		}
		if result.IsCompanyAdmin != false {
			t.Error("expected IsCompanyAdmin false for invalid")
		}
		if result.RatingAvg != 0 {
			t.Errorf("expected RatingAvg 0, got %f", result.RatingAvg)
		}
		if result.TotalJobsCompleted != 0 {
			t.Errorf("expected TotalJobsCompleted 0, got %d", result.TotalJobsCompleted)
		}
	})
}

func TestDbAddressToGQL(t *testing.T) {
	t.Run("converts full address with coordinates", func(t *testing.T) {
		dbAddr := db.ClientAddress{
			ID:            makeUUID(0xF1),
			Label:         makeText("Home"),
			StreetAddress: "Str. Victoriei 10",
			City:          "Cluj-Napoca",
			County:        "Cluj",
			PostalCode:    makeText("400000"),
			Floor:         makeText("3"),
			Apartment:     makeText("12A"),
			EntryCode:     makeText("1234"),
			Latitude:      pgtype.Float8{Float64: 46.7712, Valid: true},
			Longitude:     pgtype.Float8{Float64: 23.6236, Valid: true},
			Notes:         makeText("Ring the bell"),
			IsDefault:     pgtype.Bool{Bool: true, Valid: true},
		}

		result := dbAddressToGQL(dbAddr)

		if result == nil {
			t.Fatal("expected non-nil result")
		}

		expectedID := uuidToString(makeUUID(0xF1))
		if result.ID != expectedID {
			t.Errorf("expected ID %q, got %q", expectedID, result.ID)
		}
		if result.Label == nil || *result.Label != "Home" {
			t.Errorf("expected Label 'Home', got %v", result.Label)
		}
		if result.StreetAddress != "Str. Victoriei 10" {
			t.Errorf("expected StreetAddress 'Str. Victoriei 10', got %q", result.StreetAddress)
		}
		if result.City != "Cluj-Napoca" {
			t.Errorf("expected City 'Cluj-Napoca', got %q", result.City)
		}
		if result.County != "Cluj" {
			t.Errorf("expected County 'Cluj', got %q", result.County)
		}
		if result.PostalCode == nil || *result.PostalCode != "400000" {
			t.Errorf("expected PostalCode '400000', got %v", result.PostalCode)
		}
		if result.Floor == nil || *result.Floor != "3" {
			t.Errorf("expected Floor '3', got %v", result.Floor)
		}
		if result.Apartment == nil || *result.Apartment != "12A" {
			t.Errorf("expected Apartment '12A', got %v", result.Apartment)
		}
		if result.EntryCode == nil || *result.EntryCode != "1234" {
			t.Errorf("expected EntryCode '1234', got %v", result.EntryCode)
		}
		if result.Coordinates == nil {
			t.Fatal("expected non-nil Coordinates")
		}
		if math.Abs(result.Coordinates.Latitude-46.7712) > 0.0001 {
			t.Errorf("expected Latitude 46.7712, got %f", result.Coordinates.Latitude)
		}
		if math.Abs(result.Coordinates.Longitude-23.6236) > 0.0001 {
			t.Errorf("expected Longitude 23.6236, got %f", result.Coordinates.Longitude)
		}
		if result.Notes == nil || *result.Notes != "Ring the bell" {
			t.Errorf("expected Notes 'Ring the bell', got %v", result.Notes)
		}
		if result.IsDefault != true {
			t.Error("expected IsDefault true")
		}
	})

	t.Run("address without coordinates has nil Coordinates", func(t *testing.T) {
		dbAddr := db.ClientAddress{
			ID:            makeUUID(0xF2),
			StreetAddress: "Str. Test",
			City:          "City",
			County:        "County",
			Latitude:      pgtype.Float8{Valid: false},
			Longitude:     pgtype.Float8{Valid: false},
			IsDefault:     pgtype.Bool{Valid: false},
		}

		result := dbAddressToGQL(dbAddr)

		if result.Coordinates != nil {
			t.Errorf("expected nil Coordinates, got %v", result.Coordinates)
		}
		if result.IsDefault != false {
			t.Error("expected IsDefault false for invalid")
		}
	})

	t.Run("address with only latitude valid has nil Coordinates", func(t *testing.T) {
		dbAddr := db.ClientAddress{
			ID:            makeUUID(0xF3),
			StreetAddress: "Str. Partial",
			City:          "City",
			County:        "County",
			Latitude:      pgtype.Float8{Float64: 46.0, Valid: true},
			Longitude:     pgtype.Float8{Valid: false},
		}

		result := dbAddressToGQL(dbAddr)

		if result.Coordinates != nil {
			t.Errorf("expected nil Coordinates when only latitude is valid, got %v", result.Coordinates)
		}
	})
}

func TestDbNotificationToGQL(t *testing.T) {
	t.Run("converts full notification", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Microsecond)

		dbNotif := db.Notification{
			ID:        makeUUID(0xA1),
			Type:      db.NotificationTypeBookingCreated,
			Title:     "New Booking",
			Body:      "You have a new booking request",
			IsRead:    pgtype.Bool{Bool: false, Valid: true},
			CreatedAt: makeTimestamptz(now),
		}

		result := dbNotificationToGQL(dbNotif)

		if result == nil {
			t.Fatal("expected non-nil result")
		}
		if result.Type != "booking_created" {
			t.Errorf("expected Type 'booking_created', got %q", result.Type)
		}
		if result.Title != "New Booking" {
			t.Errorf("expected Title 'New Booking', got %q", result.Title)
		}
		if result.Body != "You have a new booking request" {
			t.Errorf("expected Body, got %q", result.Body)
		}
		if result.IsRead != false {
			t.Error("expected IsRead false")
		}
		if !result.CreatedAt.Equal(now) {
			t.Errorf("expected CreatedAt %v, got %v", now, result.CreatedAt)
		}
	})
}

func TestDbReviewToGQL(t *testing.T) {
	t.Run("converts full review", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Microsecond)

		dbReview := db.Review{
			ID:         makeUUID(0xB1),
			Rating:     5,
			Comment:    makeText("Excellent service!"),
			ReviewType: "client_to_worker",
			CreatedAt:  makeTimestamptz(now),
		}

		result := dbReviewToGQL(dbReview)

		if result == nil {
			t.Fatal("expected non-nil result")
		}
		if result.Rating != 5 {
			t.Errorf("expected Rating 5, got %d", result.Rating)
		}
		if result.Comment == nil || *result.Comment != "Excellent service!" {
			t.Errorf("expected Comment 'Excellent service!', got %v", result.Comment)
		}
		if result.ReviewType != "client_to_worker" {
			t.Errorf("expected ReviewType 'client_to_worker', got %q", result.ReviewType)
		}
	})

	t.Run("review without comment", func(t *testing.T) {
		dbReview := db.Review{
			ID:         makeUUID(0xB2),
			Rating:     3,
			Comment:    pgtype.Text{Valid: false},
			ReviewType: "worker_to_client",
			CreatedAt:  makeTimestamptz(time.Now().UTC()),
		}

		result := dbReviewToGQL(dbReview)

		if result.Comment != nil {
			t.Errorf("expected nil Comment, got %v", result.Comment)
		}
	})
}

func TestDbPaymentMethodToGQL(t *testing.T) {
	t.Run("converts full payment method", func(t *testing.T) {
		dbPM := db.ClientPaymentMethod{
			ID:                    makeUUID(0xC1),
			StripePaymentMethodID: makeText("pm_test_123"),
			CardLastFour:          makeText("4242"),
			CardBrand:             makeText("visa"),
			IsDefault:             pgtype.Bool{Bool: true, Valid: true},
		}

		result := dbPaymentMethodToGQL(dbPM)

		if result == nil {
			t.Fatal("expected non-nil result")
		}
		if result.StripePaymentMethodID != "pm_test_123" {
			t.Errorf("expected StripePaymentMethodID 'pm_test_123', got %q", result.StripePaymentMethodID)
		}
		if result.CardLastFour != "4242" {
			t.Errorf("expected CardLastFour '4242', got %q", result.CardLastFour)
		}
		if result.CardBrand != "visa" {
			t.Errorf("expected CardBrand 'visa', got %q", result.CardBrand)
		}
		if result.IsDefault != true {
			t.Error("expected IsDefault true")
		}
	})

	t.Run("payment method with invalid optional fields", func(t *testing.T) {
		dbPM := db.ClientPaymentMethod{
			ID:           makeUUID(0xC2),
			CardLastFour: pgtype.Text{Valid: false},
			CardBrand:    pgtype.Text{Valid: false},
			IsDefault:    pgtype.Bool{Valid: false},
		}

		result := dbPaymentMethodToGQL(dbPM)

		if result.CardLastFour != "" {
			t.Errorf("expected empty CardLastFour, got %q", result.CardLastFour)
		}
		if result.CardBrand != "" {
			t.Errorf("expected empty CardBrand, got %q", result.CardBrand)
		}
		if result.IsDefault != false {
			t.Error("expected IsDefault false for invalid")
		}
	})
}

func TestDbCompanyDocToGQL(t *testing.T) {
	t.Run("converts company document with approved status and all fields", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Microsecond)
		reviewedAt := now.Add(2 * time.Hour)

		dbDoc := db.CompanyDocument{
			ID:              makeUUID(0xD3),
			DocumentType:    "registration_certificate",
			FileUrl:         "https://example.com/docs/cert.pdf",
			FileName:        "cert.pdf",
			Status:          "approved",
			UploadedAt:      makeTimestamptz(now),
			ReviewedAt:      makeTimestamptz(reviewedAt),
			RejectionReason: makeText("N/A"),
		}

		result := dbCompanyDocToGQL(dbDoc)

		if result == nil {
			t.Fatal("expected non-nil result")
		}
		expectedID := uuidToString(makeUUID(0xD3))
		if result.ID != expectedID {
			t.Errorf("expected ID %q, got %q", expectedID, result.ID)
		}
		if result.DocumentType != "registration_certificate" {
			t.Errorf("expected DocumentType, got %q", result.DocumentType)
		}
		if result.FileURL != "https://example.com/docs/cert.pdf" {
			t.Errorf("expected FileURL, got %q", result.FileURL)
		}
		if result.FileName != "cert.pdf" {
			t.Errorf("expected FileName 'cert.pdf', got %q", result.FileName)
		}
		if result.Status != model.DocumentStatusApproved {
			t.Errorf("expected Status APPROVED, got %q", result.Status)
		}
		if !result.UploadedAt.Equal(now) {
			t.Errorf("expected UploadedAt %v, got %v", now, result.UploadedAt)
		}
		if result.ReviewedAt == nil {
			t.Fatal("expected non-nil ReviewedAt")
		}
		if !result.ReviewedAt.Equal(reviewedAt) {
			t.Errorf("expected ReviewedAt %v, got %v", reviewedAt, *result.ReviewedAt)
		}
		if result.RejectionReason == nil {
			t.Fatal("expected non-nil RejectionReason")
		}
		if *result.RejectionReason != "N/A" {
			t.Errorf("expected RejectionReason 'N/A', got %q", *result.RejectionReason)
		}
	})

	t.Run("converts company document with pending status and null optional fields", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Microsecond)

		dbDoc := db.CompanyDocument{
			ID:              makeUUID(0xD4),
			DocumentType:    "fiscal_certificate",
			FileUrl:         "https://example.com/docs/fiscal.pdf",
			FileName:        "fiscal.pdf",
			Status:          "pending",
			UploadedAt:      makeTimestamptz(now),
			ReviewedAt:      pgtype.Timestamptz{Valid: false},
			RejectionReason: pgtype.Text{Valid: false},
		}

		result := dbCompanyDocToGQL(dbDoc)

		if result == nil {
			t.Fatal("expected non-nil result")
		}
		if result.Status != model.DocumentStatusPending {
			t.Errorf("expected Status PENDING, got %q", result.Status)
		}
		if result.ReviewedAt != nil {
			t.Errorf("expected nil ReviewedAt, got %v", *result.ReviewedAt)
		}
		if result.RejectionReason != nil {
			t.Errorf("expected nil RejectionReason, got %q", *result.RejectionReason)
		}
	})
}

func TestDbServiceDefToGQL(t *testing.T) {
	t.Run("converts full service definition", func(t *testing.T) {
		dbSvc := db.ServiceDefinition{
			ID:               makeUUID(0xE3),
			ServiceType:      db.ServiceTypeWindowCleaning,
			NameRo:           "Curatenie geamuri",
			NameEn:           "Window Cleaning",
			DescriptionRo:    makeText("Curatare profesionala a geamurilor"),
			DescriptionEn:    makeText("Professional window cleaning"),
			BasePricePerHour: makeNumeric("35.00"),
			MinHours:         makeNumeric("2.00"),
			Icon:             makeText("window-icon"),
		}

		result := dbServiceDefToGQL(dbSvc)

		if result == nil {
			t.Fatal("expected non-nil result")
		}
		if result.ServiceType != model.ServiceTypeWindowCleaning {
			t.Errorf("expected ServiceType WINDOW_CLEANING, got %q", result.ServiceType)
		}
		if result.NameRo != "Curatenie geamuri" {
			t.Errorf("expected NameRo, got %q", result.NameRo)
		}
		if result.NameEn != "Window Cleaning" {
			t.Errorf("expected NameEn 'Window Cleaning', got %q", result.NameEn)
		}
		if result.DescriptionRo == nil || *result.DescriptionRo != "Curatare profesionala a geamurilor" {
			t.Errorf("expected DescriptionRo, got %v", result.DescriptionRo)
		}
		if result.DescriptionEn == nil || *result.DescriptionEn != "Professional window cleaning" {
			t.Errorf("expected DescriptionEn, got %v", result.DescriptionEn)
		}
		if math.Abs(result.BasePricePerHour-35.00) > 0.01 {
			t.Errorf("expected BasePricePerHour 35.00, got %f", result.BasePricePerHour)
		}
		if math.Abs(result.MinHours-2.00) > 0.01 {
			t.Errorf("expected MinHours 2.00, got %f", result.MinHours)
		}
		if result.Icon == nil || *result.Icon != "window-icon" {
			t.Errorf("expected Icon 'window-icon', got %v", result.Icon)
		}
	})

	t.Run("service definition with nil optional fields", func(t *testing.T) {
		dbSvc := db.ServiceDefinition{
			ID:               makeUUID(0xE4),
			ServiceType:      db.ServiceTypeStandardCleaning,
			NameRo:           "Curatenie standard",
			NameEn:           "Standard Cleaning",
			DescriptionRo:    pgtype.Text{Valid: false},
			DescriptionEn:    pgtype.Text{Valid: false},
			BasePricePerHour: pgtype.Numeric{Valid: false},
			MinHours:         pgtype.Numeric{Valid: false},
			Icon:             pgtype.Text{Valid: false},
		}

		result := dbServiceDefToGQL(dbSvc)

		if result.DescriptionRo != nil {
			t.Errorf("expected nil DescriptionRo, got %v", result.DescriptionRo)
		}
		if result.DescriptionEn != nil {
			t.Errorf("expected nil DescriptionEn, got %v", result.DescriptionEn)
		}
		if result.Icon != nil {
			t.Errorf("expected nil Icon, got %v", result.Icon)
		}
		if result.BasePricePerHour != 0 {
			t.Errorf("expected BasePricePerHour 0, got %f", result.BasePricePerHour)
		}
		if result.MinHours != 0 {
			t.Errorf("expected MinHours 0, got %f", result.MinHours)
		}
	})
}

func TestDbServiceExtraToGQL(t *testing.T) {
	t.Run("converts full service extra", func(t *testing.T) {
		dbExtra := db.ServiceExtra{
			ID:     makeUUID(0xE5),
			NameRo: "Calcat haine",
			NameEn: "Ironing",
			Price:  makeNumeric("20.00"),
			Icon:   makeText("iron-icon"),
		}

		result := dbServiceExtraToGQL(dbExtra)

		if result == nil {
			t.Fatal("expected non-nil result")
		}
		if result.NameRo != "Calcat haine" {
			t.Errorf("expected NameRo, got %q", result.NameRo)
		}
		if result.NameEn != "Ironing" {
			t.Errorf("expected NameEn 'Ironing', got %q", result.NameEn)
		}
		if math.Abs(result.Price-20.00) > 0.01 {
			t.Errorf("expected Price 20.00, got %f", result.Price)
		}
		if result.Icon == nil || *result.Icon != "iron-icon" {
			t.Errorf("expected Icon 'iron-icon', got %v", result.Icon)
		}
	})

	t.Run("service extra without icon", func(t *testing.T) {
		dbExtra := db.ServiceExtra{
			ID:     makeUUID(0xE6),
			NameRo: "Extra",
			NameEn: "Extra",
			Price:  makeNumeric("10.00"),
			Icon:   pgtype.Text{Valid: false},
		}

		result := dbServiceExtraToGQL(dbExtra)

		if result.Icon != nil {
			t.Errorf("expected nil Icon, got %v", result.Icon)
		}
	})
}

// ---------------------------------------------------------------------------
// Float64ToNumeric round-trip
// ---------------------------------------------------------------------------

func TestFloat64ToNumeric(t *testing.T) {
	t.Run("round trip through float64", func(t *testing.T) {
		n := float64ToNumeric(99.99)
		result := numericToFloat(n)
		if math.Abs(result-99.99) > 0.01 {
			t.Errorf("expected ~99.99, got %f", result)
		}
	})

	t.Run("zero value", func(t *testing.T) {
		n := float64ToNumeric(0)
		result := numericToFloat(n)
		if result != 0 {
			t.Errorf("expected 0, got %f", result)
		}
	})
}

// ---------------------------------------------------------------------------
// Payment & Invoice converter tests
// ---------------------------------------------------------------------------

func TestDbPaymentTransactionToGQL(t *testing.T) {
	t.Run("converts full payment transaction with all fields", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Microsecond)

		dbTx := db.PaymentTransaction{
			ID:                    makeUUID(0x01),
			BookingID:             makeUUID(0x02),
			StripePaymentIntentID: "pi_1234567890",
			AmountTotal:           15000,
			AmountCompany:         12750,
			AmountPlatformFee:     2250,
			Currency:              "RON",
			Status:                db.PaymentTransactionStatusSucceeded,
			FailureReason:         pgtype.Text{String: "card_declined", Valid: true},
			RefundAmount:          pgtype.Int4{Int32: 5000, Valid: true},
			CreatedAt:             makeTimestamptz(now),
		}

		result := dbPaymentTransactionToGQL(dbTx)

		if result == nil {
			t.Fatal("expected non-nil result")
		}
		expectedID := uuidToString(makeUUID(0x01))
		if result.ID != expectedID {
			t.Errorf("expected ID %q, got %q", expectedID, result.ID)
		}
		expectedBookingID := uuidToString(makeUUID(0x02))
		if result.BookingID != expectedBookingID {
			t.Errorf("expected BookingID %q, got %q", expectedBookingID, result.BookingID)
		}
		if result.StripePaymentIntentID != "pi_1234567890" {
			t.Errorf("expected StripePaymentIntentID 'pi_1234567890', got %q", result.StripePaymentIntentID)
		}
		if result.AmountTotal != 15000 {
			t.Errorf("expected AmountTotal 15000, got %d", result.AmountTotal)
		}
		if result.AmountCompany != 12750 {
			t.Errorf("expected AmountCompany 12750, got %d", result.AmountCompany)
		}
		if result.AmountPlatformFee != 2250 {
			t.Errorf("expected AmountPlatformFee 2250, got %d", result.AmountPlatformFee)
		}
		if result.Currency != "RON" {
			t.Errorf("expected Currency 'RON', got %q", result.Currency)
		}
		if result.Status != model.PaymentTransactionStatusSucceeded {
			t.Errorf("expected Status SUCCEEDED, got %q", result.Status)
		}
		if result.FailureReason == nil || *result.FailureReason != "card_declined" {
			t.Errorf("expected FailureReason 'card_declined', got %v", result.FailureReason)
		}
		if result.RefundAmount == nil || *result.RefundAmount != 5000 {
			t.Errorf("expected RefundAmount 5000, got %v", result.RefundAmount)
		}
		if !result.CreatedAt.Equal(now) {
			t.Errorf("expected CreatedAt %v, got %v", now, result.CreatedAt)
		}
	})

	t.Run("converts payment transaction with nil optional fields", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Microsecond)

		dbTx := db.PaymentTransaction{
			ID:                    makeUUID(0x03),
			BookingID:             makeUUID(0x04),
			StripePaymentIntentID: "pi_0000000000",
			AmountTotal:           5000,
			AmountCompany:         4250,
			AmountPlatformFee:     750,
			Currency:              "EUR",
			Status:                db.PaymentTransactionStatusPending,
			FailureReason:         pgtype.Text{Valid: false},
			RefundAmount:          pgtype.Int4{Valid: false},
			CreatedAt:             makeTimestamptz(now),
		}

		result := dbPaymentTransactionToGQL(dbTx)

		if result.FailureReason != nil {
			t.Errorf("expected nil FailureReason, got %v", result.FailureReason)
		}
		if result.RefundAmount != nil {
			t.Errorf("expected nil RefundAmount, got %v", result.RefundAmount)
		}
		if result.Status != model.PaymentTransactionStatusPending {
			t.Errorf("expected Status PENDING, got %q", result.Status)
		}
	})

	t.Run("status enum conversion for all statuses", func(t *testing.T) {
		tests := []struct {
			dbStatus  db.PaymentTransactionStatus
			gqlStatus model.PaymentTransactionStatus
		}{
			{db.PaymentTransactionStatusPending, model.PaymentTransactionStatusPending},
			{db.PaymentTransactionStatusRequiresAction, model.PaymentTransactionStatusRequiresAction},
			{db.PaymentTransactionStatusProcessing, model.PaymentTransactionStatusProcessing},
			{db.PaymentTransactionStatusSucceeded, model.PaymentTransactionStatusSucceeded},
			{db.PaymentTransactionStatusFailed, model.PaymentTransactionStatusFailed},
			{db.PaymentTransactionStatusRefunded, model.PaymentTransactionStatusRefunded},
			{db.PaymentTransactionStatusPartiallyRefunded, model.PaymentTransactionStatusPartiallyRefunded},
			{db.PaymentTransactionStatusCancelled, model.PaymentTransactionStatusCancelled},
		}

		for _, tc := range tests {
			t.Run(string(tc.dbStatus), func(t *testing.T) {
				dbTx := db.PaymentTransaction{
					ID:                    makeUUID(0x05),
					BookingID:             makeUUID(0x06),
					StripePaymentIntentID: "pi_test",
					Status:                tc.dbStatus,
					CreatedAt:             makeTimestamptz(time.Now().UTC()),
				}
				result := dbPaymentTransactionToGQL(dbTx)
				if result.Status != tc.gqlStatus {
					t.Errorf("expected Status %q, got %q", tc.gqlStatus, result.Status)
				}
			})
		}
	})
}

func TestDbCompanyPayoutToGQL(t *testing.T) {
	t.Run("converts full company payout with all fields", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Microsecond)
		paidAt := now.Add(-1 * time.Hour)

		dbPayout := db.CompanyPayout{
			ID:           makeUUID(0x10),
			Amount:       250000,
			Currency:     "RON",
			PeriodFrom:   pgtype.Date{Time: time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC), Valid: true},
			PeriodTo:     pgtype.Date{Time: time.Date(2025, 6, 30, 0, 0, 0, 0, time.UTC), Valid: true},
			BookingCount: 45,
			Status:       db.PayoutStatusPaid,
			PaidAt:       makeTimestamptz(paidAt),
			CreatedAt:    makeTimestamptz(now),
		}

		result := dbCompanyPayoutToGQL(dbPayout)

		if result == nil {
			t.Fatal("expected non-nil result")
		}
		expectedID := uuidToString(makeUUID(0x10))
		if result.ID != expectedID {
			t.Errorf("expected ID %q, got %q", expectedID, result.ID)
		}
		if result.Amount != 250000 {
			t.Errorf("expected Amount 250000, got %d", result.Amount)
		}
		if result.Currency != "RON" {
			t.Errorf("expected Currency 'RON', got %q", result.Currency)
		}
		if result.PeriodFrom != "2025-06-01" {
			t.Errorf("expected PeriodFrom '2025-06-01', got %q", result.PeriodFrom)
		}
		if result.PeriodTo != "2025-06-30" {
			t.Errorf("expected PeriodTo '2025-06-30', got %q", result.PeriodTo)
		}
		if result.BookingCount != 45 {
			t.Errorf("expected BookingCount 45, got %d", result.BookingCount)
		}
		if result.Status != model.PayoutStatusPaid {
			t.Errorf("expected Status PAID, got %q", result.Status)
		}
		if result.PaidAt == nil || !result.PaidAt.Equal(paidAt) {
			t.Errorf("expected PaidAt %v, got %v", paidAt, result.PaidAt)
		}
		if result.LineItems == nil {
			t.Error("expected non-nil LineItems slice")
		}
		if len(result.LineItems) != 0 {
			t.Errorf("expected empty LineItems slice, got %d items", len(result.LineItems))
		}
		if !result.CreatedAt.Equal(now) {
			t.Errorf("expected CreatedAt %v, got %v", now, result.CreatedAt)
		}
	})

	t.Run("converts payout with nil optional fields", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Microsecond)

		dbPayout := db.CompanyPayout{
			ID:           makeUUID(0x11),
			Amount:       100000,
			Currency:     "EUR",
			PeriodFrom:   pgtype.Date{Valid: false},
			PeriodTo:     pgtype.Date{Valid: false},
			BookingCount: 0,
			Status:       db.PayoutStatusPending,
			PaidAt:       pgtype.Timestamptz{Valid: false},
			CreatedAt:    makeTimestamptz(now),
		}

		result := dbCompanyPayoutToGQL(dbPayout)

		if result.PeriodFrom != "" {
			t.Errorf("expected empty PeriodFrom, got %q", result.PeriodFrom)
		}
		if result.PeriodTo != "" {
			t.Errorf("expected empty PeriodTo, got %q", result.PeriodTo)
		}
		if result.PaidAt != nil {
			t.Errorf("expected nil PaidAt, got %v", result.PaidAt)
		}
		if result.Status != model.PayoutStatusPending {
			t.Errorf("expected Status PENDING, got %q", result.Status)
		}
	})

	t.Run("status enum conversion for all payout statuses", func(t *testing.T) {
		tests := []struct {
			dbStatus  db.PayoutStatus
			gqlStatus model.PayoutStatus
		}{
			{db.PayoutStatusPending, model.PayoutStatusPending},
			{db.PayoutStatusProcessing, model.PayoutStatusProcessing},
			{db.PayoutStatusPaid, model.PayoutStatusPaid},
			{db.PayoutStatusFailed, model.PayoutStatusFailed},
			{db.PayoutStatusCancelled, model.PayoutStatusCancelled},
		}

		for _, tc := range tests {
			t.Run(string(tc.dbStatus), func(t *testing.T) {
				dbPayout := db.CompanyPayout{
					ID:        makeUUID(0x12),
					Status:    tc.dbStatus,
					CreatedAt: makeTimestamptz(time.Now().UTC()),
				}
				result := dbCompanyPayoutToGQL(dbPayout)
				if result.Status != tc.gqlStatus {
					t.Errorf("expected Status %q, got %q", tc.gqlStatus, result.Status)
				}
			})
		}
	})
}

func TestDbPayoutLineItemToGQL(t *testing.T) {
	t.Run("converts full payout line item", func(t *testing.T) {
		dbLI := db.PayoutLineItem{
			ID:               makeUUID(0x20),
			AmountGross:      10000,
			AmountCommission: 1500,
			AmountNet:        8500,
		}

		result := dbPayoutLineItemToGQL(dbLI)

		if result == nil {
			t.Fatal("expected non-nil result")
		}
		expectedID := uuidToString(makeUUID(0x20))
		if result.ID != expectedID {
			t.Errorf("expected ID %q, got %q", expectedID, result.ID)
		}
		if result.AmountGross != 10000 {
			t.Errorf("expected AmountGross 10000, got %d", result.AmountGross)
		}
		if result.AmountCommission != 1500 {
			t.Errorf("expected AmountCommission 1500, got %d", result.AmountCommission)
		}
		if result.AmountNet != 8500 {
			t.Errorf("expected AmountNet 8500, got %d", result.AmountNet)
		}
	})

	t.Run("converts payout line item with zero amounts", func(t *testing.T) {
		dbLI := db.PayoutLineItem{
			ID:               makeUUID(0x21),
			AmountGross:      0,
			AmountCommission: 0,
			AmountNet:        0,
		}

		result := dbPayoutLineItemToGQL(dbLI)

		if result.AmountGross != 0 {
			t.Errorf("expected AmountGross 0, got %d", result.AmountGross)
		}
		if result.AmountCommission != 0 {
			t.Errorf("expected AmountCommission 0, got %d", result.AmountCommission)
		}
		if result.AmountNet != 0 {
			t.Errorf("expected AmountNet 0, got %d", result.AmountNet)
		}
	})
}

func TestDbRefundRequestToGQL(t *testing.T) {
	t.Run("converts full refund request with all fields", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Microsecond)
		processedAt := now.Add(-30 * time.Minute)

		dbRefund := db.RefundRequest{
			ID:          makeUUID(0x30),
			Amount:      7500,
			Reason:      "Service not performed as described",
			Status:      db.RefundStatusApproved,
			ProcessedAt: makeTimestamptz(processedAt),
			CreatedAt:   makeTimestamptz(now),
		}

		result := dbRefundRequestToGQL(dbRefund)

		if result == nil {
			t.Fatal("expected non-nil result")
		}
		expectedID := uuidToString(makeUUID(0x30))
		if result.ID != expectedID {
			t.Errorf("expected ID %q, got %q", expectedID, result.ID)
		}
		if result.Amount != 7500 {
			t.Errorf("expected Amount 7500, got %d", result.Amount)
		}
		if result.Reason != "Service not performed as described" {
			t.Errorf("expected Reason, got %q", result.Reason)
		}
		if result.Status != model.RefundStatusApproved {
			t.Errorf("expected Status APPROVED, got %q", result.Status)
		}
		if result.ProcessedAt == nil || !result.ProcessedAt.Equal(processedAt) {
			t.Errorf("expected ProcessedAt %v, got %v", processedAt, result.ProcessedAt)
		}
		if !result.CreatedAt.Equal(now) {
			t.Errorf("expected CreatedAt %v, got %v", now, result.CreatedAt)
		}
	})

	t.Run("converts refund request with nil ProcessedAt", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Microsecond)

		dbRefund := db.RefundRequest{
			ID:          makeUUID(0x31),
			Amount:      3000,
			Reason:      "Cancelled within free cancellation window",
			Status:      db.RefundStatusRequested,
			ProcessedAt: pgtype.Timestamptz{Valid: false},
			CreatedAt:   makeTimestamptz(now),
		}

		result := dbRefundRequestToGQL(dbRefund)

		if result.ProcessedAt != nil {
			t.Errorf("expected nil ProcessedAt, got %v", result.ProcessedAt)
		}
		if result.Status != model.RefundStatusRequested {
			t.Errorf("expected Status REQUESTED, got %q", result.Status)
		}
	})

	t.Run("status enum conversion for all refund statuses", func(t *testing.T) {
		tests := []struct {
			dbStatus  db.RefundStatus
			gqlStatus model.RefundStatus
		}{
			{db.RefundStatusRequested, model.RefundStatusRequested},
			{db.RefundStatusApproved, model.RefundStatusApproved},
			{db.RefundStatusProcessed, model.RefundStatusProcessed},
			{db.RefundStatusRejected, model.RefundStatusRejected},
		}

		for _, tc := range tests {
			t.Run(string(tc.dbStatus), func(t *testing.T) {
				dbRefund := db.RefundRequest{
					ID:        makeUUID(0x32),
					Amount:    1000,
					Reason:    "test",
					Status:    tc.dbStatus,
					CreatedAt: makeTimestamptz(time.Now().UTC()),
				}
				result := dbRefundRequestToGQL(dbRefund)
				if result.Status != tc.gqlStatus {
					t.Errorf("expected Status %q, got %q", tc.gqlStatus, result.Status)
				}
			})
		}
	})
}

func TestDbInvoiceToGQL(t *testing.T) {
	t.Run("converts full invoice with all fields", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Microsecond)
		issuedAt := now.Add(-24 * time.Hour)

		dbInvoice := db.Invoice{
			ID:                    makeUUID(0x40),
			InvoiceType:           db.InvoiceTypeClientService,
			InvoiceNumber:         makeText("G2F-INV-2025-00001"),
			Status:                db.InvoiceStatusIssued,
			SellerCompanyName:     "CleanCo SRL",
			SellerCui:             "RO12345678",
			BuyerName:             "Ion Popescu",
			BuyerCui:              makeText("RO87654321"),
			SubtotalAmount:        15000,
			VatRate:               makeNumeric("19.00"),
			VatAmount:             2850,
			TotalAmount:           17850,
			Currency:              "RON",
			EfacturaStatus:  makeText("transmitted"),
			KeezDownloadUrl: makeText("https://app.keez.ro/invoices/preview/abc123"),
			IssuedAt:        makeTimestamptz(issuedAt),
			DueDate:               pgtype.Date{Time: time.Date(2025, 7, 15, 0, 0, 0, 0, time.UTC), Valid: true},
			Notes:                 makeText("Service curatenie standard"),
			CreatedAt:             makeTimestamptz(now),
		}

		result := dbInvoiceToGQL(dbInvoice)

		if result == nil {
			t.Fatal("expected non-nil result")
		}
		expectedID := uuidToString(makeUUID(0x40))
		if result.ID != expectedID {
			t.Errorf("expected ID %q, got %q", expectedID, result.ID)
		}
		if result.InvoiceType != model.InvoiceTypeClientService {
			t.Errorf("expected InvoiceType CLIENT_SERVICE, got %q", result.InvoiceType)
		}
		if result.InvoiceNumber == nil || *result.InvoiceNumber != "G2F-INV-2025-00001" {
			t.Errorf("expected InvoiceNumber 'G2F-INV-2025-00001', got %v", result.InvoiceNumber)
		}
		if result.Status != model.InvoiceStatusIssued {
			t.Errorf("expected Status ISSUED, got %q", result.Status)
		}
		if result.SellerCompanyName != "CleanCo SRL" {
			t.Errorf("expected SellerCompanyName 'CleanCo SRL', got %q", result.SellerCompanyName)
		}
		if result.SellerCui != "RO12345678" {
			t.Errorf("expected SellerCui 'RO12345678', got %q", result.SellerCui)
		}
		if result.BuyerName != "Ion Popescu" {
			t.Errorf("expected BuyerName 'Ion Popescu', got %q", result.BuyerName)
		}
		if result.BuyerCui == nil || *result.BuyerCui != "RO87654321" {
			t.Errorf("expected BuyerCui 'RO87654321', got %v", result.BuyerCui)
		}
		if result.SubtotalAmount != 15000 {
			t.Errorf("expected SubtotalAmount 15000, got %d", result.SubtotalAmount)
		}
		if math.Abs(result.VatRate-19.00) > 0.01 {
			t.Errorf("expected VatRate 19.00, got %f", result.VatRate)
		}
		if result.VatAmount != 2850 {
			t.Errorf("expected VatAmount 2850, got %d", result.VatAmount)
		}
		if result.TotalAmount != 17850 {
			t.Errorf("expected TotalAmount 17850, got %d", result.TotalAmount)
		}
		if result.Currency != "RON" {
			t.Errorf("expected Currency 'RON', got %q", result.Currency)
		}
		if result.EfacturaStatus == nil || *result.EfacturaStatus != "transmitted" {
			t.Errorf("expected EfacturaStatus 'transmitted', got %v", result.EfacturaStatus)
		}
		if result.DownloadURL == nil || *result.DownloadURL != "https://app.keez.ro/invoices/preview/abc123" {
			t.Errorf("expected DownloadURL, got %v", result.DownloadURL)
		}
		if result.IssuedAt == nil || !result.IssuedAt.Equal(issuedAt) {
			t.Errorf("expected IssuedAt %v, got %v", issuedAt, result.IssuedAt)
		}
		if result.DueDate == nil || *result.DueDate != "2025-07-15" {
			t.Errorf("expected DueDate '2025-07-15', got %v", result.DueDate)
		}
		if result.Notes == nil || *result.Notes != "Service curatenie standard" {
			t.Errorf("expected Notes, got %v", result.Notes)
		}
		if result.LineItems == nil {
			t.Error("expected non-nil LineItems slice")
		}
		if len(result.LineItems) != 0 {
			t.Errorf("expected empty LineItems slice, got %d items", len(result.LineItems))
		}
		if !result.CreatedAt.Equal(now) {
			t.Errorf("expected CreatedAt %v, got %v", now, result.CreatedAt)
		}
	})

	t.Run("converts invoice with nil optional fields", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Microsecond)

		dbInvoice := db.Invoice{
			ID:                    makeUUID(0x41),
			InvoiceType:           db.InvoiceTypePlatformCommission,
			InvoiceNumber:         pgtype.Text{Valid: false},
			Status:                db.InvoiceStatusDraft,
			SellerCompanyName:     "Go2Fix SRL",
			SellerCui:             "RO99999999",
			BuyerName:             "Test Corp",
			BuyerCui:              pgtype.Text{Valid: false},
			SubtotalAmount:        5000,
			VatRate:               makeNumeric("19.00"),
			VatAmount:             950,
			TotalAmount:           5950,
			Currency:              "RON",
			EfacturaStatus:  pgtype.Text{Valid: false},
			KeezDownloadUrl: pgtype.Text{Valid: false},
			IssuedAt:        pgtype.Timestamptz{Valid: false},
			DueDate:               pgtype.Date{Valid: false},
			Notes:                 pgtype.Text{Valid: false},
			CreatedAt:             makeTimestamptz(now),
		}

		result := dbInvoiceToGQL(dbInvoice)

		if result.InvoiceType != model.InvoiceTypePlatformCommission {
			t.Errorf("expected InvoiceType PLATFORM_COMMISSION, got %q", result.InvoiceType)
		}
		if result.InvoiceNumber != nil {
			t.Errorf("expected nil InvoiceNumber, got %v", result.InvoiceNumber)
		}
		if result.Status != model.InvoiceStatusDraft {
			t.Errorf("expected Status DRAFT, got %q", result.Status)
		}
		if result.BuyerCui != nil {
			t.Errorf("expected nil BuyerCui, got %v", result.BuyerCui)
		}
		if result.EfacturaStatus != nil {
			t.Errorf("expected nil EfacturaStatus, got %v", result.EfacturaStatus)
		}
		if result.DownloadURL != nil {
			t.Errorf("expected nil DownloadURL, got %v", result.DownloadURL)
		}
		if result.IssuedAt != nil {
			t.Errorf("expected nil IssuedAt, got %v", result.IssuedAt)
		}
		if result.DueDate != nil {
			t.Errorf("expected nil DueDate, got %v", result.DueDate)
		}
		if result.Notes != nil {
			t.Errorf("expected nil Notes, got %v", result.Notes)
		}
	})

	t.Run("invoice status enum conversion for all statuses", func(t *testing.T) {
		tests := []struct {
			dbStatus  db.InvoiceStatus
			gqlStatus model.InvoiceStatus
		}{
			{db.InvoiceStatusDraft, model.InvoiceStatusDraft},
			{db.InvoiceStatusIssued, model.InvoiceStatusIssued},
			{db.InvoiceStatusSent, model.InvoiceStatusSent},
			{db.InvoiceStatusTransmitted, model.InvoiceStatusTransmitted},
			{db.InvoiceStatusPaid, model.InvoiceStatusPaid},
			{db.InvoiceStatusCancelled, model.InvoiceStatusCancelled},
			{db.InvoiceStatusCreditNote, model.InvoiceStatusCreditNote},
		}

		for _, tc := range tests {
			t.Run(string(tc.dbStatus), func(t *testing.T) {
				dbInvoice := db.Invoice{
					ID:                makeUUID(0x42),
					InvoiceType:       db.InvoiceTypeClientService,
					Status:            tc.dbStatus,
					SellerCompanyName: "Test",
					SellerCui:         "RO1",
					BuyerName:         "Buyer",
					Currency:          "RON",
					VatRate:           makeNumeric("19.00"),
					CreatedAt:         makeTimestamptz(time.Now().UTC()),
				}
				result := dbInvoiceToGQL(dbInvoice)
				if result.Status != tc.gqlStatus {
					t.Errorf("expected Status %q, got %q", tc.gqlStatus, result.Status)
				}
			})
		}
	})

	t.Run("invoice type enum conversion", func(t *testing.T) {
		tests := []struct {
			dbType  db.InvoiceType
			gqlType model.InvoiceType
		}{
			{db.InvoiceTypeClientService, model.InvoiceTypeClientService},
			{db.InvoiceTypePlatformCommission, model.InvoiceTypePlatformCommission},
		}

		for _, tc := range tests {
			t.Run(string(tc.dbType), func(t *testing.T) {
				dbInvoice := db.Invoice{
					ID:                makeUUID(0x43),
					InvoiceType:       tc.dbType,
					Status:            db.InvoiceStatusDraft,
					SellerCompanyName: "Test",
					SellerCui:         "RO1",
					BuyerName:         "Buyer",
					Currency:          "RON",
					VatRate:           makeNumeric("19.00"),
					CreatedAt:         makeTimestamptz(time.Now().UTC()),
				}
				result := dbInvoiceToGQL(dbInvoice)
				if result.InvoiceType != tc.gqlType {
					t.Errorf("expected InvoiceType %q, got %q", tc.gqlType, result.InvoiceType)
				}
			})
		}
	})
}

func TestDbInvoiceLineItemToGQL(t *testing.T) {
	t.Run("converts full invoice line item", func(t *testing.T) {
		dbLI := db.InvoiceLineItem{
			ID:               makeUUID(0x50),
			DescriptionRo:    "Curatenie standard - 3 ore",
			DescriptionEn:    makeText("Standard cleaning - 3 hours"),
			Quantity:         makeNumeric("3.00"),
			UnitPrice:        5000,
			VatRate:          makeNumeric("19.00"),
			VatAmount:        2850,
			LineTotal:        15000,
			LineTotalWithVat: 17850,
		}

		result := dbInvoiceLineItemToGQL(dbLI)

		if result == nil {
			t.Fatal("expected non-nil result")
		}
		expectedID := uuidToString(makeUUID(0x50))
		if result.ID != expectedID {
			t.Errorf("expected ID %q, got %q", expectedID, result.ID)
		}
		if result.DescriptionRo != "Curatenie standard - 3 ore" {
			t.Errorf("expected DescriptionRo, got %q", result.DescriptionRo)
		}
		if result.DescriptionEn == nil || *result.DescriptionEn != "Standard cleaning - 3 hours" {
			t.Errorf("expected DescriptionEn 'Standard cleaning - 3 hours', got %v", result.DescriptionEn)
		}
		if math.Abs(result.Quantity-3.00) > 0.01 {
			t.Errorf("expected Quantity 3.00, got %f", result.Quantity)
		}
		if result.UnitPrice != 5000 {
			t.Errorf("expected UnitPrice 5000, got %d", result.UnitPrice)
		}
		if math.Abs(result.VatRate-19.00) > 0.01 {
			t.Errorf("expected VatRate 19.00, got %f", result.VatRate)
		}
		if result.VatAmount != 2850 {
			t.Errorf("expected VatAmount 2850, got %d", result.VatAmount)
		}
		if result.LineTotal != 15000 {
			t.Errorf("expected LineTotal 15000, got %d", result.LineTotal)
		}
		if result.LineTotalWithVat != 17850 {
			t.Errorf("expected LineTotalWithVat 17850, got %d", result.LineTotalWithVat)
		}
	})

	t.Run("converts line item with nil DescriptionEn", func(t *testing.T) {
		dbLI := db.InvoiceLineItem{
			ID:               makeUUID(0x51),
			DescriptionRo:    "Curatenie geamuri",
			DescriptionEn:    pgtype.Text{Valid: false},
			Quantity:         makeNumeric("1.00"),
			UnitPrice:        3500,
			VatRate:          makeNumeric("19.00"),
			VatAmount:        665,
			LineTotal:        3500,
			LineTotalWithVat: 4165,
		}

		result := dbInvoiceLineItemToGQL(dbLI)

		if result.DescriptionEn != nil {
			t.Errorf("expected nil DescriptionEn, got %v", result.DescriptionEn)
		}
	})

	t.Run("converts line item with zero amounts", func(t *testing.T) {
		dbLI := db.InvoiceLineItem{
			ID:               makeUUID(0x52),
			DescriptionRo:    "Discount",
			DescriptionEn:    makeText("Discount"),
			Quantity:         makeNumeric("1.00"),
			UnitPrice:        0,
			VatRate:          makeNumeric("0"),
			VatAmount:        0,
			LineTotal:        0,
			LineTotalWithVat: 0,
		}

		result := dbInvoiceLineItemToGQL(dbLI)

		if result.UnitPrice != 0 {
			t.Errorf("expected UnitPrice 0, got %d", result.UnitPrice)
		}
		if result.VatAmount != 0 {
			t.Errorf("expected VatAmount 0, got %d", result.VatAmount)
		}
		if result.LineTotal != 0 {
			t.Errorf("expected LineTotal 0, got %d", result.LineTotal)
		}
		if result.LineTotalWithVat != 0 {
			t.Errorf("expected LineTotalWithVat 0, got %d", result.LineTotalWithVat)
		}
	})
}

func TestDbBillingProfileToGQL(t *testing.T) {
	t.Run("converts full company billing profile with all fields", func(t *testing.T) {
		dbBP := db.ClientBillingProfile{
			ID:          makeUUID(0x60),
			IsCompany:   true,
			CompanyName: makeText("Test SRL"),
			Cui:         makeText("RO12345678"),
			RegNumber:   makeText("J40/1234/2020"),
			Address:     makeText("Str. Exemplu 10"),
			City:        makeText("Bucharest"),
			County:      makeText("Bucharest"),
			IsVatPayer:  pgtype.Bool{Bool: true, Valid: true},
			BankName:    makeText("Banca Transilvania"),
			Iban:        makeText("RO49AAAA1B31007593840000"),
			IsDefault:   pgtype.Bool{Bool: true, Valid: true},
		}

		result := dbBillingProfileToGQL(dbBP)

		if result == nil {
			t.Fatal("expected non-nil result")
		}
		expectedID := uuidToString(makeUUID(0x60))
		if result.ID != expectedID {
			t.Errorf("expected ID %q, got %q", expectedID, result.ID)
		}
		if result.IsCompany != true {
			t.Error("expected IsCompany true")
		}
		if result.CompanyName == nil || *result.CompanyName != "Test SRL" {
			t.Errorf("expected CompanyName 'Test SRL', got %v", result.CompanyName)
		}
		if result.Cui == nil || *result.Cui != "RO12345678" {
			t.Errorf("expected Cui 'RO12345678', got %v", result.Cui)
		}
		if result.RegNumber == nil || *result.RegNumber != "J40/1234/2020" {
			t.Errorf("expected RegNumber 'J40/1234/2020', got %v", result.RegNumber)
		}
		if result.Address == nil || *result.Address != "Str. Exemplu 10" {
			t.Errorf("expected Address 'Str. Exemplu 10', got %v", result.Address)
		}
		if result.City == nil || *result.City != "Bucharest" {
			t.Errorf("expected City 'Bucharest', got %v", result.City)
		}
		if result.County == nil || *result.County != "Bucharest" {
			t.Errorf("expected County 'Bucharest', got %v", result.County)
		}
		if result.IsVatPayer != true {
			t.Error("expected IsVatPayer true")
		}
		if result.BankName == nil || *result.BankName != "Banca Transilvania" {
			t.Errorf("expected BankName 'Banca Transilvania', got %v", result.BankName)
		}
		if result.Iban == nil || *result.Iban != "RO49AAAA1B31007593840000" {
			t.Errorf("expected Iban 'RO49AAAA1B31007593840000', got %v", result.Iban)
		}
		if result.IsDefault != true {
			t.Error("expected IsDefault true")
		}
	})

	t.Run("converts individual billing profile with nil optional fields", func(t *testing.T) {
		dbBP := db.ClientBillingProfile{
			ID:          makeUUID(0x61),
			IsCompany:   false,
			CompanyName: pgtype.Text{Valid: false},
			Cui:         pgtype.Text{Valid: false},
			RegNumber:   pgtype.Text{Valid: false},
			Address:     pgtype.Text{Valid: false},
			City:        pgtype.Text{Valid: false},
			County:      pgtype.Text{Valid: false},
			IsVatPayer:  pgtype.Bool{Valid: false},
			BankName:    pgtype.Text{Valid: false},
			Iban:        pgtype.Text{Valid: false},
			IsDefault:   pgtype.Bool{Valid: false},
		}

		result := dbBillingProfileToGQL(dbBP)

		if result.IsCompany != false {
			t.Error("expected IsCompany false")
		}
		if result.CompanyName != nil {
			t.Errorf("expected nil CompanyName, got %v", result.CompanyName)
		}
		if result.Cui != nil {
			t.Errorf("expected nil Cui, got %v", result.Cui)
		}
		if result.RegNumber != nil {
			t.Errorf("expected nil RegNumber, got %v", result.RegNumber)
		}
		if result.Address != nil {
			t.Errorf("expected nil Address, got %v", result.Address)
		}
		if result.City != nil {
			t.Errorf("expected nil City, got %v", result.City)
		}
		if result.County != nil {
			t.Errorf("expected nil County, got %v", result.County)
		}
		if result.IsVatPayer != false {
			t.Error("expected IsVatPayer false for invalid")
		}
		if result.BankName != nil {
			t.Errorf("expected nil BankName, got %v", result.BankName)
		}
		if result.Iban != nil {
			t.Errorf("expected nil Iban, got %v", result.Iban)
		}
		if result.IsDefault != false {
			t.Error("expected IsDefault false for invalid")
		}
	})

	t.Run("converts billing profile with IsCompany true but empty company fields", func(t *testing.T) {
		dbBP := db.ClientBillingProfile{
			ID:          makeUUID(0x62),
			IsCompany:   true,
			CompanyName: makeText(""),
			Cui:         makeText(""),
			RegNumber:   pgtype.Text{Valid: false},
			Address:     makeText("Some address"),
			City:        makeText("Cluj"),
			County:      makeText("Cluj"),
			IsVatPayer:  pgtype.Bool{Bool: false, Valid: true},
			BankName:    pgtype.Text{Valid: false},
			Iban:        pgtype.Text{Valid: false},
			IsDefault:   pgtype.Bool{Bool: false, Valid: true},
		}

		result := dbBillingProfileToGQL(dbBP)

		if result.IsCompany != true {
			t.Error("expected IsCompany true")
		}
		if result.CompanyName == nil || *result.CompanyName != "" {
			t.Errorf("expected CompanyName pointer to empty string, got %v", result.CompanyName)
		}
		if result.Cui == nil || *result.Cui != "" {
			t.Errorf("expected Cui pointer to empty string, got %v", result.Cui)
		}
		if result.IsVatPayer != false {
			t.Error("expected IsVatPayer false")
		}
		if result.IsDefault != false {
			t.Error("expected IsDefault false")
		}
	})
}

// ---------------------------------------------------------------------------
// validateStatusTransition
// ---------------------------------------------------------------------------

func TestValidateStatusTransition(t *testing.T) {
	tests := []struct {
		name    string
		current db.BookingStatus
		target  db.BookingStatus
		wantErr bool
	}{
		{"assigned to confirmed", db.BookingStatusAssigned, db.BookingStatusConfirmed, false},
		// Normal forward transitions.
		{"confirmed to in_progress", db.BookingStatusConfirmed, db.BookingStatusInProgress, false},
		{"in_progress to completed", db.BookingStatusInProgress, db.BookingStatusCompleted, false},
		// Invalid transitions.
		{"confirmed to assigned", db.BookingStatusConfirmed, db.BookingStatusAssigned, true},
		// Cancellation from any active state.
		{"confirmed cancel by company", db.BookingStatusConfirmed, db.BookingStatusCancelledByCompany, false},
		{"in_progress cancel by admin", db.BookingStatusInProgress, db.BookingStatusCancelledByAdmin, false},
		// Terminal states cannot transition.
		{"completed cannot transition", db.BookingStatusCompleted, db.BookingStatusInProgress, true},
		{"cancelled cannot transition", db.BookingStatusCancelledByClient, db.BookingStatusConfirmed, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateStatusTransition(tt.current, tt.target)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateStatusTransition(%s, %s) error = %v, wantErr %v", tt.current, tt.target, err, tt.wantErr)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Document status converter
// ---------------------------------------------------------------------------

func TestDbDocStatusToGQL(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected model.DocumentStatus
	}{
		{"pending maps to PENDING", "pending", model.DocumentStatusPending},
		{"approved maps to APPROVED", "approved", model.DocumentStatusApproved},
		{"rejected maps to REJECTED", "rejected", model.DocumentStatusRejected},
		{"unknown defaults to PENDING", "unknown", model.DocumentStatusPending},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := dbDocStatusToGQL(tt.input)
			if result != tt.expected {
				t.Errorf("dbDocStatusToGQL(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Worker document converter
// ---------------------------------------------------------------------------

func TestDbWorkerDocToGQL(t *testing.T) {
	t.Run("converts worker document with all fields populated", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Microsecond)
		reviewedAt := now.Add(3 * time.Hour)

		dbDoc := db.WorkerDocument{
			ID:              makeUUID(0xC1),
			WorkerID:       makeUUID(0xC2),
			DocumentType:    "identity_card",
			FileUrl:         "https://example.com/docs/id_card.pdf",
			FileName:        "id_card.pdf",
			Status:          "approved",
			UploadedAt:      makeTimestamptz(now),
			ReviewedAt:      makeTimestamptz(reviewedAt),
			RejectionReason: makeText("Photo too blurry"),
		}

		result := dbWorkerDocToGQL(dbDoc)

		if result == nil {
			t.Fatal("expected non-nil result")
		}
		expectedID := uuidToString(makeUUID(0xC1))
		if result.ID != expectedID {
			t.Errorf("expected ID %q, got %q", expectedID, result.ID)
		}
		if result.DocumentType != "identity_card" {
			t.Errorf("expected DocumentType 'identity_card', got %q", result.DocumentType)
		}
		if result.FileURL != "https://example.com/docs/id_card.pdf" {
			t.Errorf("expected FileURL, got %q", result.FileURL)
		}
		if result.FileName != "id_card.pdf" {
			t.Errorf("expected FileName 'id_card.pdf', got %q", result.FileName)
		}
		if result.Status != model.DocumentStatusApproved {
			t.Errorf("expected Status APPROVED, got %q", result.Status)
		}
		if !result.UploadedAt.Equal(now) {
			t.Errorf("expected UploadedAt %v, got %v", now, result.UploadedAt)
		}
		if result.ReviewedAt == nil {
			t.Fatal("expected non-nil ReviewedAt")
		}
		if !result.ReviewedAt.Equal(reviewedAt) {
			t.Errorf("expected ReviewedAt %v, got %v", reviewedAt, *result.ReviewedAt)
		}
		if result.RejectionReason == nil {
			t.Fatal("expected non-nil RejectionReason")
		}
		if *result.RejectionReason != "Photo too blurry" {
			t.Errorf("expected RejectionReason 'Photo too blurry', got %q", *result.RejectionReason)
		}
	})

	t.Run("converts worker document with null optional fields", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Microsecond)

		dbDoc := db.WorkerDocument{
			ID:              makeUUID(0xC3),
			WorkerID:       makeUUID(0xC4),
			DocumentType:    "criminal_record",
			FileUrl:         "https://example.com/docs/record.pdf",
			FileName:        "record.pdf",
			Status:          "pending",
			UploadedAt:      makeTimestamptz(now),
			ReviewedAt:      pgtype.Timestamptz{Valid: false},
			RejectionReason: pgtype.Text{Valid: false},
		}

		result := dbWorkerDocToGQL(dbDoc)

		if result == nil {
			t.Fatal("expected non-nil result")
		}
		if result.Status != model.DocumentStatusPending {
			t.Errorf("expected Status PENDING, got %q", result.Status)
		}
		if !result.UploadedAt.Equal(now) {
			t.Errorf("expected UploadedAt %v, got %v", now, result.UploadedAt)
		}
		if result.ReviewedAt != nil {
			t.Errorf("expected nil ReviewedAt, got %v", *result.ReviewedAt)
		}
		if result.RejectionReason != nil {
			t.Errorf("expected nil RejectionReason, got %q", *result.RejectionReason)
		}
	})

	t.Run("converts worker document with rejected status", func(t *testing.T) {
		now := time.Now().UTC().Truncate(time.Microsecond)
		reviewedAt := now.Add(time.Hour)

		dbDoc := db.WorkerDocument{
			ID:              makeUUID(0xC5),
			WorkerID:       makeUUID(0xC6),
			DocumentType:    "medical_certificate",
			FileUrl:         "https://example.com/docs/med.pdf",
			FileName:        "med.pdf",
			Status:          "rejected",
			UploadedAt:      makeTimestamptz(now),
			ReviewedAt:      makeTimestamptz(reviewedAt),
			RejectionReason: makeText("Document expired"),
		}

		result := dbWorkerDocToGQL(dbDoc)

		if result == nil {
			t.Fatal("expected non-nil result")
		}
		if result.Status != model.DocumentStatusRejected {
			t.Errorf("expected Status REJECTED, got %q", result.Status)
		}
		if result.ReviewedAt == nil {
			t.Fatal("expected non-nil ReviewedAt")
		}
		if !result.ReviewedAt.Equal(reviewedAt) {
			t.Errorf("expected ReviewedAt %v, got %v", reviewedAt, *result.ReviewedAt)
		}
		if result.RejectionReason == nil {
			t.Fatal("expected non-nil RejectionReason")
		}
		if *result.RejectionReason != "Document expired" {
			t.Errorf("expected RejectionReason 'Document expired', got %q", *result.RejectionReason)
		}
	})
}
