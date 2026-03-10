package resolver

import (
	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/graph/model"
)

// dbWaitlistLeadToGQL converts a db.WaitlistLead row to the GraphQL model.
func dbWaitlistLeadToGQL(row db.WaitlistLead) *model.WaitlistLead {
	leadType := model.WaitlistLeadTypeClient
	if row.LeadType == db.WaitlistLeadTypeCompany {
		leadType = model.WaitlistLeadTypeCompany
	}

	return &model.WaitlistLead{
		ID:          uuidToString(row.ID),
		LeadType:    leadType,
		Name:        row.Name,
		Email:       row.Email,
		Phone:       textPtr(row.Phone),
		City:        textPtr(row.City),
		CompanyName: textPtr(row.CompanyName),
		Message:     textPtr(row.Message),
		CreatedAt:   timestamptzToTime(row.CreatedAt),
	}
}

// dbWaitlistLeadsRowToGQL converts a db.ListWaitlistLeadsRow (with isConverted) to the GraphQL model.
// IsConverted is a boolean computed column returned as interface{} by sqlc (pgx bool).
func dbWaitlistLeadsRowToGQL(row db.ListWaitlistLeadsRow) *model.WaitlistLead {
	lead := dbWaitlistLeadToGQL(db.WaitlistLead{
		ID:          row.ID,
		LeadType:    row.LeadType,
		Name:        row.Name,
		Email:       row.Email,
		Phone:       row.Phone,
		City:        row.City,
		CompanyName: row.CompanyName,
		Message:     row.Message,
		CreatedAt:   row.CreatedAt,
	})

	// IsConverted is a computed boolean column. sqlc types it as interface{} when
	// the underlying expression returns a pg bool. Cast safely.
	if v, ok := row.IsConverted.(bool); ok {
		lead.IsConverted = &v
	}
	return lead
}
