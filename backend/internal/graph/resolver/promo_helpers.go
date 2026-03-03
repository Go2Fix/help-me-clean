package resolver

import (
	"fmt"
	"math"
	"time"

	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/graph/model"

	"github.com/jackc/pgx/v5/pgtype"
)

// dbPromoCodeToGQL converts a DB PromoCode row to the GraphQL PromoCode model.
func dbPromoCodeToGQL(p db.PromoCode) *model.PromoCode {
	pc := &model.PromoCode{
		ID:             uuidToString(p.ID),
		Code:           p.Code,
		DiscountType:   p.DiscountType,
		DiscountValue:  numericToFloat(p.DiscountValue),
		MinOrderAmount: numericToFloat(p.MinOrderAmount),
		UsesCount:      int(p.UsesCount),
		MaxUsesPerUser: int(p.MaxUsesPerUser),
		IsActive:       p.IsActive,
		ActiveFrom:     p.ActiveFrom.Time,
		CreatedAt:      p.CreatedAt.Time,
	}
	if p.Description.Valid {
		pc.Description = &p.Description.String
	}
	if p.MaxUses.Valid {
		v := int(p.MaxUses.Int32)
		pc.MaxUses = &v
	}
	if p.ActiveUntil.Valid {
		t := p.ActiveUntil.Time
		pc.ActiveUntil = &t
	}
	return pc
}

// calculatePromoDiscount computes the discount amount for an order given the promo code parameters.
func calculatePromoDiscount(discountType string, discountValue float64, orderAmount float64) float64 {
	switch discountType {
	case "percent":
		disc := orderAmount * discountValue / 100.0
		return math.Round(disc*100) / 100
	case "fixed_amount":
		if discountValue > orderAmount {
			return orderAmount
		}
		return discountValue
	}
	return 0
}

// validatePromoCodeActive checks whether a promo code is currently valid (active, within dates, within use limit).
// Returns (valid, errorMessage).
func validatePromoCodeActive(p db.PromoCode) (bool, string) {
	if !p.IsActive {
		return false, "Codul promoțional nu este activ"
	}
	now := time.Now()
	if p.ActiveFrom.Valid && p.ActiveFrom.Time.After(now) {
		return false, "Codul promoțional nu este încă valabil"
	}
	if p.ActiveUntil.Valid && p.ActiveUntil.Time.Before(now) {
		return false, "Codul promoțional a expirat"
	}
	if p.MaxUses.Valid && p.UsesCount >= p.MaxUses.Int32 {
		return false, "Codul promoțional a atins limita maximă de utilizări"
	}
	return true, ""
}

// parsePromoDateTime parses a date string in YYYY-MM-DD or RFC3339 format.
func parsePromoDateTime(s string) (pgtype.Timestamptz, error) {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		t, err = time.Parse(time.RFC3339, s)
		if err != nil {
			return pgtype.Timestamptz{}, fmt.Errorf("invalid date %q: expected YYYY-MM-DD or RFC3339", s)
		}
	}
	return pgtype.Timestamptz{Time: t, Valid: true}, nil
}
