package notification

import (
	"context"
	"log"

	resend "github.com/resend/resend-go/v3"
)

// ContactData carries the fields needed to create or update a Resend contact.
type ContactData struct {
	Email    string
	Name     string
	UserType string // "client" | "company_admin" | "worker" | "waitlist_client" | "waitlist_company"
	City     string
	Language string
	Status   string // "active" | "suspended"
}

// resolveSegmentForType returns the appropriate segment ID for the given user type.
// Waitlist types are routed to their dedicated segments when configured; everything
// else uses the main segment.
func (e *EmailChannel) resolveSegmentForType(userType string) string {
	switch userType {
	case "waitlist_client":
		if e.segmentWaitlistClientID != "" {
			return e.segmentWaitlistClientID
		}
	case "waitlist_company":
		if e.segmentWaitlistCompanyID != "" {
			return e.segmentWaitlistCompanyID
		}
	}
	return e.segmentID
}

// UpsertContact creates or updates a global Resend contact and adds them to the
// appropriate segment based on UserType. Waitlist leads are routed to their
// dedicated segments when configured.
// Runs best-effort — errors are logged but not propagated to the caller.
func (e *EmailChannel) UpsertContact(ctx context.Context, data ContactData) {
	if e == nil {
		return
	}

	segmentID := e.resolveSegmentForType(data.UserType)

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

	// Create as a global contact (AudienceId is deprecated in v3).
	if _, err := e.client.Contacts.Create(&resend.CreateContactRequest{
		Email:     data.Email,
		FirstName: firstName,
		LastName:  lastName,
	}); err != nil {
		log.Printf("[notification/contacts] upsert failed for %s: %v", data.Email, err)
		return
	}

	// Add to the appropriate segment.
	if segmentID != "" {
		if _, err := e.client.Contacts.Segments.Add(&resend.AddContactSegmentRequest{
			SegmentId: segmentID,
			Email:     data.Email,
		}); err != nil {
			log.Printf("[notification/contacts] segment add failed for %s segment=%s: %v", data.Email, segmentID, err)
		}
	}
}

// DeleteContact removes a contact from the given segment and then globally.
// The v3 SDK accepts email directly as the contact identifier — no listing needed.
// Best-effort — errors are logged but not propagated.
func (e *EmailChannel) DeleteContact(ctx context.Context, segmentID, email string) {
	if e == nil || email == "" {
		return
	}

	// Remove from segment first (if a segment is specified).
	if segmentID != "" {
		if _, err := e.client.Contacts.Segments.Remove(&resend.RemoveContactSegmentRequest{
			SegmentId: segmentID,
			Email:     email,
		}); err != nil {
			log.Printf("[notification/contacts] delete: failed to remove %s from segment %s: %v", email, segmentID, err)
		}
	}

	// Remove globally.
	if _, err := e.client.Contacts.Remove(&resend.RemoveContactOptions{Id: email}); err != nil {
		log.Printf("[notification/contacts] delete: failed to remove contact %s globally: %v", email, err)
	}
}
