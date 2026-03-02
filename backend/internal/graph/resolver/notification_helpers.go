package resolver

import (
	"context"
	"fmt"
	"log"
	"strings"

	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/service/notification"
)

// roleToWelcomeEvent maps a user role to the appropriate welcome notification event.
func roleToWelcomeEvent(role db.UserRole) notification.Event {
	switch role {
	case db.UserRoleCompanyAdmin:
		return notification.EventWelcomeCompanyAdmin
	case db.UserRoleWorker:
		return notification.EventWelcomeWorker
	default:
		return notification.EventWelcomeClient
	}
}

// dispatchWelcomeAndUpsert fires the welcome email and upserts the contact in the audience.
// Called asynchronously after new user creation.
func (r *Resolver) dispatchWelcomeAndUpsert(user db.User) {
	go func() {
		lang := textVal(user.PreferredLanguage)
		if lang == "" {
			lang = "ro"
		}
		event := roleToWelcomeEvent(user.Role)
		r.NotifSvc.Dispatch(event,
			notification.Payload{"name": user.FullName},
			[]notification.Target{{
				Email:    user.Email,
				Name:     user.FullName,
				Role:     string(user.Role),
				Language: lang,
			}},
		)
		r.NotifSvc.UpsertContact(context.Background(), notification.ContactData{
			Email:    user.Email,
			Name:     user.FullName,
			UserType: string(user.Role),
			Language: lang,
			Status:   "active",
		})
	}()
}

// loadCompanyAdminEmail loads the admin user for a company and returns their email and name.
// Returns empty strings if the admin cannot be loaded.
func (r *Resolver) loadCompanyAdminEmail(ctx context.Context, company db.Company) (email, name string) {
	if !company.AdminUserID.Valid {
		return "", ""
	}
	adminUser, err := r.Queries.GetUserByID(ctx, company.AdminUserID)
	if err != nil {
		log.Printf("[notif] could not load admin user for company %s: %v", uuidToString(company.ID), err)
		return "", ""
	}
	return adminUser.Email, adminUser.FullName
}

// formatTotal formats a bani value (integer) into a "RON X.XX" string for display.
func formatTotalRON(totalBani int) string {
	return fmt.Sprintf("RON %.2f", float64(totalBani)/100.0)
}

// workerUserEmail loads the user linked to a worker and returns email and full name.
func (r *Resolver) workerUserEmail(ctx context.Context, workerID interface{ GetWorkerByID() (db.Worker, error) }) (string, string) {
	return "", ""
}

// buildInviteURL constructs the worker invitation accept URL from the invite token.
func buildInviteURL(token string) string {
	return "https://go2fix.ro/lucratori/accepta-invitatia?token=" + token
}

// dispatchBookingConfirmed sends EventBookingConfirmedClient to the client and
// EventBookingNewRequestCompany to the company admin after a booking is created.
// Must be called in a goroutine (non-blocking).
func (r *Resolver) dispatchBookingCreatedNotifications(booking db.Booking) {
	go func() {
		ctx := context.Background()

		// Determine client contact info.
		clientEmail := ""
		clientName := ""
		if booking.ClientUserID.Valid {
			if clientUser, err := r.Queries.GetUserByID(ctx, booking.ClientUserID); err == nil {
				clientEmail = clientUser.Email
				clientName = clientUser.FullName
			}
		}

		scheduledDate := dateToString(booking.ScheduledDate)
		scheduledTime := timeToString(booking.ScheduledStartTime)
		estimatedTotal := fmt.Sprintf("RON %.2f", numericToFloat(booking.EstimatedTotal))
		serviceName := strings.Title(strings.ReplaceAll(string(booking.ServiceType), "_", " "))

		// Notify client.
		if clientEmail != "" {
			r.NotifSvc.Dispatch(notification.EventBookingConfirmedClient,
				notification.Payload{
					"referenceCode":  booking.ReferenceCode,
					"serviceName":    serviceName,
					"scheduledDate":  scheduledDate,
					"scheduledTime":  scheduledTime,
					"estimatedTotal": estimatedTotal,
					"clientName":     clientName,
				},
				[]notification.Target{{Email: clientEmail, Name: clientName}},
			)
		}

		// Notify company admin if already assigned.
		if booking.CompanyID.Valid {
			company, err := r.Queries.GetCompanyByID(ctx, booking.CompanyID)
			if err == nil {
				adminEmail, adminName := r.loadCompanyAdminEmail(ctx, company)
				if adminEmail != "" {
					r.NotifSvc.Dispatch(notification.EventBookingNewRequestCompany,
						notification.Payload{
							"referenceCode":  booking.ReferenceCode,
							"serviceName":    serviceName,
							"scheduledDate":  scheduledDate,
							"scheduledTime":  scheduledTime,
							"estimatedTotal": estimatedTotal,
							"clientName":     clientName,
						},
						[]notification.Target{{Email: adminEmail, Name: adminName}},
					)
				}
			}
		}
	}()
}

// dispatchWorkerAssignedNotifications sends notifications to both client and worker
// after a worker is assigned to a booking.
func (r *Resolver) dispatchWorkerAssignedNotifications(booking db.Booking) {
	go func() {
		ctx := context.Background()

		scheduledDate := dateToString(booking.ScheduledDate)
		serviceName := strings.Title(strings.ReplaceAll(string(booking.ServiceType), "_", " "))

		clientEmail := ""
		clientName := ""
		if booking.ClientUserID.Valid {
			if clientUser, err := r.Queries.GetUserByID(ctx, booking.ClientUserID); err == nil {
				clientEmail = clientUser.Email
				clientName = clientUser.FullName
			}
		}

		workerEmail := ""
		workerName := ""
		if booking.WorkerID.Valid {
			if worker, err := r.Queries.GetWorkerByID(ctx, booking.WorkerID); err == nil {
				if worker.UserID.Valid {
					if workerUser, err := r.Queries.GetUserByID(ctx, worker.UserID); err == nil {
						workerEmail = workerUser.Email
						workerName = workerUser.FullName
					}
				}
			}
		}

		// Notify client about worker assignment.
		if clientEmail != "" {
			r.NotifSvc.Dispatch(notification.EventBookingWorkerAssignedClient,
				notification.Payload{
					"referenceCode": booking.ReferenceCode,
					"workerName":    workerName,
					"scheduledDate": scheduledDate,
					"serviceName":   serviceName,
				},
				[]notification.Target{{Email: clientEmail, Name: clientName}},
			)
		}

		// Notify worker about their new assignment.
		if workerEmail != "" {
			r.NotifSvc.Dispatch(notification.EventJobAssignedWorker,
				notification.Payload{
					"referenceCode": booking.ReferenceCode,
					"clientName":    clientName,
					"scheduledDate": scheduledDate,
					"serviceName":   serviceName,
				},
				[]notification.Target{{Email: workerEmail, Name: workerName}},
			)
		}
	}()
}

// dispatchBookingCompletedNotification notifies the client that the job is done.
func (r *Resolver) dispatchBookingCompletedNotification(booking db.Booking) {
	go func() {
		ctx := context.Background()
		if !booking.ClientUserID.Valid {
			return
		}
		clientUser, err := r.Queries.GetUserByID(ctx, booking.ClientUserID)
		if err != nil {
			log.Printf("[notif] completed: could not load client for booking %s: %v", booking.ReferenceCode, err)
			return
		}
		serviceName := strings.Title(strings.ReplaceAll(string(booking.ServiceType), "_", " "))
		r.NotifSvc.Dispatch(notification.EventBookingCompleted,
			notification.Payload{
				"referenceCode": booking.ReferenceCode,
				"serviceName":   serviceName,
				"clientName":    clientUser.FullName,
			},
			[]notification.Target{{Email: clientUser.Email, Name: clientUser.FullName}},
		)
	}()
}

// dispatchBookingCancelledByClient notifies the company admin and worker when a client cancels.
func (r *Resolver) dispatchBookingCancelledByClient(booking db.Booking, reason string) {
	go func() {
		ctx := context.Background()

		clientName := "Clientul"
		if booking.ClientUserID.Valid {
			if cu, err := r.Queries.GetUserByID(ctx, booking.ClientUserID); err == nil {
				clientName = cu.FullName
			}
		}

		payload := notification.Payload{
			"referenceCode": booking.ReferenceCode,
			"clientName":    clientName,
			"reason":        reason,
		}

		var targets []notification.Target

		// Company admin.
		if booking.CompanyID.Valid {
			if company, err := r.Queries.GetCompanyByID(ctx, booking.CompanyID); err == nil {
				adminEmail, adminName := r.loadCompanyAdminEmail(ctx, company)
				if adminEmail != "" {
					targets = append(targets, notification.Target{Email: adminEmail, Name: adminName})
				}
			}
		}

		// Worker.
		if booking.WorkerID.Valid {
			if worker, err := r.Queries.GetWorkerByID(ctx, booking.WorkerID); err == nil {
				if worker.UserID.Valid {
					if wu, err := r.Queries.GetUserByID(ctx, worker.UserID); err == nil {
						targets = append(targets, notification.Target{Email: wu.Email, Name: wu.FullName})
					}
				}
			}
		}

		if len(targets) > 0 {
			r.NotifSvc.Dispatch(notification.EventBookingCancelledByClient, payload, targets)
		}
	}()
}

// dispatchBookingCancelledByAdmin notifies the client (and optionally company/worker) when admin cancels.
func (r *Resolver) dispatchBookingCancelledByAdmin(booking db.Booking, reason string) {
	go func() {
		ctx := context.Background()
		payload := notification.Payload{
			"referenceCode": booking.ReferenceCode,
			"reason":        reason,
		}

		var targets []notification.Target

		// Client.
		if booking.ClientUserID.Valid {
			if cu, err := r.Queries.GetUserByID(ctx, booking.ClientUserID); err == nil {
				targets = append(targets, notification.Target{Email: cu.Email, Name: cu.FullName})
			}
		}

		// Company admin.
		if booking.CompanyID.Valid {
			if company, err := r.Queries.GetCompanyByID(ctx, booking.CompanyID); err == nil {
				adminEmail, adminName := r.loadCompanyAdminEmail(ctx, company)
				if adminEmail != "" {
					targets = append(targets, notification.Target{Email: adminEmail, Name: adminName})
				}
			}
		}

		// Worker.
		if booking.WorkerID.Valid {
			if worker, err := r.Queries.GetWorkerByID(ctx, booking.WorkerID); err == nil {
				if worker.UserID.Valid {
					if wu, err := r.Queries.GetUserByID(ctx, worker.UserID); err == nil {
						targets = append(targets, notification.Target{Email: wu.Email, Name: wu.FullName})
					}
				}
			}
		}

		if len(targets) > 0 {
			r.NotifSvc.Dispatch(notification.EventBookingCancelledByAdmin, payload, targets)
		}
	}()
}

// dispatchInvoiceReady notifies the buyer that their invoice is ready.
func (r *Resolver) dispatchInvoiceReady(inv db.Invoice) {
	go func() {
		if !inv.BuyerEmail.Valid || inv.BuyerEmail.String == "" {
			log.Printf("[notif] invoice_ready: no buyer email for invoice %s", inv.InvoiceNumber.String)
			return
		}
		invoiceNumber := inv.InvoiceNumber.String
		total := fmt.Sprintf("%.2f RON", float64(inv.TotalAmount)/100.0)
		r.NotifSvc.Dispatch(notification.EventInvoiceReady,
			notification.Payload{
				"invoiceNumber": invoiceNumber,
				"total":         total,
			},
			[]notification.Target{{Email: inv.BuyerEmail.String, Name: inv.BuyerName}},
		)
	}()
}

// dispatchInvoicePaid notifies the company admin that an invoice has been marked as paid.
func (r *Resolver) dispatchInvoicePaid(inv db.Invoice) {
	go func() {
		ctx := context.Background()
		if !inv.CompanyID.Valid {
			return
		}
		company, err := r.Queries.GetCompanyByID(ctx, inv.CompanyID)
		if err != nil {
			log.Printf("[notif] invoice_paid: could not load company for invoice %s: %v", inv.InvoiceNumber.String, err)
			return
		}
		adminEmail, adminName := r.loadCompanyAdminEmail(ctx, company)
		if adminEmail == "" {
			return
		}
		invoiceNumber := inv.InvoiceNumber.String
		total := fmt.Sprintf("%.2f RON", float64(inv.TotalAmount)/100.0)
		r.NotifSvc.Dispatch(notification.EventInvoicePaid,
			notification.Payload{
				"invoiceNumber": invoiceNumber,
				"total":         total,
				"companyName":   company.CompanyName,
			},
			[]notification.Target{{Email: adminEmail, Name: adminName}},
		)
	}()
}

// dispatchWaitlistJoined sends a confirmation email and upserts the contact
// in the audience after a waitlist signup.
func (r *Resolver) dispatchWaitlistJoined(name, email, city string, leadType db.WaitlistLeadType) {
	go func() {
		userType := "waitlist_" + strings.ToLower(string(leadType))
		r.NotifSvc.Dispatch(notification.EventWaitlistJoined,
			notification.Payload{
				"name": name,
				"city": city,
			},
			[]notification.Target{{Email: email, Name: name}},
		)
		r.NotifSvc.UpsertContact(context.Background(), notification.ContactData{
			Email:    email,
			Name:     name,
			UserType: userType,
			City:     city,
			Language: "ro",
			Status:   "active",
		})
	}()
}

// dispatchSubscriptionConfirmed notifies the client when their subscription is created.
func (r *Resolver) dispatchSubscriptionConfirmed(sub db.Subscription) {
	go func() {
		ctx := context.Background()
		if !sub.ClientUserID.Valid {
			return
		}
		user, err := r.Queries.GetUserByID(ctx, sub.ClientUserID)
		if err != nil {
			log.Printf("[notif] subscription_confirmed: could not load user for subscription %s: %v", uuidToString(sub.ID), err)
			return
		}
		r.NotifSvc.Dispatch(notification.EventSubscriptionConfirmed,
			notification.Payload{
				"serviceType":    strings.Title(strings.ReplaceAll(string(sub.ServiceType), "_", " ")),
				"recurrenceType": string(sub.RecurrenceType),
				"name":           user.FullName,
			},
			[]notification.Target{{Email: user.Email, Name: user.FullName}},
		)
	}()
}

// dispatchSubscriptionCancelled notifies the client when their subscription is cancelled.
func (r *Resolver) dispatchSubscriptionCancelled(sub db.Subscription, reason string) {
	go func() {
		ctx := context.Background()
		if !sub.ClientUserID.Valid {
			return
		}
		user, err := r.Queries.GetUserByID(ctx, sub.ClientUserID)
		if err != nil {
			log.Printf("[notif] subscription_cancelled: could not load user for subscription %s: %v", uuidToString(sub.ID), err)
			return
		}
		r.NotifSvc.Dispatch(notification.EventSubscriptionCancelled,
			notification.Payload{
				"serviceType": strings.Title(strings.ReplaceAll(string(sub.ServiceType), "_", " ")),
				"reason":      reason,
				"name":        user.FullName,
			},
			[]notification.Target{{Email: user.Email, Name: user.FullName}},
		)
	}()
}

// dispatchBookingRescheduledEmail sends the EventBookingRescheduled email notification
// to the client, company admin, and worker (if assigned).
func (r *Resolver) dispatchBookingRescheduledEmail(booking db.Booking, newDate, newTime string) {
	go func() {
		ctx := context.Background()

		payload := notification.Payload{
			"referenceCode": booking.ReferenceCode,
			"newDate":       newDate,
			"newTime":       newTime,
		}

		var targets []notification.Target

		// Client.
		if booking.ClientUserID.Valid {
			if cu, err := r.Queries.GetUserByID(ctx, booking.ClientUserID); err == nil {
				targets = append(targets, notification.Target{Email: cu.Email, Name: cu.FullName})
			}
		}

		// Company admin.
		if booking.CompanyID.Valid {
			if company, err := r.Queries.GetCompanyByID(ctx, booking.CompanyID); err == nil {
				adminEmail, adminName := r.loadCompanyAdminEmail(ctx, company)
				if adminEmail != "" {
					targets = append(targets, notification.Target{Email: adminEmail, Name: adminName})
				}
			}
		}

		// Worker.
		if booking.WorkerID.Valid {
			if worker, err := r.Queries.GetWorkerByID(ctx, booking.WorkerID); err == nil {
				if worker.UserID.Valid {
					if wu, err := r.Queries.GetUserByID(ctx, worker.UserID); err == nil {
						targets = append(targets, notification.Target{Email: wu.Email, Name: wu.FullName})
					}
				}
			}
		}

		if len(targets) > 0 {
			r.NotifSvc.Dispatch(notification.EventBookingRescheduled, payload, targets)
		}
	}()
}
