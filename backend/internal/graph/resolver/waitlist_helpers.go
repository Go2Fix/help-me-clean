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
