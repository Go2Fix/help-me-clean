package resolver

import (
	"context"
	"fmt"

	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/graph/model"
)

// dbCityToGQL converts a db.EnabledCity to a GQL model with areas loaded.
func (r *Resolver) dbCityToGQL(ctx context.Context, c db.EnabledCity) (*model.EnabledCity, error) {
	areas, err := r.Queries.ListAreasByCity(ctx, c.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to list areas for city %s: %w", c.Name, err)
	}

	var gqlAreas []*model.CityArea
	for _, a := range areas {
		gqlAreas = append(gqlAreas, &model.CityArea{
			ID:       uuidToString(a.ID),
			Name:     a.Name,
			CityID:   uuidToString(a.CityID),
			CityName: a.CityName,
		})
	}

	return &model.EnabledCity{
		ID:       uuidToString(c.ID),
		Name:     c.Name,
		County:   c.County,
		IsActive: c.IsActive,
		Areas:    gqlAreas,
	}, nil
}
