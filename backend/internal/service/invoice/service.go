// Package invoice implements invoice generation, Keez.ro API integration,
// and e-factura transmission for the Go2Fix platform.
package invoice

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math"
	"math/big"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	db "go2fix-backend/internal/db/generated"
)

// defaultVATRatePct is the fallback Romanian VAT rate if not configured.
const defaultVATRatePct = 21

// PlatformConfig holds the platform's legal entity details for commission invoices.
type PlatformConfig struct {
	CompanyName string
	CUI         string
	RegNumber   string
	Address     string
	City        string
	County      string
	IsVATPayer  bool
	BankName    string
	IBAN        string
}

// Service handles invoice generation, storage, and Keez.ro API integration.
type Service struct {
	queries            *db.Queries
	keezClientEid      string
	keezApplicationID  string
	keezSecret         string
	keezSeries         string
	httpClient         *http.Client
	keezToken          string
	keezTokenExpiry    time.Time
	keezItemMu         sync.Mutex
	keezCommissionID string // itemExternalId for "Comision platforma Go2Fix" (ITSRV category)
	platformConfig     PlatformConfig
	vatRatePct         int // cached VAT rate; 0 means not yet loaded
}

// NewService creates a new invoice service, reading configuration from environment variables.
func NewService(queries *db.Queries) *Service {
	series := os.Getenv("KEEZ_SERIES")
	if series == "" {
		series = "FCT"
	}

	svc := &Service{
		queries:           queries,
		keezClientEid:     os.Getenv("KEEZ_CLIENT_EID"),
		keezApplicationID: os.Getenv("KEEZ_APPLICATION_ID"),
		keezSecret:        os.Getenv("KEEZ_SECRET"),
		keezSeries:        series,
		httpClient:        &http.Client{Timeout: 30 * time.Second},
		platformConfig:    PlatformConfig{}, // Will be loaded from DB on first use
	}

	log.Println("Invoice service initialized")
	return svc
}

// loadPlatformConfig loads the platform legal entity configuration from the database.
// It caches the result in memory to avoid repeated database queries.
func (s *Service) loadPlatformConfig(ctx context.Context) (PlatformConfig, error) {
	// If already loaded, return cached config
	if s.platformConfig.CompanyName != "" {
		return s.platformConfig, nil
	}

	// Load from database
	entity, err := s.queries.GetPlatformLegalEntity(ctx)
	if err != nil {
		return PlatformConfig{}, fmt.Errorf("invoice: load platform config: %w", err)
	}

	config := PlatformConfig{
		CompanyName: entity.CompanyName,
		CUI:         entity.Cui,
		RegNumber:   entity.RegNumber,
		Address:     entity.Address,
		City:        entity.City,
		County:      entity.County,
		IsVATPayer:  entity.IsVatPayer,
		BankName:    textVal(entity.BankName),
		IBAN:        textVal(entity.Iban),
	}

	// Cache the config
	s.platformConfig = config
	return config, nil
}

// loadVATRate returns the configured VAT rate from platform_settings, caching the result.
// Falls back to defaultVATRatePct (21) if not configured.
func (s *Service) loadVATRate(ctx context.Context) int {
	if s.vatRatePct > 0 {
		return s.vatRatePct
	}
	setting, err := s.queries.GetPlatformSetting(ctx, "vat_rate_pct")
	if err == nil {
		// Parse "21.00" → 21
		var f float64
		if _, parseErr := fmt.Sscanf(setting.Value, "%f", &f); parseErr == nil && f > 0 {
			s.vatRatePct = int(math.Round(f))
			return s.vatRatePct
		}
	}
	s.vatRatePct = defaultVATRatePct
	return s.vatRatePct
}

// keezGetToken returns a valid Bearer token for the Keez.ro API,
// refreshing it automatically when it is about to expire.
func (s *Service) keezGetToken(ctx context.Context) (string, error) {
	if s.keezApplicationID == "" || s.keezSecret == "" {
		return "", errors.New("invoice: KEEZ_APPLICATION_ID or KEEZ_SECRET not configured")
	}
	// Return cached token if still valid (with 60-second safety margin).
	if s.keezToken != "" && time.Now().Before(s.keezTokenExpiry.Add(-60*time.Second)) {
		return s.keezToken, nil
	}

	formData := url.Values{}
	formData.Set("client_id", "app"+s.keezApplicationID)
	formData.Set("client_secret", s.keezSecret)
	formData.Set("grant_type", "client_credentials")
	formData.Set("scope", "public-api")

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://app.keez.ro/idp/connect/token",
		strings.NewReader(formData.Encode()),
	)
	if err != nil {
		return "", fmt.Errorf("invoice: build keez token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("invoice: keez token request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("invoice: read keez token response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("invoice: keez token endpoint returned %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
		ExpiresIn   int64  `json:"expires_in"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", fmt.Errorf("invoice: parse keez token response: %w", err)
	}
	if tokenResp.AccessToken == "" {
		return "", errors.New("invoice: keez returned empty access_token")
	}

	expiresInSec := tokenResp.ExpiresIn
	if expiresInSec <= 0 {
		expiresInSec = 3600
	}

	// Store the full token string including type (e.g. "Bearer abc123").
	s.keezToken = tokenResp.TokenType + " " + tokenResp.AccessToken
	s.keezTokenExpiry = time.Now().Add(time.Duration(expiresInSec) * time.Second)
	return s.keezToken, nil
}

// Ping is a health-check method for the invoice service.
func (s *Service) Ping(ctx context.Context) string {
	return "invoice service: ok"
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// NewInvoiceNumber generates the next sequential invoice number for a given company
// and prefix. The format is "{prefix}-{year}-{number:04d}", for example "G2F-2026-0001".
func (s *Service) NewInvoiceNumber(ctx context.Context, companyID pgtype.UUID, prefix string) (string, error) {
	year := int32(time.Now().Year())

	// Ensure the sequence row exists (idempotent via ON CONFLICT DO NOTHING).
	err := s.queries.CreateInvoiceSequence(ctx, db.CreateInvoiceSequenceParams{
		CompanyID: companyID,
		Prefix:    prefix,
		Year:      year,
	})
	if err != nil {
		return "", fmt.Errorf("invoice: create sequence: %w", err)
	}

	// Atomically increment and return the next number.
	num, err := s.queries.GetNextInvoiceNumber(ctx, db.GetNextInvoiceNumberParams{
		CompanyID: companyID,
		Prefix:    prefix,
		Year:      year,
	})
	if err != nil {
		return "", fmt.Errorf("invoice: get next number: %w", err)
	}

	return fmt.Sprintf("%s-%d-%04d", prefix, year, num), nil
}

// GenerateClientServiceInvoice creates an invoice for a client service booking.
// The seller is the cleaning company and the buyer is the client.
func (s *Service) GenerateClientServiceInvoice(
	ctx context.Context,
	booking db.Booking,
	company db.Company,
	clientUserID pgtype.UUID,
) (db.Invoice, error) {
	// Guard: prevent duplicate invoices for the same booking + type.
	existing, err := s.queries.GetInvoiceByBookingAndType(ctx, db.GetInvoiceByBookingAndTypeParams{
		BookingID:   booking.ID,
		InvoiceType: db.InvoiceTypeClientService,
	})
	if err == nil {
		log.Printf("invoice: client service invoice already exists for booking %s", uuidToString(booking.ID))
		return existing, nil
	}

	// Determine the total amount in bani. Prefer FinalTotal; fall back to EstimatedTotal.
	totalBani := numericToInt32(booking.FinalTotal)
	if totalBani == 0 {
		totalBani = numericToInt32(booking.EstimatedTotal)
	}
	if totalBani == 0 {
		return db.Invoice{}, errors.New("invoice: booking has no total amount")
	}

	// Treat booking total as VAT-inclusive: net = total * 100 / (100 + vat%), vat = total - net.
	vatRate := int32(s.loadVATRate(ctx))
	subtotalNet := totalBani * 100 / (100 + vatRate)
	vatAmount := totalBani - subtotalNet

	// Attempt to load the client's billing profile for B2B details.
	billingProfile, profileErr := s.queries.GetBillingProfileByUser(ctx, clientUserID)

	// Resolve buyer info: prefer billing profile, fall back to user record.
	buyerName, buyerCUI, buyerRegNumber, buyerAddress, buyerCity, buyerCounty, buyerIsVATPayer, buyerEmail :=
		s.resolveBuyerInfo(ctx, clientUserID, billingProfile, profileErr)

	dueDate := pgtype.Date{Time: time.Now().AddDate(0, 0, 30), Valid: true}

	// Generate a per-company sequential invoice number (e.g. "FCT-2026-0001").
	// The cleaning company is the seller — this is their fiscal invoice to the client.
	invoiceNumber, err := s.NewInvoiceNumber(ctx, company.ID, "FCT")
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: generate invoice number: %w", err)
	}

	inv, err := s.queries.CreateInvoice(ctx, db.CreateInvoiceParams{
		InvoiceType:          db.InvoiceTypeClientService,
		InvoiceNumber:        pgText(invoiceNumber),
		SellerCompanyName:    company.CompanyName,
		SellerCui:            company.Cui,
		SellerRegNumber:      company.RegNumber,
		SellerAddress:        company.Address,
		SellerCity:           company.City,
		SellerCounty:         company.County,
		SellerIsVatPayer:     company.IsVatPayer,
		SellerBankName:       company.BankName,
		SellerIban:           company.Iban,
		BuyerName:            buyerName,
		BuyerCui:             buyerCUI,
		BuyerRegNumber:       buyerRegNumber,
		BuyerAddress:         buyerAddress,
		BuyerCity:            buyerCity,
		BuyerCounty:          buyerCounty,
		BuyerIsVatPayer:      buyerIsVATPayer,
		BuyerEmail:           buyerEmail,
		SubtotalAmount:       subtotalNet,
		VatRate:              numericFromInt(int(vatRate)),
		VatAmount:            vatAmount,
		TotalAmount:          totalBani,
		Currency:             "RON",
		BookingID:            booking.ID,
		PaymentTransactionID: pgtype.UUID{},
		CompanyID:            company.ID,
		ClientUserID:         clientUserID,
		Status:               db.InvoiceStatusIssued,
		DueDate:              dueDate,
		Notes:                pgText(fmt.Sprintf("Servicii curatenie - rezervare %s", booking.ReferenceCode)),
	})
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: create client service invoice: %w", err)
	}

	// Create the line item.
	_, err = s.queries.CreateInvoiceLineItem(ctx, db.CreateInvoiceLineItemParams{
		InvoiceID:        inv.ID,
		DescriptionRo:    fmt.Sprintf("Servicii curatenie - %s", booking.ReferenceCode),
		DescriptionEn:    pgText(fmt.Sprintf("Cleaning services - %s", booking.ReferenceCode)),
		Quantity:         numericFromInt(1),
		UnitPrice:        subtotalNet,
		VatRate:          numericFromInt(int(vatRate)),
		VatAmount:        vatAmount,
		LineTotal:        subtotalNet,
		LineTotalWithVat: totalBani,
		SortOrder:        pgtype.Int4{Int32: 1, Valid: true},
	})
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: create line item: %w", err)
	}

	log.Printf("invoice: created client service invoice %s for booking %s", invoiceNumber, booking.ReferenceCode)
	return inv, nil
}

// GenerateCommissionInvoice creates a platform commission invoice where the
// platform (seller) invoices a cleaning company (buyer) for commission fees.
// The amount parameter is the net commission in bani (without VAT). VAT is calculated on top.
func (s *Service) GenerateCommissionInvoice(
	ctx context.Context,
	companyID pgtype.UUID,
	amount int32,
	bookingCount int,
	periodFrom string,
	periodTo string,
) (db.Invoice, error) {
	company, err := s.queries.GetCompanyByID(ctx, companyID)
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: get company: %w", err)
	}

	// Idempotency: check if a commission invoice already exists for this period.
	existing, existErr := s.queries.GetCommissionInvoiceByPeriod(ctx, db.GetCommissionInvoiceByPeriodParams{
		CompanyID: companyID,
		Column2:   pgText(periodFrom),
		Column3:   pgText(periodTo),
	})
	if existErr == nil {
		log.Printf("invoice: commission invoice %s already exists for period %s to %s", textVal(existing.InvoiceNumber), periodFrom, periodTo)
		return existing, nil
	}

	// Commission amount is the net (without VAT). Calculate VAT on top.
	vatRate := int32(s.loadVATRate(ctx))
	subtotalNet := amount
	vatAmount := subtotalNet * vatRate / 100
	totalAmount := subtotalNet + vatAmount

	dueDate := pgtype.Date{Time: time.Now().AddDate(0, 0, 30), Valid: true}

	// Load platform config from database
	pc, err := s.loadPlatformConfig(ctx)
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: load platform config: %w", err)
	}

	// Invoice number is assigned by Keez; we leave it null until Keez responds.
	inv, err := s.queries.CreateInvoice(ctx, db.CreateInvoiceParams{
		InvoiceType:          db.InvoiceTypePlatformCommission,
		InvoiceNumber:        pgtype.Text{},
		SellerCompanyName:    pc.CompanyName,
		SellerCui:            pc.CUI,
		SellerRegNumber:      pgText(pc.RegNumber),
		SellerAddress:        pc.Address,
		SellerCity:           pc.City,
		SellerCounty:         pc.County,
		SellerIsVatPayer:     pc.IsVATPayer,
		SellerBankName:       pgText(pc.BankName),
		SellerIban:           pgText(pc.IBAN),
		BuyerName:            company.CompanyName,
		BuyerCui:             pgText(company.Cui),
		BuyerRegNumber:       pgtype.Text{},
		BuyerAddress:         pgText(company.Address),
		BuyerCity:            pgText(company.City),
		BuyerCounty:          pgText(company.County),
		BuyerIsVatPayer:      pgtype.Bool{Bool: true, Valid: true},
		BuyerEmail:           pgText(company.ContactEmail),
		SubtotalAmount:       subtotalNet,
		VatRate:              numericFromInt(int(vatRate)),
		VatAmount:            vatAmount,
		TotalAmount:          totalAmount,
		Currency:             "RON",
		BookingID:            pgtype.UUID{},
		PaymentTransactionID: pgtype.UUID{},
		CompanyID:            companyID,
		ClientUserID:         pgtype.UUID{},
		Status:               db.InvoiceStatusIssued,
		DueDate:              dueDate,
		Notes:                pgText(fmt.Sprintf("Comision platforma Go2Fix - %s pana la %s", periodFrom, periodTo)),
	})
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: create commission invoice: %w", err)
	}

	descRo := fmt.Sprintf("Comision platforma Go2Fix - %d rezervari (%s - %s)", bookingCount, periodFrom, periodTo)
	descEn := fmt.Sprintf("Go2Fix platform commission - %d bookings (%s - %s)", bookingCount, periodFrom, periodTo)

	_, err = s.queries.CreateInvoiceLineItem(ctx, db.CreateInvoiceLineItemParams{
		InvoiceID:        inv.ID,
		DescriptionRo:    descRo,
		DescriptionEn:    pgText(descEn),
		Quantity:         numericFromInt(1),
		UnitPrice:        subtotalNet,
		VatRate:          numericFromInt(int(vatRate)),
		VatAmount:        vatAmount,
		LineTotal:        subtotalNet,
		LineTotalWithVat: totalAmount,
		SortOrder:        pgtype.Int4{Int32: 1, Valid: true},
	})
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: create commission line item: %w", err)
	}

	// Push to Keez — they are the source of truth for the invoice number.
	if ensureErr := s.ensureKeezItems(ctx); ensureErr != nil {
		log.Printf("invoice: keez.ro ensure items error (non-fatal): %v", ensureErr)
	}

	lineItems, _ := s.queries.ListInvoiceLineItems(ctx, inv.ID)
	extID, keezSeries, keezNum, apiErr := s.createInvoiceOnKeez(ctx, inv, lineItems, s.keezCommissionID, nil)
	if apiErr != nil {
		log.Printf("invoice: keez.ro API error for commission invoice (non-fatal): %v", apiErr)
	} else if extID != "" {
		assignedNumber := keezSeries + " " + keezNum
		updateErr := s.queries.UpdateInvoiceKeez(ctx, db.UpdateInvoiceKeezParams{
			ID:             inv.ID,
			InvoiceNumber:  pgText(assignedNumber),
			KeezExternalID: pgText(extID),
			KeezSeries:     pgText(keezSeries),
			KeezNumber:     pgText(keezNum),
		})
		if updateErr != nil {
			log.Printf("invoice: failed to persist keez metadata: %v", updateErr)
		} else {
			inv.InvoiceNumber = pgText(assignedNumber)
			inv.KeezExternalID = pgText(extID)
			inv.KeezSeries = pgText(keezSeries)
			inv.KeezNumber = pgText(keezNum)
		}
	}

	// Auto-transmit to e-factura (best-effort, non-blocking).
	if inv.KeezExternalID.Valid && inv.KeezExternalID.String != "" {
		go func() {
			bgCtx := context.Background()
			if transmitErr := s.TransmitToEFactura(bgCtx, inv.ID); transmitErr != nil {
				log.Printf("invoice: auto e-factura transmission failed (non-fatal): %v", transmitErr)
			} else {
				log.Printf("invoice: auto-transmitted commission invoice %s to e-factura", textVal(inv.InvoiceNumber))
			}
		}()
	}

	log.Printf("invoice: created commission invoice %s for company %s", textVal(inv.InvoiceNumber), company.CompanyName)
	return inv, nil
}

// GenerateSubscriptionMonthlyInvoice creates a monthly invoice for a recurring
// subscription. The seller is the cleaning company and the buyer is the client.
// This should be called from the subscription service's HandleInvoicePaid method
// after the Stripe invoice.paid webhook confirms payment for a new billing period.
func (s *Service) GenerateSubscriptionMonthlyInvoice(
	ctx context.Context,
	sub db.Subscription,
	company db.Company,
	periodStart, periodEnd time.Time,
) error {
	// Guard: subscription must have a positive monthly amount.
	if sub.MonthlyAmountBani <= 0 {
		return errors.New("invoice: subscription has no monthly amount")
	}

	// Treat the monthly amount as VAT-inclusive: net = total * 100 / (100 + vat%), vat = total - net.
	vatRate := int32(s.loadVATRate(ctx))
	totalBani := sub.MonthlyAmountBani
	subtotalNet := totalBani * 100 / (100 + vatRate)
	vatAmount := totalBani - subtotalNet

	// Resolve buyer info from the subscription's client user.
	billingProfile, profileErr := s.queries.GetBillingProfileByUser(ctx, sub.ClientUserID)
	buyerName, buyerCUI, buyerRegNumber, buyerAddress, buyerCity, buyerCounty, buyerIsVATPayer, buyerEmail :=
		s.resolveBuyerInfo(ctx, sub.ClientUserID, billingProfile, profileErr)

	dueDate := pgtype.Date{Time: time.Now().AddDate(0, 0, 30), Valid: true}

	// Map recurrence type to a Romanian label for the line item description.
	frequencyLabel := "lunar"
	switch sub.RecurrenceType {
	case db.RecurrenceTypeWeekly:
		frequencyLabel = "saptamanal"
	case db.RecurrenceTypeBiweekly:
		frequencyLabel = "bi-saptamanal"
	case db.RecurrenceTypeMonthly:
		frequencyLabel = "lunar"
	}

	notes := fmt.Sprintf("Abonament curatenie %s - %s pana %s",
		frequencyLabel,
		periodStart.Format("02.01.2006"),
		periodEnd.Format("02.01.2006"),
	)

	// Create the local DB invoice record.
	inv, err := s.queries.CreateInvoice(ctx, db.CreateInvoiceParams{
		InvoiceType:          db.InvoiceTypeSubscriptionMonthly,
		InvoiceNumber:        pgtype.Text{},
		SellerCompanyName:    company.CompanyName,
		SellerCui:            company.Cui,
		SellerRegNumber:      pgtype.Text{},
		SellerAddress:        company.Address,
		SellerCity:           company.City,
		SellerCounty:         company.County,
		SellerIsVatPayer:     true,
		SellerBankName:       pgtype.Text{},
		SellerIban:           pgtype.Text{},
		BuyerName:            buyerName,
		BuyerCui:             buyerCUI,
		BuyerRegNumber:       buyerRegNumber,
		BuyerAddress:         buyerAddress,
		BuyerCity:            buyerCity,
		BuyerCounty:          buyerCounty,
		BuyerIsVatPayer:      buyerIsVATPayer,
		BuyerEmail:           buyerEmail,
		SubtotalAmount:       subtotalNet,
		VatRate:              numericFromInt(int(vatRate)),
		VatAmount:            vatAmount,
		TotalAmount:          totalBani,
		Currency:             "RON",
		BookingID:            pgtype.UUID{}, // No booking link for subscription invoices.
		PaymentTransactionID: pgtype.UUID{},
		CompanyID:            company.ID,
		ClientUserID:         sub.ClientUserID,
		Status:               db.InvoiceStatusIssued,
		DueDate:              dueDate,
		Notes:                pgText(notes),
	})
	if err != nil {
		return fmt.Errorf("invoice: create subscription monthly invoice: %w", err)
	}

	// Create a single line item describing the subscription period.
	descRo := fmt.Sprintf("Abonament curatenie %s - %s pana %s",
		frequencyLabel,
		periodStart.Format("02.01.2006"),
		periodEnd.Format("02.01.2006"),
	)
	descEn := fmt.Sprintf("Cleaning subscription %s - %s to %s",
		string(sub.RecurrenceType),
		periodStart.Format("02.01.2006"),
		periodEnd.Format("02.01.2006"),
	)

	_, err = s.queries.CreateInvoiceLineItem(ctx, db.CreateInvoiceLineItemParams{
		InvoiceID:        inv.ID,
		DescriptionRo:    descRo,
		DescriptionEn:    pgText(descEn),
		Quantity:         numericFromInt(1),
		UnitPrice:        subtotalNet,
		VatRate:          numericFromInt(int(vatRate)),
		VatAmount:        vatAmount,
		LineTotal:        subtotalNet,
		LineTotalWithVat: totalBani,
		SortOrder:        pgtype.Int4{Int32: 1, Valid: true},
	})
	if err != nil {
		return fmt.Errorf("invoice: create subscription line item: %w", err)
	}

	// Subscription invoices (company → client) are NOT synced to Keez.
	// Keez is only used for platform commission invoices (Go2Fix → company).
	log.Printf("invoice: created subscription monthly invoice for subscription %s, amount=%d bani",
		uuidToString(sub.ID), totalBani)
	return nil
}

// CancelInvoice marks an invoice as cancelled, both locally and on Keez.ro.
func (s *Service) CancelInvoice(ctx context.Context, invoiceID pgtype.UUID) (db.Invoice, error) {
	inv, err := s.queries.GetInvoiceByID(ctx, invoiceID)
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: get invoice for cancellation: %w", err)
	}

	if inv.Status == db.InvoiceStatusCancelled {
		return inv, nil
	}

	// Cancel on Keez.ro if the invoice was synced.
	if inv.KeezExternalID.Valid && inv.KeezExternalID.String != "" {
		cancelPayload := map[string]string{
			"externalId": inv.KeezExternalID.String,
		}
		_, apiErr := s.callKeezAPI(ctx, http.MethodPost, "/invoices/canceled", cancelPayload)
		if apiErr != nil {
			log.Printf("invoice: keez.ro cancel error (non-fatal): %v", apiErr)
		}
	}

	updated, err := s.queries.UpdateInvoiceStatus(ctx, db.UpdateInvoiceStatusParams{
		ID:     invoiceID,
		Status: db.InvoiceStatusCancelled,
	})
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: update status to cancelled: %w", err)
	}

	log.Printf("invoice: cancelled invoice %s", textVal(inv.InvoiceNumber))
	return updated, nil
}

// TransmitToEFactura triggers e-factura submission via the Keez.ro API.
func (s *Service) TransmitToEFactura(ctx context.Context, invoiceID pgtype.UUID) error {
	inv, err := s.queries.GetInvoiceByID(ctx, invoiceID)
	if err != nil {
		return fmt.Errorf("invoice: get invoice for e-factura: %w", err)
	}

	if !inv.KeezExternalID.Valid || inv.KeezExternalID.String == "" {
		return errors.New("invoice: cannot transmit to e-factura: invoice not synced to keez.ro")
	}

	eInvPayload := map[string]string{
		"externalId": inv.KeezExternalID.String,
	}

	_, err = s.callKeezAPI(ctx, http.MethodPost, "/invoices/efactura/submitted", eInvPayload)
	if err != nil {
		return fmt.Errorf("invoice: e-factura transmission via keez.ro: %w", err)
	}

	// On success, update DB with transmitted status.
	updateErr := s.queries.UpdateInvoiceEFactura(ctx, db.UpdateInvoiceEFacturaParams{
		ID:             invoiceID,
		EfacturaStatus: pgText("transmitted"),
		EfacturaIndex:  pgText(""),
	})
	if updateErr != nil {
		return fmt.Errorf("invoice: update e-factura status: %w", updateErr)
	}

	log.Printf("invoice: transmitted invoice %s to e-factura", textVal(inv.InvoiceNumber))
	return nil
}

// CheckEFacturaStatus returns the current invoice from the database.
// Keez.ro does not expose an e-factura status polling endpoint, so no API call is made.
func (s *Service) CheckEFacturaStatus(ctx context.Context, invoiceID pgtype.UUID) (db.Invoice, error) {
	return s.queries.GetInvoiceByID(ctx, invoiceID)
}

// GenerateCreditNote creates a credit note (storno) referencing an original invoice.
// The amount parameter is in bani and represents the credited total (VAT-inclusive).
// If the original invoice was synced to Keez, a storno invoice is also created there.
func (s *Service) GenerateCreditNote(ctx context.Context, invoiceID pgtype.UUID, amount int32, reason string) (db.Invoice, error) {
	original, err := s.queries.GetInvoiceByID(ctx, invoiceID)
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: get original invoice for credit note: %w", err)
	}

	if amount <= 0 {
		return db.Invoice{}, errors.New("invoice: credit note amount must be positive")
	}

	// Compute net and VAT from the credited total (VAT-inclusive).
	vatRate := int32(s.loadVATRate(ctx))
	creditTotal := amount
	creditNet := creditTotal * 100 / (100 + vatRate)
	creditVAT := creditTotal - creditNet

	// Use negative amounts to represent the credit.
	negNet := -creditNet
	negVAT := -creditVAT
	negTotal := -creditTotal

	// Generate a credit note number using the "CN" prefix.
	invoiceNumber, err := s.NewInvoiceNumber(ctx, original.CompanyID, "CN")
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: generate credit note number: %w", err)
	}

	dueDate := pgtype.Date{Time: time.Now().AddDate(0, 0, 30), Valid: true}
	notes := fmt.Sprintf("Nota de credit pentru factura %s - %s", textVal(original.InvoiceNumber), reason)

	creditNote, err := s.queries.CreateInvoice(ctx, db.CreateInvoiceParams{
		InvoiceType:          original.InvoiceType,
		InvoiceNumber:        pgText(invoiceNumber),
		SellerCompanyName:    original.SellerCompanyName,
		SellerCui:            original.SellerCui,
		SellerRegNumber:      original.SellerRegNumber,
		SellerAddress:        original.SellerAddress,
		SellerCity:           original.SellerCity,
		SellerCounty:         original.SellerCounty,
		SellerIsVatPayer:     original.SellerIsVatPayer,
		SellerBankName:       original.SellerBankName,
		SellerIban:           original.SellerIban,
		BuyerName:            original.BuyerName,
		BuyerCui:             original.BuyerCui,
		BuyerRegNumber:       original.BuyerRegNumber,
		BuyerAddress:         original.BuyerAddress,
		BuyerCity:            original.BuyerCity,
		BuyerCounty:          original.BuyerCounty,
		BuyerIsVatPayer:      original.BuyerIsVatPayer,
		BuyerEmail:           original.BuyerEmail,
		SubtotalAmount:       negNet,
		VatRate:              numericFromInt(int(vatRate)),
		VatAmount:            negVAT,
		TotalAmount:          negTotal,
		Currency:             original.Currency,
		BookingID:            original.BookingID,
		PaymentTransactionID: original.PaymentTransactionID,
		CompanyID:            original.CompanyID,
		ClientUserID:         original.ClientUserID,
		Status:               db.InvoiceStatusCreditNote,
		DueDate:              dueDate,
		Notes:                pgText(notes),
	})
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: create credit note: %w", err)
	}

	_, err = s.queries.CreateInvoiceLineItem(ctx, db.CreateInvoiceLineItemParams{
		InvoiceID:        creditNote.ID,
		DescriptionRo:    fmt.Sprintf("Stornare - %s", reason),
		DescriptionEn:    pgText(fmt.Sprintf("Credit note - %s", reason)),
		Quantity:         numericFromInt(1),
		UnitPrice:        negNet,
		VatRate:          numericFromInt(int(vatRate)),
		VatAmount:        negVAT,
		LineTotal:        negNet,
		LineTotalWithVat: negTotal,
		SortOrder:        pgtype.Int4{Int32: 1, Valid: true},
	})
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: create credit note line item: %w", err)
	}

	// Sync storno to Keez.ro if the original invoice was synced there.
	if original.KeezExternalID.Valid && original.KeezExternalID.String != "" &&
		original.KeezSeries.Valid && original.KeezSeries.String != "" &&
		original.KeezNumber.Valid && original.KeezNumber.String != "" {

		if ensureErr := s.ensureKeezItems(ctx); ensureErr != nil {
			log.Printf("invoice: keez.ro ensure items error for storno (non-fatal): %v", ensureErr)
		} else {
			stornoRef := &keezStornoRef{
				Series: original.KeezSeries.String,
				Number: original.KeezNumber.String,
				Date:   original.IssuedAt.Time.Format("20060102"),
			}

			// Build a synthetic local invoice with positive amounts for the Keez payload —
			// the storno marker in the request handles the sign reversal.
			syntheticInv := creditNote
			syntheticInv.SubtotalAmount = creditNet
			syntheticInv.VatAmount = creditVAT
			syntheticInv.TotalAmount = creditTotal

			lineItems, _ := s.queries.ListInvoiceLineItems(ctx, creditNote.ID)
			extID, keezSeries, keezNum, apiErr := s.createInvoiceOnKeez(ctx, syntheticInv, lineItems, s.keezCommissionID, stornoRef)
			if apiErr != nil {
				log.Printf("invoice: keez.ro storno API error (non-fatal): %v", apiErr)
			} else if extID != "" {
				assignedNumber := keezSeries + " " + keezNum
				updateErr := s.queries.UpdateInvoiceKeez(ctx, db.UpdateInvoiceKeezParams{
					ID:             creditNote.ID,
					InvoiceNumber:  pgText(assignedNumber),
					KeezExternalID: pgText(extID),
					KeezSeries:     pgText(keezSeries),
					KeezNumber:     pgText(keezNum),
				})
				if updateErr != nil {
					log.Printf("invoice: failed to persist keez storno metadata: %v", updateErr)
				} else {
					creditNote.InvoiceNumber = pgText(assignedNumber)
					creditNote.KeezExternalID = pgText(extID)
					creditNote.KeezSeries = pgText(keezSeries)
					creditNote.KeezNumber = pgText(keezNum)
				}
			}
		}
	}

	log.Printf("invoice: created credit note %s for original invoice %s", invoiceNumber, textVal(original.InvoiceNumber))
	return creditNote, nil
}

// ---------------------------------------------------------------------------
// Keez.ro API helpers
// ---------------------------------------------------------------------------

// keezBaseURL returns the base URL for all Keez.ro public API calls for this client.
func (s *Service) keezBaseURL() string {
	return "https://app.keez.ro/api/v1.0/public-api/" + s.keezClientEid
}

// callKeezAPI performs an authenticated HTTP request to the Keez.ro REST API.
// path is relative to the client-scoped base URL (e.g. "/invoices").
// body must be JSON-serialisable or nil (for GET requests without a body).
func (s *Service) callKeezAPI(ctx context.Context, method, path string, body interface{}) ([]byte, error) {
	token, err := s.keezGetToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("invoice: keez auth: %w", err)
	}

	var reqBody io.Reader
	if body != nil {
		jsonBytes, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("invoice: marshal keez request body: %w", err)
		}
		reqBody = bytes.NewReader(jsonBytes)
	}

	req, err := http.NewRequestWithContext(ctx, method, s.keezBaseURL()+path, reqBody)
	if err != nil {
		return nil, fmt.Errorf("invoice: create keez HTTP request: %w", err)
	}
	req.Header.Set("Authorization", token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("invoice: keez HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("invoice: read keez response body: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("invoice: keez API returned %d: %s", resp.StatusCode, string(respBody))
		return respBody, fmt.Errorf("invoice: keez returned status %d", resp.StatusCode)
	}

	return respBody, nil
}

// ensureKeezItems lazily creates and caches the platform commission line-item on Keez.ro.
// It is safe to call concurrently. If Keez is not configured, it returns nil silently.
func (s *Service) ensureKeezItems(ctx context.Context) error {
	if s.keezClientEid == "" {
		return nil // Not configured; skip silently.
	}

	s.keezItemMu.Lock()
	defer s.keezItemMu.Unlock()

	if s.keezCommissionID != "" {
		return nil
	}

	type keezItemRequest struct {
		Name               string `json:"name"`
		CurrencyCode       string `json:"currencyCode"`
		MeasureUnitID      int    `json:"measureUnitId"`
		IsActive           bool   `json:"isActive"`
		CategoryExternalID string `json:"categoryExternalId"`
	}

	type keezItemResponse struct {
		ExternalID string `json:"externalId"`
	}

	payload := keezItemRequest{
		Name:               "Comision platforma Go2Fix",
		CurrencyCode:       "RON",
		MeasureUnitID:      1,
		IsActive:           true,
		CategoryExternalID: "ITSRV", // "Servicii it si similare" — 19% VAT, for digital marketplace services
	}
	respBody, err := s.callKeezAPI(ctx, http.MethodPost, "/items", payload)
	if err != nil {
		return fmt.Errorf("invoice: create keez commission item: %w", err)
	}
	var itemResp keezItemResponse
	if jsonErr := json.Unmarshal(respBody, &itemResp); jsonErr != nil {
		return fmt.Errorf("invoice: parse keez item response: %w", jsonErr)
	}
	if itemResp.ExternalID == "" {
		return fmt.Errorf("invoice: keez returned empty externalId for commission item")
	}
	s.keezCommissionID = itemResp.ExternalID
	return nil
}

// keezStornoRef holds the reference to the original invoice for a storno invoice.
type keezStornoRef struct {
	Series string `json:"series"`
	Number string `json:"number"`
	Date   string `json:"date"` // yyyyMMdd
}

// keezInvoiceDetail represents a single line item in a Keez invoice creation request.
type keezInvoiceDetail struct {
	ItemExternalID              string  `json:"itemExternalId"`
	MeasureUnitID               int     `json:"measureUnitId"`
	Quantity                    float64 `json:"quantity"`
	UnitPrice                   float64 `json:"unitPrice"`
	OriginalNetAmount           float64 `json:"originalNetAmount"`
	OriginalNetAmountCurrency   float64 `json:"originalNetAmountCurrency"`
	OriginalVatAmount           float64 `json:"originalVatAmount"`
	OriginalVatAmountCurrency   float64 `json:"originalVatAmountCurrency"`
	NetAmount                   float64 `json:"netAmount"`
	NetAmountCurrency           float64 `json:"netAmountCurrency"`
	VatAmount                   float64 `json:"vatAmount"`
	VatAmountCurrency           float64 `json:"vatAmountCurrency"`
	GrossAmount                 float64 `json:"grossAmount"`
	GrossAmountCurrency         float64 `json:"grossAmountCurrency"`
}

// keezPartner describes the buyer/partner in a Keez invoice.
type keezPartner struct {
	IsLegalPerson        bool   `json:"isLegalPerson"`
	PartnerName          string `json:"partnerName"`
	IdentificationNumber string `json:"identificationNumber,omitempty"`
	RegistrationNumber   string `json:"registrationNumber,omitempty"`
	TaxAttribute         string `json:"taxAttribute,omitempty"`
	CountryCode          string `json:"countryCode,omitempty"`
	CountryName          string `json:"countryName,omitempty"`
	CityName             string `json:"cityName,omitempty"`
	AddressDetails       string `json:"addressDetails,omitempty"`
}

// keezInvoiceRequest is the full payload for POST /{clientEid}/invoices on Keez.ro.
type keezInvoiceRequest struct {
	Series                    string              `json:"series"`
	DocumentDate              int                 `json:"documentDate"`
	DueDate                   int                 `json:"dueDate"`
	VatOnCollection           bool                `json:"vatOnCollection"`
	CurrencyCode              string              `json:"currencyCode"`
	OriginalNetAmount         float64             `json:"originalNetAmount"`
	OriginalNetAmountCurrency float64             `json:"originalNetAmountCurrency"`
	OriginalVatAmount         float64             `json:"originalVatAmount"`
	OriginalVatAmountCurrency float64             `json:"originalVatAmountCurrency"`
	NetAmount                 float64             `json:"netAmount"`
	NetAmountCurrency         float64             `json:"netAmountCurrency"`
	VatAmount                 float64             `json:"vatAmount"`
	VatAmountCurrency         float64             `json:"vatAmountCurrency"`
	GrossAmount               float64             `json:"grossAmount"`
	GrossAmountCurrency       float64             `json:"grossAmountCurrency"`
	PaymentTypeID             int                 `json:"paymentTypeId"`
	Partner                   keezPartner         `json:"partner"`
	InvoiceDetails            []keezInvoiceDetail `json:"invoiceDetails"`
	Storno                    *keezStornoRef      `json:"storno,omitempty"`
}

// keezCreateInvoiceResponse is the response from POST /{clientEid}/invoices.
type keezCreateInvoiceResponse struct {
	ExternalID string `json:"externalId"`
}

// keezInvoiceResponse is the response from GET /{clientEid}/invoices/{externalId}.
type keezInvoiceResponse struct {
	Series string `json:"series"`
	Number string `json:"number"`
}

// createInvoiceOnKeez syncs a local invoice to Keez.ro.
// It creates the invoice, validates it (Draft → Fiscal), and retrieves the assigned series and number.
// Returns (externalId, series, number, error).
// If Keez is not configured, it returns ("", "", "", nil) silently.
// stornoRef is optional; when non-nil, the invoice is created as a storno (credit note).
func (s *Service) createInvoiceOnKeez(
	ctx context.Context,
	inv db.Invoice,
	lineItems []db.InvoiceLineItem,
	itemExternalID string,
	stornoRef *keezStornoRef,
) (string, string, string, error) {
	if s.keezClientEid == "" {
		return "", "", "", nil // Not configured; skip silently.
	}

	netRON := baniToRON(inv.SubtotalAmount)
	vatRON := baniToRON(inv.VatAmount)
	grossRON := baniToRON(inv.TotalAmount)

	documentDateInt := mustDateInt(time.Now())
	dueDateInt := mustDateInt(time.Now().AddDate(0, 0, 30))

	// Build partner block.
	partner := buildKeezPartner(inv)

	// Build invoice detail lines.
	details := buildKeezDetails(lineItems, itemExternalID, netRON, vatRON, grossRON)

	payload := keezInvoiceRequest{
		Series:                    s.keezSeries,
		DocumentDate:              documentDateInt,
		DueDate:                   dueDateInt,
		VatOnCollection:           false,
		CurrencyCode:              "RON",
		OriginalNetAmount:         netRON,
		OriginalNetAmountCurrency: netRON,
		OriginalVatAmount:         vatRON,
		OriginalVatAmountCurrency: vatRON,
		NetAmount:                 netRON,
		NetAmountCurrency:         netRON,
		VatAmount:                 vatRON,
		VatAmountCurrency:         vatRON,
		GrossAmount:               grossRON,
		GrossAmountCurrency:       grossRON,
		PaymentTypeID:             3, // transfer bancar
		Partner:                   partner,
		InvoiceDetails:            details,
		Storno:                    stornoRef,
	}

	// Step 1: Create the invoice (Draft state).
	createBody, err := s.callKeezAPI(ctx, http.MethodPost, "/invoices", payload)
	if err != nil {
		return "", "", "", fmt.Errorf("create invoice on keez.ro: %w", err)
	}

	var createResp keezCreateInvoiceResponse
	if jsonErr := json.Unmarshal(createBody, &createResp); jsonErr != nil {
		return "", "", "", fmt.Errorf("parse keez create invoice response: %w", jsonErr)
	}
	if createResp.ExternalID == "" {
		return "", "", "", errors.New("keez.ro returned empty externalId after invoice creation")
	}
	extID := createResp.ExternalID

	// Step 2: Validate the invoice (Draft → Fiscal).
	validPayload := map[string]string{"externalId": extID}
	_, err = s.callKeezAPI(ctx, http.MethodPost, "/invoices/valid", validPayload)
	if err != nil {
		return "", "", "", fmt.Errorf("validate keez invoice %s: %w", extID, err)
	}

	// Step 3: Fetch the validated invoice to get the assigned series and number.
	getBody, err := s.callKeezAPI(ctx, http.MethodGet, "/invoices/"+extID, nil)
	if err != nil {
		return "", "", "", fmt.Errorf("fetch keez invoice %s: %w", extID, err)
	}

	var getResp keezInvoiceResponse
	if jsonErr := json.Unmarshal(getBody, &getResp); jsonErr != nil {
		return "", "", "", fmt.Errorf("parse keez get invoice response: %w", jsonErr)
	}

	return extID, getResp.Series, getResp.Number, nil
}

// buildKeezPartner constructs the Keez partner block from an invoice record.
func buildKeezPartner(inv db.Invoice) keezPartner {
	buyerCUI := textVal(inv.BuyerCui)
	isLegalPerson := buyerCUI != ""

	p := keezPartner{
		IsLegalPerson: isLegalPerson,
		PartnerName:   inv.BuyerName,
		CountryCode:   "RO",
		CountryName:   "Romania",
		CityName:      textVal(inv.BuyerCity),
		AddressDetails: textVal(inv.BuyerAddress),
	}

	if isLegalPerson {
		// Strip "RO" prefix from CUI for the identification number field.
		cui := strings.TrimPrefix(strings.TrimPrefix(buyerCUI, "RO"), "ro")
		p.IdentificationNumber = cui
		p.RegistrationNumber = textVal(inv.BuyerRegNumber)
		p.TaxAttribute = "RO"
	} else {
		// Natural person: use name as identification when no CUI is present.
		p.IdentificationNumber = inv.BuyerName
	}

	return p
}

// buildKeezDetails constructs the invoice detail lines for a Keez invoice.
// When no line items are present, a single synthetic line is generated from the invoice totals.
func buildKeezDetails(
	lineItems []db.InvoiceLineItem,
	itemExternalID string,
	invoiceNetRON float64,
	invoiceVatRON float64,
	invoiceGrossRON float64,
) []keezInvoiceDetail {
	if len(lineItems) == 0 {
		// Synthetic fallback — single line covering the full invoice amounts.
		d := keezInvoiceDetail{
			ItemExternalID:              itemExternalID,
			MeasureUnitID:               1,
			Quantity:                    1,
			UnitPrice:                   invoiceNetRON,
			OriginalNetAmount:           invoiceNetRON,
			OriginalNetAmountCurrency:   invoiceNetRON,
			OriginalVatAmount:           invoiceVatRON,
			OriginalVatAmountCurrency:   invoiceVatRON,
			NetAmount:                   invoiceNetRON,
			NetAmountCurrency:           invoiceNetRON,
			VatAmount:                   invoiceVatRON,
			VatAmountCurrency:           invoiceVatRON,
			GrossAmount:                 invoiceGrossRON,
			GrossAmountCurrency:         invoiceGrossRON,
		}
		return []keezInvoiceDetail{d}
	}

	details := make([]keezInvoiceDetail, 0, len(lineItems))
	for _, li := range lineItems {
		qty := numericToFloat64(li.Quantity)
		if qty == 0 {
			qty = 1
		}
		unitNetRON := baniToRON(li.UnitPrice)
		lineNetRON := baniToRON(li.LineTotal)
		lineVatRON := baniToRON(li.VatAmount)
		lineGrossRON := baniToRON(li.LineTotalWithVat)

		d := keezInvoiceDetail{
			ItemExternalID:              itemExternalID,
			MeasureUnitID:               1,
			Quantity:                    qty,
			UnitPrice:                   unitNetRON,
			OriginalNetAmount:           lineNetRON,
			OriginalNetAmountCurrency:   lineNetRON,
			OriginalVatAmount:           lineVatRON,
			OriginalVatAmountCurrency:   lineVatRON,
			NetAmount:                   lineNetRON,
			NetAmountCurrency:           lineNetRON,
			VatAmount:                   lineVatRON,
			VatAmountCurrency:           lineVatRON,
			GrossAmount:                 lineGrossRON,
			GrossAmountCurrency:         lineGrossRON,
		}
		details = append(details, d)
	}
	return details
}

// mustDateInt converts a time.Time to the Keez integer date format yyyyMMdd (e.g. 20240216).
func mustDateInt(t time.Time) int {
	y, m, d := t.Date()
	return y*10000 + int(m)*100 + d
}

// ---------------------------------------------------------------------------
// Buyer resolution
// ---------------------------------------------------------------------------

// resolveBuyerInfo determines the buyer's details for an invoice. If a billing
// profile exists and is a company, it uses those B2B details. Otherwise it falls
// back to the user's basic information.
func (s *Service) resolveBuyerInfo(
	ctx context.Context,
	clientUserID pgtype.UUID,
	billingProfile db.ClientBillingProfile,
	profileErr error,
) (
	buyerName string,
	buyerCUI pgtype.Text,
	buyerRegNumber pgtype.Text,
	buyerAddress pgtype.Text,
	buyerCity pgtype.Text,
	buyerCounty pgtype.Text,
	buyerIsVATPayer pgtype.Bool,
	buyerEmail pgtype.Text,
) {
	// If we have a valid billing profile with company details, use it.
	if profileErr == nil && billingProfile.IsCompany {
		buyerName = textVal(billingProfile.CompanyName)
		if buyerName == "" {
			buyerName = "Persoana fizica"
		}
		buyerCUI = billingProfile.Cui
		buyerRegNumber = billingProfile.RegNumber
		buyerAddress = billingProfile.Address
		buyerCity = billingProfile.City
		buyerCounty = billingProfile.County
		buyerIsVATPayer = billingProfile.IsVatPayer
		// Pull email from the user record.
		user, userErr := s.queries.GetUserByID(ctx, clientUserID)
		if userErr == nil {
			buyerEmail = pgText(user.Email)
		}
		return
	}

	// Fall back to user's basic info.
	user, userErr := s.queries.GetUserByID(ctx, clientUserID)
	if userErr != nil {
		log.Printf("invoice: failed to get user %s: %v", uuidToString(clientUserID), userErr)
		buyerName = "Client"
		return
	}

	buyerName = user.FullName
	if buyerName == "" {
		buyerName = "Client"
	}
	buyerEmail = pgText(user.Email)

	// Individual clients do not have CUI/RegNumber; the zero-value pgtype fields
	// represent NULL, which is the correct behavior.
	return
}

// MarkInvoiceAsPaid marks an invoice as paid. Admin only.
func (s *Service) MarkInvoiceAsPaid(ctx context.Context, id pgtype.UUID) (db.Invoice, error) {
	inv, err := s.queries.MarkInvoiceAsPaid(ctx, id)
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: mark as paid: %w", err)
	}
	return inv, nil
}

// ---------------------------------------------------------------------------
// Type conversion helpers
// ---------------------------------------------------------------------------

// uuidToString converts a pgtype.UUID to its canonical string representation.
func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// stringToUUID parses a UUID string (with or without dashes) into a pgtype.UUID.
func stringToUUID(s string) pgtype.UUID {
	s = strings.ReplaceAll(s, "-", "")
	if len(s) != 32 {
		return pgtype.UUID{}
	}
	var b [16]byte
	for i := 0; i < 16; i++ {
		_, err := fmt.Sscanf(s[i*2:i*2+2], "%02x", &b[i])
		if err != nil {
			return pgtype.UUID{}
		}
	}
	return pgtype.UUID{Bytes: b, Valid: true}
}

// pgText creates a valid pgtype.Text from a string. An empty string produces
// a valid Text with an empty value (not NULL).
func pgText(s string) pgtype.Text {
	return pgtype.Text{String: s, Valid: true}
}

// textVal extracts a string from a pgtype.Text, returning "" if null.
func textVal(t pgtype.Text) string {
	if !t.Valid {
		return ""
	}
	return t.String
}

// numericFromInt creates a pgtype.Numeric from an integer value.
func numericFromInt(val int) pgtype.Numeric {
	return pgtype.Numeric{
		Int:   big.NewInt(int64(val)),
		Exp:   0,
		Valid: true,
	}
}

// numericToFloat64 extracts a float64 from a pgtype.Numeric.
func numericToFloat64(n pgtype.Numeric) float64 {
	if !n.Valid {
		return 0
	}
	f, err := n.Float64Value()
	if err != nil {
		return 0
	}
	return f.Float64
}

// numericToInt32 extracts an int32 from a pgtype.Numeric, useful for reading
// monetary amounts stored as numeric in the Booking model.
func numericToInt32(n pgtype.Numeric) int32 {
	if !n.Valid {
		return 0
	}
	f, err := n.Float64Value()
	if err != nil {
		return 0
	}
	return int32(math.Round(f.Float64 * 100))
}

// baniToRON converts an amount in bani (RON cents) to RON with 2 decimal places.
func baniToRON(bani int32) float64 {
	return float64(bani) / 100.0
}

// companyPrefix derives a short prefix from a company name by taking the first 3
// uppercase characters of its alphabetic content. Falls back to "INV" if the name
// yields fewer than 3 letters.
func companyPrefix(name string) string {
	cleaned := strings.Map(func(r rune) rune {
		if (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') {
			return r
		}
		return -1
	}, name)
	if len(cleaned) < 3 {
		return "INV"
	}
	return strings.ToUpper(cleaned[:3])
}
