package notification

import (
	"context"
	"log"

	resend "github.com/resend/resend-go/v2"
)

// ContactData carries the fields needed to create or update a Resend audience contact.
type ContactData struct {
	Email    string
	Name     string
	UserType string // "client" | "company_admin" | "worker" | "waitlist_client" | "waitlist_company"
	City     string
	Language string
	Status   string // "active" | "suspended"
}

// UpsertContact creates or updates a contact in the Resend audience.
// Runs best-effort — errors are logged but not propagated to the caller.
func (e *EmailChannel) UpsertContact(ctx context.Context, data ContactData) {
	if e == nil || e.audienceID == "" {
		return
	}

	// Split name into first / last on the first space.
	firstName := data.Name
	lastName := ""
	for i, c := range data.Name {
		if c == ' ' {
			firstName = data.Name[:i]
			lastName = data.Name[i+1:]
			break
		}
	}

	params := &resend.CreateContactRequest{
		Email:        data.Email,
		FirstName:    firstName,
		LastName:     lastName,
		AudienceId:   e.audienceID,
		Unsubscribed: false,
	}

	if _, err := e.client.Contacts.Create(params); err != nil {
		log.Printf("[notification/contacts] upsert failed for %s: %v", data.Email, err)
	}
}
