package testutil

import (
	"context"

	"go2fix-backend/internal/auth"
)

// AuthContext returns a context carrying auth claims with the given role and userID.
// This mirrors the production middleware behaviour: the context carries *auth.Claims
// under the auth.UserContextKey key.
func AuthContext(role, userID string) context.Context {
	claims := &auth.Claims{
		Role:   role,
		UserID: userID,
	}
	return context.WithValue(context.Background(), auth.UserContextKey, claims)
}
