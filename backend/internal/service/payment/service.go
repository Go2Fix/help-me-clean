package payment

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"os"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/account"
	"github.com/stripe/stripe-go/v81/accountlink"
	"github.com/stripe/stripe-go/v81/customer"
	"github.com/stripe/stripe-go/v81/paymentintent"
	"github.com/stripe/stripe-go/v81/paymentmethod"
	"github.com/stripe/stripe-go/v81/refund"
	"github.com/stripe/stripe-go/v81/setupintent"
	"github.com/stripe/stripe-go/v81/webhook"

	db "go2fix-backend/internal/db/generated"
)

// Service handles Stripe payment processing for Go2Fix.
type Service struct {
	queries           *db.Queries
	stripeKey         string
	webhookSecret     string
	connectReturnURL  string
	connectRefreshURL string
	// OnBookingConfirmed is called when a booking is auto-confirmed via payment.
	// Set by the application layer to create a chat room, etc.
	OnBookingConfirmed func(ctx context.Context, booking db.Booking)
	// OnPaymentSucceeded is called when a payment succeeds.
	// Set by the application layer to auto-generate invoices, etc.
	OnPaymentSucceeded func(ctx context.Context, booking db.Booking, txn db.PaymentTransaction)
}

// NewService creates a new payment service and configures the global Stripe API key.
func NewService(queries *db.Queries) *Service {
	s := &Service{
		queries:           queries,
		stripeKey:         os.Getenv("STRIPE_SECRET_KEY"),
		webhookSecret:     os.Getenv("STRIPE_WEBHOOK_SECRET"),
		connectReturnURL:  os.Getenv("STRIPE_CONNECT_RETURN_URL"),
		connectRefreshURL: os.Getenv("STRIPE_CONNECT_REFRESH_URL"),
	}

	stripe.Key = s.stripeKey

	log.Println("Payment service initialized")
	return s
}

// EnsureStripeCustomer looks up or creates a Stripe customer for the given user.
// Returns the Stripe customer ID string.
func (s *Service) EnsureStripeCustomer(ctx context.Context, userID pgtype.UUID, email string, name string) (string, error) {
	existing, err := s.queries.GetUserStripeCustomerID(ctx, userID)
	if err != nil {
		return "", fmt.Errorf("payment: failed to get stripe customer id: %w", err)
	}

	if existing.Valid && existing.String != "" {
		return existing.String, nil
	}

	// Create a new Stripe customer.
	params := &stripe.CustomerParams{
		Email: stripe.String(email),
		Name:  stripe.String(name),
	}
	params.AddMetadata("user_id", uuidToString(userID))

	cust, err := customer.New(params)
	if err != nil {
		return "", fmt.Errorf("payment: failed to create stripe customer: %w", err)
	}

	err = s.queries.SetUserStripeCustomerID(ctx, db.SetUserStripeCustomerIDParams{
		ID: userID,
		StripeCustomerID: pgtype.Text{
			String: cust.ID,
			Valid:  true,
		},
	})
	if err != nil {
		return "", fmt.Errorf("payment: failed to store stripe customer id: %w", err)
	}

	log.Printf("payment: created Stripe customer %s for user %s", cust.ID, uuidToString(userID))
	return cust.ID, nil
}

// CreateSetupIntent creates a Stripe SetupIntent for saving a payment method.
// Returns the client secret that the frontend uses to confirm the setup.
func (s *Service) CreateSetupIntent(ctx context.Context, userID pgtype.UUID, email string, name string) (string, error) {
	customerID, err := s.EnsureStripeCustomer(ctx, userID, email, name)
	if err != nil {
		return "", fmt.Errorf("payment: setup intent failed: %w", err)
	}

	params := &stripe.SetupIntentParams{
		Customer:           stripe.String(customerID),
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
	}

	si, err := setupintent.New(params)
	if err != nil {
		return "", fmt.Errorf("payment: failed to create setup intent: %w", err)
	}

	log.Printf("payment: created SetupIntent %s for customer %s", si.ID, customerID)
	return si.ClientSecret, nil
}

// AttachPaymentMethod retrieves a Stripe payment method by its ID, reads card
// details, and stores it in the database linked to the user.
func (s *Service) AttachPaymentMethod(ctx context.Context, userID pgtype.UUID, stripePaymentMethodID string) (db.ClientPaymentMethod, error) {
	pm, err := paymentmethod.Get(stripePaymentMethodID, nil)
	if err != nil {
		return db.ClientPaymentMethod{}, fmt.Errorf("payment: failed to retrieve payment method from stripe: %w", err)
	}

	var last4, brand string
	var expMonth, expYear int32
	if pm.Card != nil {
		last4 = pm.Card.Last4
		brand = string(pm.Card.Brand)
		expMonth = int32(pm.Card.ExpMonth)
		expYear = int32(pm.Card.ExpYear)
	}

	dbPM, err := s.queries.CreatePaymentMethod(ctx, db.CreatePaymentMethodParams{
		UserID: userID,
		StripePaymentMethodID: pgtype.Text{
			String: stripePaymentMethodID,
			Valid:  true,
		},
		CardLastFour: pgtype.Text{
			String: last4,
			Valid:  last4 != "",
		},
		CardBrand: pgtype.Text{
			String: brand,
			Valid:  brand != "",
		},
		IsDefault: pgtype.Bool{
			Bool:  false,
			Valid: true,
		},
		CardExpMonth: pgtype.Int4{
			Int32: expMonth,
			Valid: expMonth > 0,
		},
		CardExpYear: pgtype.Int4{
			Int32: expYear,
			Valid: expYear > 0,
		},
	})
	if err != nil {
		return db.ClientPaymentMethod{}, fmt.Errorf("payment: failed to save payment method: %w", err)
	}

	log.Printf("payment: attached payment method %s for user %s (card ending %s)", stripePaymentMethodID, uuidToString(userID), last4)
	return dbPM, nil
}

// DetachPaymentMethod detaches a payment method from Stripe and removes it from the database.
func (s *Service) DetachPaymentMethod(ctx context.Context, pmID pgtype.UUID, stripePaymentMethodID string) error {
	_, err := paymentmethod.Detach(stripePaymentMethodID, nil)
	if err != nil {
		return fmt.Errorf("payment: failed to detach payment method from stripe: %w", err)
	}

	err = s.queries.DeletePaymentMethod(ctx, pmID)
	if err != nil {
		return fmt.Errorf("payment: failed to delete payment method from db: %w", err)
	}

	log.Printf("payment: detached payment method %s", stripePaymentMethodID)
	return nil
}

// CreatePaymentIntentForBooking creates a Stripe PaymentIntent with Stripe Connect
// split payments. It calculates the amount from booking totals, applies the platform
// commission as an application fee, and routes the remainder to the company's Connect
// account. Returns the client secret, payment intent ID, and the amount in bani.
func (s *Service) CreatePaymentIntentForBooking(ctx context.Context, booking db.Booking) (string, string, int64, error) {
	// Determine the amount in RON from the booking, then convert to bani (cents).
	amountRON := 0.0

	if booking.FinalTotal.Valid {
		f64, err := numericToFloat64(booking.FinalTotal)
		if err == nil && f64 > 0 {
			amountRON = f64
		}
	}

	if amountRON == 0.0 {
		f64, err := numericToFloat64(booking.EstimatedTotal)
		if err != nil {
			return "", "", 0, fmt.Errorf("payment: booking has no valid total amount: %w", err)
		}
		amountRON = f64
	}

	amountBani := int64(math.Round(amountRON * 100))
	if amountBani <= 0 {
		return "", "", 0, fmt.Errorf("payment: booking amount must be positive, got %d bani", amountBani)
	}

	// Get the company's Stripe Connect account.
	if !booking.CompanyID.Valid {
		return "", "", 0, fmt.Errorf("payment: booking has no company assigned")
	}

	connectInfo, err := s.queries.GetCompanyStripeConnect(ctx, booking.CompanyID)
	if err != nil {
		return "", "", 0, fmt.Errorf("payment: failed to get company stripe connect info: %w", err)
	}

	if !connectInfo.StripeConnectAccountID.Valid || connectInfo.StripeConnectAccountID.String == "" {
		return "", "", 0, fmt.Errorf("payment: company does not have a stripe connect account")
	}

	// Get user info for Stripe customer creation.
	if !booking.ClientUserID.Valid {
		return "", "", 0, fmt.Errorf("payment: booking has no client user")
	}

	user, err := s.queries.GetUserByID(ctx, booking.ClientUserID)
	if err != nil {
		return "", "", 0, fmt.Errorf("payment: failed to get client user: %w", err)
	}

	customerID, err := s.EnsureStripeCustomer(ctx, booking.ClientUserID, user.Email, user.FullName)
	if err != nil {
		return "", "", 0, fmt.Errorf("payment: failed to ensure stripe customer: %w", err)
	}

	// Calculate platform commission.
	commissionPct := 0.0
	if booking.PlatformCommissionPct.Valid {
		f64, err := numericToFloat64(booking.PlatformCommissionPct)
		if err == nil {
			commissionPct = f64
		}
	}

	applicationFee := int64(math.Round(float64(amountBani) * commissionPct / 100.0))

	// Create the PaymentIntent with Connect transfer.
	params := &stripe.PaymentIntentParams{
		Amount:               stripe.Int64(amountBani),
		Currency:             stripe.String("ron"),
		Customer:             stripe.String(customerID),
		ApplicationFeeAmount: stripe.Int64(applicationFee),
		TransferData: &stripe.PaymentIntentTransferDataParams{
			Destination: stripe.String(connectInfo.StripeConnectAccountID.String),
		},
	}
	params.AddMetadata("booking_id", uuidToString(booking.ID))
	params.AddMetadata("reference_code", booking.ReferenceCode)

	pi, err := paymentintent.New(params)
	if err != nil {
		return "", "", 0, fmt.Errorf("payment: failed to create payment intent: %w", err)
	}

	// Store the payment intent ID on the booking.
	_, err = s.queries.UpdateBookingPayment(ctx, db.UpdateBookingPaymentParams{
		ID: booking.ID,
		StripePaymentIntentID: pgtype.Text{
			String: pi.ID,
			Valid:  true,
		},
		PaymentStatus: pgtype.Text{
			String: "pending",
			Valid:  true,
		},
	})
	if err != nil {
		return "", "", 0, fmt.Errorf("payment: failed to update booking with payment intent: %w", err)
	}

	// Create the payment transaction audit record.
	amountCompany := int32(amountBani - applicationFee)
	metadata, _ := json.Marshal(map[string]string{
		"booking_id":     uuidToString(booking.ID),
		"reference_code": booking.ReferenceCode,
	})

	_, err = s.queries.CreatePaymentTransaction(ctx, db.CreatePaymentTransactionParams{
		BookingID:             booking.ID,
		StripePaymentIntentID: pi.ID,
		AmountTotal:           int32(amountBani),
		AmountCompany:         amountCompany,
		AmountPlatformFee:     int32(applicationFee),
		Currency:              "ron",
		Status:                db.PaymentTransactionStatusPending,
		Metadata:              metadata,
	})
	if err != nil {
		return "", "", 0, fmt.Errorf("payment: failed to create payment transaction record: %w", err)
	}

	log.Printf("payment: created PaymentIntent %s for booking %s, amount=%d bani, fee=%d bani",
		pi.ID, uuidToString(booking.ID), amountBani, applicationFee)

	return pi.ClientSecret, pi.ID, amountBani, nil
}

// HandleWebhookEvent verifies and processes incoming Stripe webhook events.
func (s *Service) HandleWebhookEvent(ctx context.Context, payload []byte, sigHeader string) error {
	event, err := webhook.ConstructEventWithOptions(payload, sigHeader, s.webhookSecret, webhook.ConstructEventOptions{
		IgnoreAPIVersionMismatch: true,
	})
	if err != nil {
		return fmt.Errorf("payment: webhook signature verification failed: %w", err)
	}

	log.Printf("payment: received webhook event %s (type: %s)", event.ID, event.Type)

	switch event.Type {
	case "payment_intent.succeeded":
		return s.handlePaymentIntentSucceeded(ctx, event)
	case "payment_intent.payment_failed":
		return s.handlePaymentIntentFailed(ctx, event)
	case "charge.refunded":
		return s.handleChargeRefunded(ctx, event)
	case "account.updated":
		return s.handleAccountUpdated(ctx, event)
	default:
		log.Printf("payment: unhandled webhook event type: %s", event.Type)
		return nil
	}
}

// handlePaymentIntentSucceeded processes a successful payment.
func (s *Service) handlePaymentIntentSucceeded(ctx context.Context, event stripe.Event) error {
	var pi stripe.PaymentIntent
	if err := json.Unmarshal(event.Data.Raw, &pi); err != nil {
		return fmt.Errorf("payment: failed to unmarshal payment_intent.succeeded: %w", err)
	}

	// Extract charge ID from the latest charge.
	var chargeID string
	if pi.LatestCharge != nil {
		chargeID = pi.LatestCharge.ID
	}

	// Update the payment transaction status.
	txn, err := s.queries.UpdatePaymentTransactionStatus(ctx, db.UpdatePaymentTransactionStatusParams{
		StripePaymentIntentID: pi.ID,
		Status:                db.PaymentTransactionStatusSucceeded,
		StripeChargeID: pgtype.Text{
			String: chargeID,
			Valid:  chargeID != "",
		},
	})
	if err != nil {
		return fmt.Errorf("payment: failed to update transaction for PI %s: %w", pi.ID, err)
	}

	// Mark the booking as paid AND auto-confirm if assigned.
	booking, err := s.queries.MarkBookingPaidAndConfirmed(ctx, txn.BookingID)
	if err != nil {
		return fmt.Errorf("payment: failed to mark booking paid for PI %s: %w", pi.ID, err)
	}

	// If booking was auto-confirmed, create chat room via callback.
	if booking.Status == db.BookingStatusConfirmed && s.OnBookingConfirmed != nil {
		go s.OnBookingConfirmed(context.Background(), booking)
	}

	// Trigger invoice generation (non-blocking, best-effort).
	if s.OnPaymentSucceeded != nil {
		go s.OnPaymentSucceeded(context.Background(), booking, txn)
	}

	log.Printf("payment: payment_intent.succeeded processed for PI %s, booking %s, status=%s", pi.ID, uuidToString(txn.BookingID), booking.Status)
	return nil
}

// handlePaymentIntentFailed processes a failed payment.
func (s *Service) handlePaymentIntentFailed(ctx context.Context, event stripe.Event) error {
	var pi stripe.PaymentIntent
	if err := json.Unmarshal(event.Data.Raw, &pi); err != nil {
		return fmt.Errorf("payment: failed to unmarshal payment_intent.payment_failed: %w", err)
	}

	var failureMessage string
	if pi.LastPaymentError != nil {
		failureMessage = pi.LastPaymentError.Msg
	}

	txn, err := s.queries.UpdatePaymentTransactionFailed(ctx, db.UpdatePaymentTransactionFailedParams{
		StripePaymentIntentID: pi.ID,
		FailureReason: pgtype.Text{
			String: failureMessage,
			Valid:  failureMessage != "",
		},
	})
	if err != nil {
		return fmt.Errorf("payment: failed to update transaction failure for PI %s: %w", pi.ID, err)
	}

	// Auto-cancel the booking since payment failed.
	if txn.BookingID.Valid {
		_, cancelErr := s.queries.UpdateBookingStatus(ctx, db.UpdateBookingStatusParams{
			ID:     txn.BookingID,
			Status: db.BookingStatusCancelledByAdmin,
		})
		if cancelErr != nil {
			log.Printf("payment: warning: failed to cancel booking for failed PI %s: %v", pi.ID, cancelErr)
		} else {
			log.Printf("payment: auto-cancelled booking for failed PI %s", pi.ID)
		}
	}

	log.Printf("payment: payment_intent.payment_failed processed for PI %s, reason: %s", pi.ID, failureMessage)
	return nil
}

// handleChargeRefunded processes a refund event.
func (s *Service) handleChargeRefunded(ctx context.Context, event stripe.Event) error {
	var charge stripe.Charge
	if err := json.Unmarshal(event.Data.Raw, &charge); err != nil {
		return fmt.Errorf("payment: failed to unmarshal charge.refunded: %w", err)
	}

	if charge.PaymentIntent == nil {
		log.Printf("payment: charge.refunded event has no payment intent, skipping")
		return nil
	}

	piID := charge.PaymentIntent.ID

	// Determine refund details.
	var refundID string
	var refundAmount int64
	if charge.Refunds != nil && len(charge.Refunds.Data) > 0 {
		latestRefund := charge.Refunds.Data[0]
		refundID = latestRefund.ID
		refundAmount = latestRefund.Amount
	}

	// Determine whether this is a full or partial refund.
	status := db.PaymentTransactionStatusRefunded
	if charge.AmountRefunded < charge.Amount {
		status = db.PaymentTransactionStatusPartiallyRefunded
	}

	_, err := s.queries.UpdatePaymentTransactionRefund(ctx, db.UpdatePaymentTransactionRefundParams{
		StripePaymentIntentID: piID,
		Status:                status,
		RefundAmount: pgtype.Int4{
			Int32: int32(refundAmount),
			Valid: true,
		},
		StripeRefundID: pgtype.Text{
			String: refundID,
			Valid:  refundID != "",
		},
	})
	if err != nil {
		return fmt.Errorf("payment: failed to update transaction refund for PI %s: %w", piID, err)
	}

	log.Printf("payment: charge.refunded processed for PI %s, refund=%d, status=%s", piID, refundAmount, status)
	return nil
}

// handleAccountUpdated processes a Stripe Connect account update event.
func (s *Service) handleAccountUpdated(ctx context.Context, event stripe.Event) error {
	var acct stripe.Account
	if err := json.Unmarshal(event.Data.Raw, &acct); err != nil {
		return fmt.Errorf("payment: failed to unmarshal account.updated: %w", err)
	}

	companyIDStr, ok := acct.Metadata["company_id"]
	if !ok || companyIDStr == "" {
		log.Printf("payment: account.updated event for account %s has no company_id metadata, skipping", acct.ID)
		return nil
	}

	companyID, err := parseUUID(companyIDStr)
	if err != nil {
		return fmt.Errorf("payment: invalid company_id in account metadata: %w", err)
	}

	onboardingComplete := acct.DetailsSubmitted
	chargesEnabled := acct.ChargesEnabled
	payoutsEnabled := acct.PayoutsEnabled

	err = s.queries.SetCompanyStripeConnect(ctx, db.SetCompanyStripeConnectParams{
		ID: companyID,
		StripeConnectAccountID: pgtype.Text{
			String: acct.ID,
			Valid:  true,
		},
		StripeConnectOnboardingComplete: pgtype.Bool{
			Bool:  onboardingComplete,
			Valid: true,
		},
		StripeConnectChargesEnabled: pgtype.Bool{
			Bool:  chargesEnabled,
			Valid: true,
		},
		StripeConnectPayoutsEnabled: pgtype.Bool{
			Bool:  payoutsEnabled,
			Valid: true,
		},
	})
	if err != nil {
		return fmt.Errorf("payment: failed to update company connect status for account %s: %w", acct.ID, err)
	}

	log.Printf("payment: account.updated processed for account %s, charges=%v, payouts=%v, onboarding=%v",
		acct.ID, chargesEnabled, payoutsEnabled, onboardingComplete)
	return nil
}

// CreateConnectAccount creates a Stripe Express Connect account for a company
// and saves the account ID to the database.
func (s *Service) CreateConnectAccount(ctx context.Context, companyID pgtype.UUID, companyName string, email string) (string, error) {
	params := &stripe.AccountParams{
		Type:    stripe.String(string(stripe.AccountTypeExpress)),
		Country: stripe.String("RO"),
		Email:   stripe.String(email),
		BusinessProfile: &stripe.AccountBusinessProfileParams{
			Name: stripe.String(companyName),
		},
		Capabilities: &stripe.AccountCapabilitiesParams{
			CardPayments: &stripe.AccountCapabilitiesCardPaymentsParams{
				Requested: stripe.Bool(true),
			},
			Transfers: &stripe.AccountCapabilitiesTransfersParams{
				Requested: stripe.Bool(true),
			},
		},
	}
	params.AddMetadata("company_id", uuidToString(companyID))

	acct, err := account.New(params)
	if err != nil {
		return "", fmt.Errorf("payment: failed to create connect account: %w", err)
	}

	err = s.queries.SetCompanyStripeConnect(ctx, db.SetCompanyStripeConnectParams{
		ID: companyID,
		StripeConnectAccountID: pgtype.Text{
			String: acct.ID,
			Valid:  true,
		},
		StripeConnectOnboardingComplete: pgtype.Bool{
			Bool:  false,
			Valid: true,
		},
		StripeConnectChargesEnabled: pgtype.Bool{
			Bool:  false,
			Valid: true,
		},
		StripeConnectPayoutsEnabled: pgtype.Bool{
			Bool:  false,
			Valid: true,
		},
	})
	if err != nil {
		return "", fmt.Errorf("payment: failed to save connect account id: %w", err)
	}

	log.Printf("payment: created Connect account %s for company %s", acct.ID, uuidToString(companyID))
	return acct.ID, nil
}

// CreateConnectOnboardingLink generates an account onboarding link for a
// Stripe Express Connect account.
func (s *Service) CreateConnectOnboardingLink(ctx context.Context, accountID string) (string, error) {
	params := &stripe.AccountLinkParams{
		Account:    stripe.String(accountID),
		RefreshURL: stripe.String(s.connectRefreshURL),
		ReturnURL:  stripe.String(s.connectReturnURL),
		Type:       stripe.String(string(stripe.AccountLinkTypeAccountOnboarding)),
	}

	link, err := accountlink.New(params)
	if err != nil {
		return "", fmt.Errorf("payment: failed to create onboarding link: %w", err)
	}

	log.Printf("payment: created onboarding link for account %s", accountID)
	return link.URL, nil
}

// GetConnectAccountStatus returns the current Stripe Connect status for a company.
// It reads from the database first. If a Connect account exists, it fetches fresh
// status from the Stripe API and syncs it back to the database.
func (s *Service) GetConnectAccountStatus(ctx context.Context, companyID pgtype.UUID) (string, bool, bool, bool, error) {
	row, err := s.queries.GetCompanyStripeConnect(ctx, companyID)
	if err != nil {
		return "", false, false, false, fmt.Errorf("payment: failed to get connect status: %w", err)
	}

	if !row.StripeConnectAccountID.Valid || row.StripeConnectAccountID.String == "" {
		return "", false, false, false, nil
	}

	accountID := row.StripeConnectAccountID.String

	// Fetch fresh status from Stripe API.
	acct, err := account.GetByID(accountID, nil)
	if err != nil {
		// If we cannot reach Stripe, return the cached DB values.
		log.Printf("payment: warning: failed to fetch fresh account status for %s: %v", accountID, err)

		chargesEnabled := row.StripeConnectChargesEnabled.Valid && row.StripeConnectChargesEnabled.Bool
		payoutsEnabled := row.StripeConnectPayoutsEnabled.Valid && row.StripeConnectPayoutsEnabled.Bool
		onboardingComplete := row.StripeConnectOnboardingComplete.Valid && row.StripeConnectOnboardingComplete.Bool

		return accountID, chargesEnabled, payoutsEnabled, onboardingComplete, nil
	}

	// Sync the fresh status back to the database.
	err = s.queries.SetCompanyStripeConnect(ctx, db.SetCompanyStripeConnectParams{
		ID: companyID,
		StripeConnectAccountID: pgtype.Text{
			String: accountID,
			Valid:  true,
		},
		StripeConnectOnboardingComplete: pgtype.Bool{
			Bool:  acct.DetailsSubmitted,
			Valid: true,
		},
		StripeConnectChargesEnabled: pgtype.Bool{
			Bool:  acct.ChargesEnabled,
			Valid: true,
		},
		StripeConnectPayoutsEnabled: pgtype.Bool{
			Bool:  acct.PayoutsEnabled,
			Valid: true,
		},
	})
	if err != nil {
		log.Printf("payment: warning: failed to sync connect status for company %s: %v", uuidToString(companyID), err)
	}

	return accountID, acct.ChargesEnabled, acct.PayoutsEnabled, acct.DetailsSubmitted, nil
}

// CreateRefund creates a Stripe refund for a given payment intent.
// amountBani is the amount to refund in RON cents. Returns the Stripe refund ID.
func (s *Service) CreateRefund(ctx context.Context, paymentIntentID string, amountBani int64) (string, error) {
	params := &stripe.RefundParams{
		PaymentIntent: stripe.String(paymentIntentID),
		Amount:        stripe.Int64(amountBani),
	}

	r, err := refund.New(params)
	if err != nil {
		return "", fmt.Errorf("payment: failed to create refund for PI %s: %w", paymentIntentID, err)
	}

	log.Printf("payment: created refund %s for PI %s, amount=%d bani", r.ID, paymentIntentID, amountBani)
	return r.ID, nil
}

// numericToFloat64 converts a pgtype.Numeric to float64.
func numericToFloat64(n pgtype.Numeric) (float64, error) {
	if !n.Valid {
		return 0, fmt.Errorf("numeric value is null")
	}

	f8, err := n.Float64Value()
	if err != nil {
		return 0, fmt.Errorf("failed to convert numeric to float64: %w", err)
	}

	if !f8.Valid {
		return 0, fmt.Errorf("numeric float64 value is null")
	}

	return f8.Float64, nil
}

// uuidToString converts a pgtype.UUID to its standard hex-hyphenated string form.
func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// parseUUID parses a hex-hyphenated UUID string into a pgtype.UUID.
func parseUUID(s string) (pgtype.UUID, error) {
	var u pgtype.UUID
	clean := make([]byte, 0, 32)
	for i := 0; i < len(s); i++ {
		if s[i] != '-' {
			clean = append(clean, s[i])
		}
	}
	if len(clean) != 32 {
		return u, fmt.Errorf("invalid UUID string: %s", s)
	}
	var bytes [16]byte
	for i := 0; i < 16; i++ {
		hi, err := hexVal(clean[i*2])
		if err != nil {
			return u, err
		}
		lo, err := hexVal(clean[i*2+1])
		if err != nil {
			return u, err
		}
		bytes[i] = hi<<4 | lo
	}
	u.Bytes = bytes
	u.Valid = true
	return u, nil
}

// hexVal converts a hex ASCII byte to its numeric value.
func hexVal(c byte) (byte, error) {
	switch {
	case c >= '0' && c <= '9':
		return c - '0', nil
	case c >= 'a' && c <= 'f':
		return c - 'a' + 10, nil
	case c >= 'A' && c <= 'F':
		return c - 'A' + 10, nil
	default:
		return 0, fmt.Errorf("invalid hex character: %c", c)
	}
}
