package notification

import (
	"context"
	"log"

	resend "github.com/resend/resend-go/v3"
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

// resolveAudienceForType returns the appropriate audience ID for the given user type.
// Waitlist types are routed to their dedicated audiences when configured; everything
// else uses the main audience.
func (e *EmailChannel) resolveAudienceForType(userType string) string {
	switch userType {
	case "waitlist_client":
		if e.audienceWaitlistClientID != "" {
			return e.audienceWaitlistClientID
		}
	case "waitlist_company":
		if e.audienceWaitlistCompanyID != "" {
			return e.audienceWaitlistCompanyID
		}
	}
	return e.audienceID
}

// UpsertContact creates or updates a contact in the Resend audience.
// The target audience is chosen based on UserType — waitlist leads are routed
// to their dedicated audiences when the env vars are configured.
// Runs best-effort — errors are logged but not propagated to the caller.
func (e *EmailChannel) UpsertContact(ctx context.Context, data ContactData) {
	if e == nil || e.audienceID == "" {
		return
	}

	audienceID := e.resolveAudienceForType(data.UserType)
	if audienceID == "" {
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
		AudienceId:   audienceID,
		Unsubscribed: false,
	}

	if _, err := e.client.Contacts.Create(params); err != nil {
		log.Printf("[notification/contacts] upsert failed for %s: %v", data.Email, err)
	}
}

// DeleteContact removes a contact from the given audience by email.
// Because the Resend SDK requires a contact ID (not email) for deletion, this
// method first lists all contacts in the audience to look up the matching ID,
// then issues the Remove call. Best-effort — errors are logged but not propagated.
func (e *EmailChannel) DeleteContact(ctx context.Context, audienceID, email string) {
	if e == nil || audienceID == "" || email == "" {
		return
	}

	// List contacts to find the one matching the email.
	resp, err := e.client.Contacts.List(&resend.ListContactsOptions{AudienceId: audienceID})
	if err != nil {
		log.Printf("[notification/contacts] delete: failed to list contacts in audience %s: %v", audienceID, err)
		return
	}

	var contactID string
	for _, c := range resp.Data {
		if c.Email == email {
			contactID = c.Id
			break
		}
	}

	if contactID == "" {
		// Contact not found in this audience — nothing to delete.
		return
	}

	if _, err := e.client.Contacts.Remove(&resend.RemoveContactOptions{AudienceId: audienceID, Id: contactID}); err != nil {
		log.Printf("[notification/contacts] delete: failed to remove contact %s from audience %s: %v", email, audienceID, err)
	}
}
