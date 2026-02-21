package auth

import (
	"os"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const testSecret = "test-jwt-secret-key-for-unit-tests"

func setJWTSecret(t *testing.T, secret string) {
	t.Helper()
	original := os.Getenv("JWT_SECRET")
	os.Setenv("JWT_SECRET", secret)
	t.Cleanup(func() {
		if original == "" {
			os.Unsetenv("JWT_SECRET")
		} else {
			os.Setenv("JWT_SECRET", original)
		}
	})
}

func TestGenerateToken(t *testing.T) {
	t.Run("succeeds with valid inputs", func(t *testing.T) {
		setJWTSecret(t, testSecret)

		token, err := GenerateToken("user-123", "test@example.com", "client")
		if err != nil {
			t.Fatalf("GenerateToken returned unexpected error: %v", err)
		}
		if token == "" {
			t.Fatal("GenerateToken returned empty token")
		}
	})

	t.Run("returns error when JWT_SECRET is not set", func(t *testing.T) {
		setJWTSecret(t, "")

		_, err := GenerateToken("user-123", "test@example.com", "client")
		if err == nil {
			t.Fatal("expected error when JWT_SECRET is empty, got nil")
		}
		if err.Error() != "JWT_SECRET is not set" {
			t.Fatalf("expected 'JWT_SECRET is not set' error, got: %v", err)
		}
	})

	t.Run("generates different tokens for different users", func(t *testing.T) {
		setJWTSecret(t, testSecret)

		token1, err := GenerateToken("user-1", "user1@example.com", "client")
		if err != nil {
			t.Fatalf("GenerateToken returned unexpected error: %v", err)
		}

		token2, err := GenerateToken("user-2", "user2@example.com", "company_admin")
		if err != nil {
			t.Fatalf("GenerateToken returned unexpected error: %v", err)
		}

		if token1 == token2 {
			t.Fatal("expected different tokens for different users")
		}
	})

	t.Run("generates different tokens for different roles", func(t *testing.T) {
		setJWTSecret(t, testSecret)

		token1, err := GenerateToken("user-1", "user@example.com", "client")
		if err != nil {
			t.Fatalf("GenerateToken returned unexpected error: %v", err)
		}

		token2, err := GenerateToken("user-1", "user@example.com", "global_admin")
		if err != nil {
			t.Fatalf("GenerateToken returned unexpected error: %v", err)
		}

		if token1 == token2 {
			t.Fatal("expected different tokens for different roles")
		}
	})
}

func TestValidateToken(t *testing.T) {
	t.Run("round trip: generate then validate", func(t *testing.T) {
		setJWTSecret(t, testSecret)

		tokenStr, err := GenerateToken("user-abc", "abc@example.com", "client")
		if err != nil {
			t.Fatalf("GenerateToken returned unexpected error: %v", err)
		}

		claims, err := ValidateToken(tokenStr)
		if err != nil {
			t.Fatalf("ValidateToken returned unexpected error: %v", err)
		}

		if claims.UserID != "user-abc" {
			t.Errorf("expected UserID 'user-abc', got %q", claims.UserID)
		}
		if claims.Email != "abc@example.com" {
			t.Errorf("expected Email 'abc@example.com', got %q", claims.Email)
		}
		if claims.Role != "client" {
			t.Errorf("expected Role 'client', got %q", claims.Role)
		}
		if claims.Issuer != "go2fix" {
			t.Errorf("expected Issuer 'go2fix', got %q", claims.Issuer)
		}
	})

	t.Run("claims contain correct values for all roles", func(t *testing.T) {
		setJWTSecret(t, testSecret)

		tests := []struct {
			name   string
			userID string
			email  string
			role   string
		}{
			{"client", "u-1", "client@test.com", "client"},
			{"company_admin", "u-2", "admin@test.com", "company_admin"},
			{"cleaner", "u-3", "cleaner@test.com", "cleaner"},
			{"global_admin", "u-4", "global@test.com", "global_admin"},
		}

		for _, tc := range tests {
			t.Run(tc.name, func(t *testing.T) {
				tokenStr, err := GenerateToken(tc.userID, tc.email, tc.role)
				if err != nil {
					t.Fatalf("GenerateToken returned unexpected error: %v", err)
				}

				claims, err := ValidateToken(tokenStr)
				if err != nil {
					t.Fatalf("ValidateToken returned unexpected error: %v", err)
				}

				if claims.UserID != tc.userID {
					t.Errorf("expected UserID %q, got %q", tc.userID, claims.UserID)
				}
				if claims.Email != tc.email {
					t.Errorf("expected Email %q, got %q", tc.email, claims.Email)
				}
				if claims.Role != tc.role {
					t.Errorf("expected Role %q, got %q", tc.role, claims.Role)
				}
			})
		}
	})

	t.Run("token has valid expiry in the future", func(t *testing.T) {
		setJWTSecret(t, testSecret)

		tokenStr, err := GenerateToken("user-1", "user@test.com", "client")
		if err != nil {
			t.Fatalf("GenerateToken returned unexpected error: %v", err)
		}

		claims, err := ValidateToken(tokenStr)
		if err != nil {
			t.Fatalf("ValidateToken returned unexpected error: %v", err)
		}

		if claims.ExpiresAt == nil {
			t.Fatal("expected ExpiresAt to be set")
		}

		expiresAt := claims.ExpiresAt.Time
		now := time.Now()

		if !expiresAt.After(now) {
			t.Errorf("expected expiry to be in the future, got %v", expiresAt)
		}

		// Should expire approximately 24 hours from now (within a 1-minute tolerance).
		expectedExpiry := now.Add(24 * time.Hour)
		diff := expiresAt.Sub(expectedExpiry)
		if diff < -time.Minute || diff > time.Minute {
			t.Errorf("expected expiry ~24h from now, got diff of %v", diff)
		}
	})

	t.Run("token has issued at in the past", func(t *testing.T) {
		setJWTSecret(t, testSecret)

		tokenStr, err := GenerateToken("user-1", "user@test.com", "client")
		if err != nil {
			t.Fatalf("GenerateToken returned unexpected error: %v", err)
		}

		claims, err := ValidateToken(tokenStr)
		if err != nil {
			t.Fatalf("ValidateToken returned unexpected error: %v", err)
		}

		if claims.IssuedAt == nil {
			t.Fatal("expected IssuedAt to be set")
		}

		issuedAt := claims.IssuedAt.Time
		now := time.Now()

		if issuedAt.After(now.Add(time.Second)) {
			t.Errorf("expected IssuedAt to be <= now, got %v (now: %v)", issuedAt, now)
		}
	})

	t.Run("rejects expired token", func(t *testing.T) {
		setJWTSecret(t, testSecret)

		// Manually create an already-expired token.
		claims := Claims{
			UserID: "user-expired",
			Email:  "expired@test.com",
			Role:   "client",
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now().Add(-25 * time.Hour)),
				Issuer:    "go2fix",
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, err := token.SignedString([]byte(testSecret))
		if err != nil {
			t.Fatalf("failed to create expired token: %v", err)
		}

		_, err = ValidateToken(tokenStr)
		if err == nil {
			t.Fatal("expected error for expired token, got nil")
		}
	})

	t.Run("rejects malformed token", func(t *testing.T) {
		setJWTSecret(t, testSecret)

		malformedTokens := []struct {
			name  string
			token string
		}{
			{"empty string", ""},
			{"random string", "not-a-jwt-token"},
			{"partial jwt", "eyJhbGciOiJIUzI1NiJ9.invalid"},
			{"three dots no content", "a.b.c"},
		}

		for _, tc := range malformedTokens {
			t.Run(tc.name, func(t *testing.T) {
				_, err := ValidateToken(tc.token)
				if err == nil {
					t.Fatalf("expected error for malformed token %q, got nil", tc.token)
				}
			})
		}
	})

	t.Run("rejects token signed with wrong key", func(t *testing.T) {
		// Generate token with one secret.
		setJWTSecret(t, "secret-A")

		tokenStr, err := GenerateToken("user-1", "user@test.com", "client")
		if err != nil {
			t.Fatalf("GenerateToken returned unexpected error: %v", err)
		}

		// Validate with a different secret.
		os.Setenv("JWT_SECRET", "secret-B")

		_, err = ValidateToken(tokenStr)
		if err == nil {
			t.Fatal("expected error when validating with wrong secret, got nil")
		}
	})

	t.Run("rejects token with non-HMAC signing method", func(t *testing.T) {
		setJWTSecret(t, testSecret)

		// Create a token that claims to use "none" algorithm.
		token := jwt.NewWithClaims(jwt.SigningMethodNone, &Claims{
			UserID: "user-1",
			Email:  "user@test.com",
			Role:   "client",
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now()),
				Issuer:    "go2fix",
			},
		})
		// jwt.UnsafeAllowNoneSignatureType is required to sign with "none".
		tokenStr, err := token.SignedString(jwt.UnsafeAllowNoneSignatureType)
		if err != nil {
			t.Fatalf("failed to sign token with none method: %v", err)
		}

		_, err = ValidateToken(tokenStr)
		if err == nil {
			t.Fatal("expected error for token with 'none' signing method, got nil")
		}
	})
}
