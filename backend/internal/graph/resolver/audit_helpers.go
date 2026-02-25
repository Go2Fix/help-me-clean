package resolver

import (
	"context"
	"log"

	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/auth"

	"github.com/jackc/pgx/v5/pgtype"
)

// logPriceChange records a price audit entry in a fire-and-forget manner.
// It logs errors instead of returning them so callers are not blocked.
func (r *Resolver) logPriceChange(ctx context.Context, entityType string, entityID pgtype.UUID, fieldName, oldValue, newValue string) {
	var changedBy pgtype.UUID
	if claims := auth.GetUserFromContext(ctx); claims != nil {
		changedBy = stringToUUID(claims.UserID)
	}

	_, err := r.Queries.CreatePriceAuditEntry(ctx, db.CreatePriceAuditEntryParams{
		EntityType: entityType,
		EntityID:   entityID,
		FieldName:  fieldName,
		OldValue:   pgtype.Text{String: oldValue, Valid: oldValue != ""},
		NewValue:   pgtype.Text{String: newValue, Valid: newValue != ""},
		ChangedBy:  changedBy,
		Reason:     pgtype.Text{},
	})
	if err != nil {
		log.Printf("failed to log price change for %s/%s field %s: %v", entityType, uuidToString(entityID), fieldName, err)
	}
}
