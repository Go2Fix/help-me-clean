package resolver

import (
	"context"
	"fmt"
	"log"
	"strings"

	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/service/notification"
)

// sendWhatsApp fires a best-effort WhatsApp text message in a goroutine.
// If the WhatsApp service is nil or the phone is empty the call is a no-op.
func (r *Resolver) sendWhatsApp(phone, message string) {
	if r.WhatsApp == nil || phone == "" {
		return
	}
	go func() {
		if err := r.WhatsApp.SendTextMessage(context.Background(), phone, message); err != nil {
			log.Printf("whatsapp: failed to send to %s: %v", phone, err)
		}
	}()
}

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

// loadCompanyAdmin loads the admin user for a company and returns their userID, email, and name.
// Returns empty strings if the admin cannot be loaded.
func (r *Resolver) loadCompanyAdmin(ctx context.Context, company db.Company) (userID, email, name string) {
	if !company.AdminUserID.Valid {
		return "", "", ""
	}
	adminUser, err := r.Queries.GetUserByID(ctx, company.AdminUserID)
	if err != nil {
		log.Printf("[notif] could not load admin user for company %s: %v", uuidToString(company.ID), err)
		return "", "", ""
	}
	return uuidToString(adminUser.ID), adminUser.Email, adminUser.FullName
}

// loadCompanyAdminEmail loads the admin user for a company and returns their email and name.
// Returns empty strings if the admin cannot be loaded.
func (r *Resolver) loadCompanyAdminEmail(ctx context.Context, company db.Company) (email, name string) {
	_, email, name = r.loadCompanyAdmin(ctx, company)
	return email, name
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
		clientUserID := ""
		if booking.ClientUserID.Valid {
			if clientUser, err := r.Queries.GetUserByID(ctx, booking.ClientUserID); err == nil {
				clientEmail = clientUser.Email
				clientName = clientUser.FullName
				clientUserID = uuidToString(clientUser.ID)
			}
		}

		bookingID := uuidToString(booking.ID)
		scheduledDate := dateToString(booking.ScheduledDate)
		scheduledTime := timeToString(booking.ScheduledStartTime)
		estimatedTotal := fmt.Sprintf("RON %.2f", numericToFloat(booking.EstimatedTotal))
		serviceName := strings.Title(strings.ReplaceAll(string(booking.ServiceType), "_", " "))

		// Notify client.
		if clientEmail != "" {
			r.NotifSvc.Dispatch(notification.EventBookingConfirmedClient,
				notification.Payload{
					"bookingId":      bookingID,
					"referenceCode":  booking.ReferenceCode,
					"serviceName":    serviceName,
					"scheduledDate":  scheduledDate,
					"scheduledTime":  scheduledTime,
					"estimatedTotal": estimatedTotal,
					"clientName":     clientName,
				},
				[]notification.Target{{UserID: clientUserID, Email: clientEmail, Name: clientName}},
			)
		}

		// Notify company admin if already assigned.
		if booking.CompanyID.Valid {
			company, err := r.Queries.GetCompanyByID(ctx, booking.CompanyID)
			if err == nil {
				adminUserID, adminEmail, adminName := r.loadCompanyAdmin(ctx, company)
				if adminEmail != "" {
					r.NotifSvc.Dispatch(notification.EventBookingNewRequestCompany,
						notification.Payload{
							"bookingId":      bookingID,
							"referenceCode":  booking.ReferenceCode,
							"serviceName":    serviceName,
							"scheduledDate":  scheduledDate,
							"scheduledTime":  scheduledTime,
							"estimatedTotal": estimatedTotal,
							"clientName":     clientName,
						},
						[]notification.Target{{UserID: adminUserID, Email: adminEmail, Name: adminName}},
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

		bookingID := uuidToString(booking.ID)
		scheduledDate := dateToString(booking.ScheduledDate)
		scheduledTime := timeToString(booking.ScheduledStartTime)
		serviceName := strings.Title(strings.ReplaceAll(string(booking.ServiceType), "_", " "))
		notifData := []byte(fmt.Sprintf(`{"bookingId":"%s"}`, bookingID))

		clientEmail := ""
		clientName := ""
		clientPhone := ""
		clientUserID := ""
		if booking.ClientUserID.Valid {
			if clientUser, err := r.Queries.GetUserByID(ctx, booking.ClientUserID); err == nil {
				clientEmail = clientUser.Email
				clientName = clientUser.FullName
				clientUserID = uuidToString(clientUser.ID)
				if clientUser.Phone.Valid {
					clientPhone = clientUser.Phone.String
				}
			}
		}

		workerEmail := ""
		workerName := ""
		workerPhone := ""
		workerUserID := ""
		// workerUserPg holds the user ID (pgtype.UUID) for the assigned worker — used for in-app notification.
		workerUserPg := booking.WorkerID // re-used as a zero pgtype.UUID; overwritten below if worker found
		workerUserPg.Valid = false       // mark invalid until we successfully load the worker user
		if booking.WorkerID.Valid {
			if worker, err := r.Queries.GetWorkerByID(ctx, booking.WorkerID); err == nil {
				if worker.UserID.Valid {
					workerUserPg = worker.UserID
					if workerUser, err := r.Queries.GetUserByID(ctx, worker.UserID); err == nil {
						workerEmail = workerUser.Email
						workerName = workerUser.FullName
						workerUserID = uuidToString(workerUser.ID)
						if workerUser.Phone.Valid {
							workerPhone = workerUser.Phone.String
						}
					}
				}
			}
		}

		// In-app notification → worker: new assignment.
		if workerUserPg.Valid {
			workerBody := fmt.Sprintf("Ai fost alocat pentru comanda %s pe %s la ora %s.", booking.ReferenceCode, scheduledDate, scheduledTime)
			if _, err := r.Queries.CreateNotification(ctx, db.CreateNotificationParams{
				UserID: workerUserPg,
				Type:   db.NotificationTypeBookingAssigned,
				Title:  "Ai o nouă comandă",
				Body:   workerBody,
				Data:   notifData,
			}); err != nil {
				log.Printf("dispatchWorkerAssigned: failed to notify worker in-app: %v", err)
			}
		}

		// In-app notification → client: worker has been assigned.
		if booking.ClientUserID.Valid {
			clientBody := fmt.Sprintf("Un lucrător a fost desemnat pentru comanda ta %s.", booking.ReferenceCode)
			if _, err := r.Queries.CreateNotification(ctx, db.CreateNotificationParams{
				UserID: booking.ClientUserID,
				Type:   db.NotificationTypeBookingAssigned,
				Title:  "Lucrătorul tău a fost desemnat",
				Body:   clientBody,
				Data:   notifData,
			}); err != nil {
				log.Printf("dispatchWorkerAssigned: failed to notify client in-app: %v", err)
			}
		}

		// Email → client.
		if clientEmail != "" {
			r.NotifSvc.Dispatch(notification.EventBookingWorkerAssignedClient,
				notification.Payload{
					"bookingId":     bookingID,
					"referenceCode": booking.ReferenceCode,
					"workerName":    workerName,
					"scheduledDate": scheduledDate,
					"serviceName":   serviceName,
				},
				[]notification.Target{{UserID: clientUserID, Email: clientEmail, Name: clientName}},
			)
		}

		// Email → worker.
		if workerEmail != "" {
			r.NotifSvc.Dispatch(notification.EventJobAssignedWorker,
				notification.Payload{
					"bookingId":     bookingID,
					"referenceCode": booking.ReferenceCode,
					"clientName":    clientName,
					"scheduledDate": scheduledDate,
					"serviceName":   serviceName,
				},
				[]notification.Target{{UserID: workerUserID, Email: workerEmail, Name: workerName}},
			)
		}

		// WhatsApp → worker.
		if workerPhone != "" {
			msg := fmt.Sprintf("Ai o nouă comandă Go2Fix! Cod: %s, Data: %s, Ora: %s. Verifică detaliile în aplicație.", booking.ReferenceCode, scheduledDate, scheduledTime)
			r.sendWhatsApp(workerPhone, msg)
		}

		// WhatsApp → client.
		if clientPhone != "" {
			msg := fmt.Sprintf("Lucrătorul tău a fost desemnat pentru comanda %s. Data: %s, Ora: %s.", booking.ReferenceCode, scheduledDate, scheduledTime)
			r.sendWhatsApp(clientPhone, msg)
		}
	}()
}

// dispatchBookingCompletedNotification notifies the client that the job is done,
// including an in-app notification with a deep-link review CTA and a WhatsApp message.
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

		bookingID := uuidToString(booking.ID)
		serviceName := strings.Title(strings.ReplaceAll(string(booking.ServiceType), "_", " "))

		// In-app notification with deep-link review CTA.
		reviewData := []byte(fmt.Sprintf(`{"bookingId":"%s","action":"review"}`, bookingID))
		if _, err := r.Queries.CreateNotification(ctx, db.CreateNotificationParams{
			UserID: booking.ClientUserID,
			Type:   db.NotificationTypeBookingCompleted,
			Title:  "Curățenia s-a finalizat!",
			Body:   fmt.Sprintf("Comanda %s a fost finalizată. Lasă o recenzie pentru a-i ajuta pe alții!", booking.ReferenceCode),
			Data:   reviewData,
		}); err != nil {
			log.Printf("[notif] completed: failed to create in-app notification for booking %s: %v", booking.ReferenceCode, err)
		}

		// Email notification.
		r.NotifSvc.Dispatch(notification.EventBookingCompleted,
			notification.Payload{
				"bookingId":     bookingID,
				"referenceCode": booking.ReferenceCode,
				"serviceName":   serviceName,
				"clientName":    clientUser.FullName,
				"reviewUrl":     fmt.Sprintf("https://www.go2fix.ro/cont/comenzi/%s?action=review", bookingID),
			},
			[]notification.Target{{UserID: uuidToString(clientUser.ID), Email: clientUser.Email, Name: clientUser.FullName}},
		)

		// WhatsApp notification.
		if clientUser.Phone.Valid && clientUser.Phone.String != "" {
			msg := fmt.Sprintf("Comanda %s a fost finalizată! Mulțumim că ai ales Go2Fix. Te rugăm să lași o recenzie: https://www.go2fix.ro/cont/comenzi/%s?action=review", booking.ReferenceCode, bookingID)
			r.sendWhatsApp(clientUser.Phone.String, msg)
		}
	}()
}

// dispatchBookingCancelledByClient notifies the company admin and worker when a client cancels.
// Sends both in-app notifications and email via the notification service.
func (r *Resolver) dispatchBookingCancelledByClient(booking db.Booking, reason string) {
	go func() {
		ctx := context.Background()

		bookingID := uuidToString(booking.ID)
		notifBody := fmt.Sprintf("Clientul a anulat comanda %s.", booking.ReferenceCode)
		notifData := []byte(fmt.Sprintf(`{"bookingId":"%s"}`, bookingID))

		clientName := "Clientul"
		if booking.ClientUserID.Valid {
			if cu, err := r.Queries.GetUserByID(ctx, booking.ClientUserID); err == nil {
				clientName = cu.FullName
			}
		}

		payload := notification.Payload{
			"bookingId":     bookingID,
			"referenceCode": booking.ReferenceCode,
			"clientName":    clientName,
			"reason":        reason,
		}

		var targets []notification.Target

		// In-app + email → company admin.
		if booking.CompanyID.Valid {
			if company, err := r.Queries.GetCompanyByID(ctx, booking.CompanyID); err == nil {
				adminUserID, adminEmail, adminName := r.loadCompanyAdmin(ctx, company)
				if adminUserID != "" {
					adminPgID := stringToUUID(adminUserID)
					if _, err := r.Queries.CreateNotification(ctx, db.CreateNotificationParams{
						UserID: adminPgID,
						Type:   db.NotificationTypeBookingCancelled,
						Title:  "Comandă anulată",
						Body:   notifBody,
						Data:   notifData,
					}); err != nil {
						log.Printf("[notif] cancelledByClient: failed to notify company admin in-app: %v", err)
					}
				}
				if adminEmail != "" {
					targets = append(targets, notification.Target{UserID: adminUserID, Email: adminEmail, Name: adminName})
				}
			}
		}

		// In-app + email → worker (if assigned).
		if booking.WorkerID.Valid {
			if worker, err := r.Queries.GetWorkerByID(ctx, booking.WorkerID); err == nil {
				if worker.UserID.Valid {
					if _, err := r.Queries.CreateNotification(ctx, db.CreateNotificationParams{
						UserID: worker.UserID,
						Type:   db.NotificationTypeBookingCancelled,
						Title:  "Comandă anulată",
						Body:   notifBody,
						Data:   notifData,
					}); err != nil {
						log.Printf("[notif] cancelledByClient: failed to notify worker in-app: %v", err)
					}
					if wu, err := r.Queries.GetUserByID(ctx, worker.UserID); err == nil {
						targets = append(targets, notification.Target{UserID: uuidToString(wu.ID), Email: wu.Email, Name: wu.FullName})
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
			"bookingId":     uuidToString(booking.ID),
			"referenceCode": booking.ReferenceCode,
			"reason":        reason,
		}

		var targets []notification.Target

		// Client.
		if booking.ClientUserID.Valid {
			if cu, err := r.Queries.GetUserByID(ctx, booking.ClientUserID); err == nil {
				targets = append(targets, notification.Target{UserID: uuidToString(cu.ID), Email: cu.Email, Name: cu.FullName})
			}
		}

		// Company admin.
		if booking.CompanyID.Valid {
			if company, err := r.Queries.GetCompanyByID(ctx, booking.CompanyID); err == nil {
				adminUserID, adminEmail, adminName := r.loadCompanyAdmin(ctx, company)
				if adminEmail != "" {
					targets = append(targets, notification.Target{UserID: adminUserID, Email: adminEmail, Name: adminName})
				}
			}
		}

		// Worker.
		if booking.WorkerID.Valid {
			if worker, err := r.Queries.GetWorkerByID(ctx, booking.WorkerID); err == nil {
				if worker.UserID.Valid {
					if wu, err := r.Queries.GetUserByID(ctx, worker.UserID); err == nil {
						targets = append(targets, notification.Target{UserID: uuidToString(wu.ID), Email: wu.Email, Name: wu.FullName})
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
		buyerUserID := uuidToString(inv.ClientUserID)
		r.NotifSvc.Dispatch(notification.EventInvoiceReady,
			notification.Payload{
				"invoiceId":     uuidToString(inv.ID),
				"invoiceNumber": invoiceNumber,
				"total":         total,
			},
			[]notification.Target{{UserID: buyerUserID, Email: inv.BuyerEmail.String, Name: inv.BuyerName}},
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
		adminUserID, adminEmail, adminName := r.loadCompanyAdmin(ctx, company)
		if adminEmail == "" {
			return
		}
		invoiceNumber := inv.InvoiceNumber.String
		total := fmt.Sprintf("%.2f RON", float64(inv.TotalAmount)/100.0)
		r.NotifSvc.Dispatch(notification.EventInvoicePaid,
			notification.Payload{
				"invoiceId":     uuidToString(inv.ID),
				"invoiceNumber": invoiceNumber,
				"total":         total,
				"companyName":   company.CompanyName,
			},
			[]notification.Target{{UserID: adminUserID, Email: adminEmail, Name: adminName}},
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
			[]notification.Target{{UserID: uuidToString(user.ID), Email: user.Email, Name: user.FullName}},
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
			[]notification.Target{{UserID: uuidToString(user.ID), Email: user.Email, Name: user.FullName}},
		)
	}()
}

// dispatchBookingRescheduledEmail sends the EventBookingRescheduled email notification
// to the client, company admin, and worker (if assigned).
func (r *Resolver) dispatchBookingRescheduledEmail(booking db.Booking, newDate, newTime string) {
	go func() {
		ctx := context.Background()

		payload := notification.Payload{
			"bookingId":     uuidToString(booking.ID),
			"referenceCode": booking.ReferenceCode,
			"newDate":       newDate,
			"newTime":       newTime,
		}

		var targets []notification.Target

		// Client.
		if booking.ClientUserID.Valid {
			if cu, err := r.Queries.GetUserByID(ctx, booking.ClientUserID); err == nil {
				targets = append(targets, notification.Target{UserID: uuidToString(cu.ID), Email: cu.Email, Name: cu.FullName})
			}
		}

		// Company admin.
		if booking.CompanyID.Valid {
			if company, err := r.Queries.GetCompanyByID(ctx, booking.CompanyID); err == nil {
				adminUserID, adminEmail, adminName := r.loadCompanyAdmin(ctx, company)
				if adminEmail != "" {
					targets = append(targets, notification.Target{UserID: adminUserID, Email: adminEmail, Name: adminName})
				}
			}
		}

		// Worker.
		if booking.WorkerID.Valid {
			if worker, err := r.Queries.GetWorkerByID(ctx, booking.WorkerID); err == nil {
				if worker.UserID.Valid {
					if wu, err := r.Queries.GetUserByID(ctx, worker.UserID); err == nil {
						targets = append(targets, notification.Target{UserID: uuidToString(wu.ID), Email: wu.Email, Name: wu.FullName})
					}
				}
			}
		}

		if len(targets) > 0 {
			r.NotifSvc.Dispatch(notification.EventBookingRescheduled, payload, targets)
		}
	}()
}

// dispatchJobStartedEmail sends the EventBookingConfirmedClient email to the client
// when the worker starts the job, and fires a WhatsApp message.
// The email reuses the booking_confirmed_client event as the closest match since
// there is no dedicated booking_started email event yet.
func (r *Resolver) dispatchJobStartedEmail(booking db.Booking) {
	go func() {
		ctx := context.Background()
		if !booking.ClientUserID.Valid {
			return
		}
		clientUser, err := r.Queries.GetUserByID(ctx, booking.ClientUserID)
		if err != nil {
			log.Printf("[notif] jobStarted: could not load client for booking %s: %v", booking.ReferenceCode, err)
			return
		}

		bookingID := uuidToString(booking.ID)

		// Email notification — reuse booking_confirmed_client template as closest fit.
		r.NotifSvc.Dispatch(notification.EventBookingConfirmedClient,
			notification.Payload{
				"bookingId":     bookingID,
				"referenceCode": booking.ReferenceCode,
				"clientName":    clientUser.FullName,
				"status":        "in_progress",
			},
			[]notification.Target{{UserID: uuidToString(clientUser.ID), Email: clientUser.Email, Name: clientUser.FullName}},
		)

		// WhatsApp notification.
		if clientUser.Phone.Valid && clientUser.Phone.String != "" {
			msg := fmt.Sprintf("Curățenia a început pentru comanda %s. Echipa noastră lucrează acum la casa ta.", booking.ReferenceCode)
			r.sendWhatsApp(clientUser.Phone.String, msg)
		}
	}()
}
