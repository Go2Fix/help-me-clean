// Package invoice implements invoice generation, Oblio.eu API integration,
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
	"os"
	"strings"
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

// Service handles invoice generation, storage, and Oblio.eu API integration.
type Service struct {
	queries           *db.Queries
	oblioClientID     string
	oblioClientSecret string
	oblioCIF          string
	oblioSeriesName   string
	httpClient        *http.Client
	oblioToken        string
	oblioTokenExpiry  time.Time
	platformConfig    PlatformConfig
	vatRatePct        int // cached VAT rate; 0 means not yet loaded
}

// NewService creates a new invoice service, reading configuration from environment variables.
func NewService(queries *db.Queries) *Service {
	seriesName := os.Getenv("OBLIO_SERIES_NAME")
	if seriesName == "" {
		seriesName = "FCT"
	}

	svc := &Service{
		queries:           queries,
		oblioClientID:     os.Getenv("OBLIO_CLIENT_ID"),
		oblioClientSecret: os.Getenv("OBLIO_CLIENT_SECRET"),
		oblioCIF:          os.Getenv("OBLIO_CIF"),
		oblioSeriesName:   seriesName,
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

// oblioGetToken returns a valid OAuth2 Bearer token for the Oblio.eu API,
// refreshing it automatically when it is about to expire.
func (s *Service) oblioGetToken(ctx context.Context) (string, error) {
	if s.oblioClientID == "" || s.oblioClientSecret == "" {
		return "", errors.New("invoice: OBLIO_CLIENT_ID or OBLIO_CLIENT_SECRET not configured")
	}
	// Return cached token if still valid (with 60-second safety margin).
	if s.oblioToken != "" && time.Now().Before(s.oblioTokenExpiry.Add(-60*time.Second)) {
		return s.oblioToken, nil
	}

	form := "client_id=" + s.oblioClientID + "&client_secret=" + s.oblioClientSecret
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://www.oblio.eu/api/authorize/token",
		strings.NewReader(form),
	)
	if err != nil {
		return "", fmt.Errorf("invoice: build oblio token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("invoice: oblio token request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("invoice: read oblio token response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("invoice: oblio token endpoint returned %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   string `json:"expires_in"`
		TokenType   string `json:"token_type"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", fmt.Errorf("invoice: parse oblio token response: %w", err)
	}
	if tokenResp.AccessToken == "" {
		return "", errors.New("invoice: oblio returned empty access_token")
	}

	var expiresInSec int64 = 3600
	if _, parseErr := fmt.Sscanf(tokenResp.ExpiresIn, "%d", &expiresInSec); parseErr != nil || expiresInSec <= 0 {
		expiresInSec = 3600
	}

	s.oblioToken = tokenResp.AccessToken
	s.oblioTokenExpiry = time.Now().Add(time.Duration(expiresInSec) * time.Second)
	return s.oblioToken, nil
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

	// Build a prefix from the company name (first 3 uppercase characters).
	prefix := companyPrefix(company.CompanyName)
	invoiceNumber, err := s.NewInvoiceNumber(ctx, company.ID, prefix)
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: generate number: %w", err)
	}

	// Attempt to load the client's billing profile for B2B details.
	billingProfile, profileErr := s.queries.GetBillingProfileByUser(ctx, clientUserID)

	// Resolve buyer info: prefer billing profile, fall back to user record.
	buyerName, buyerCUI, buyerRegNumber, buyerAddress, buyerCity, buyerCounty, buyerIsVATPayer, buyerEmail :=
		s.resolveBuyerInfo(ctx, clientUserID, billingProfile, profileErr)

	dueDate := pgtype.Date{Time: time.Now().AddDate(0, 0, 30), Valid: true}

	inv, err := s.queries.CreateInvoice(ctx, db.CreateInvoiceParams{
		InvoiceType:          db.InvoiceTypeClientService,
		InvoiceNumber:        pgText(invoiceNumber),
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

	// Sync to Oblio.eu (best-effort for MVP; do not fail the whole operation).
	lineItems, _ := s.queries.ListInvoiceLineItems(ctx, inv.ID)
	oblioSeries, oblioNum, oblioURL, apiErr := s.createInvoiceOnOblio(ctx, inv, lineItems)
	if apiErr != nil {
		log.Printf("invoice: oblio.eu API error (non-fatal): %v", apiErr)
	} else if oblioNum != "" {
		updateErr := s.queries.UpdateInvoiceOblio(ctx, db.UpdateInvoiceOblioParams{
			ID:               inv.ID,
			OblioSeriesName:  pgText(oblioSeries),
			OblioNumber:      pgText(oblioNum),
			OblioDownloadUrl: pgText(oblioURL),
		})
		if updateErr != nil {
			log.Printf("invoice: failed to persist oblio metadata: %v", updateErr)
		} else {
			inv.OblioSeriesName = pgText(oblioSeries)
			inv.OblioNumber = pgText(oblioNum)
			inv.OblioDownloadUrl = pgText(oblioURL)
		}
	}

	// Auto-transmit to e-factura (best-effort, non-blocking).
	if inv.OblioNumber.Valid && inv.OblioNumber.String != "" {
		go func() {
			bgCtx := context.Background()
			if transmitErr := s.TransmitToEFactura(bgCtx, inv.ID); transmitErr != nil {
				log.Printf("invoice: auto e-factura transmission failed (non-fatal): %v", transmitErr)
			} else {
				log.Printf("invoice: auto-transmitted invoice %s to e-factura", invoiceNumber)
			}
		}()
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

	invoiceNumber, err := s.NewInvoiceNumber(ctx, pgtype.UUID{}, "G2F")
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: generate number: %w", err)
	}

	dueDate := pgtype.Date{Time: time.Now().AddDate(0, 0, 30), Valid: true}

	// Load platform config from database
	pc, err := s.loadPlatformConfig(ctx)
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: load platform config: %w", err)
	}

	inv, err := s.queries.CreateInvoice(ctx, db.CreateInvoiceParams{
		InvoiceType:          db.InvoiceTypePlatformCommission,
		InvoiceNumber:        pgText(invoiceNumber),
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

	// Sync to Oblio.eu (best-effort).
	lineItems, _ := s.queries.ListInvoiceLineItems(ctx, inv.ID)
	oblioSeries, oblioNum, oblioURL, apiErr := s.createInvoiceOnOblio(ctx, inv, lineItems)
	if apiErr != nil {
		log.Printf("invoice: oblio.eu API error for commission invoice (non-fatal): %v", apiErr)
	} else if oblioNum != "" {
		updateErr := s.queries.UpdateInvoiceOblio(ctx, db.UpdateInvoiceOblioParams{
			ID:               inv.ID,
			OblioSeriesName:  pgText(oblioSeries),
			OblioNumber:      pgText(oblioNum),
			OblioDownloadUrl: pgText(oblioURL),
		})
		if updateErr != nil {
			log.Printf("invoice: failed to persist oblio metadata: %v", updateErr)
		} else {
			inv.OblioSeriesName = pgText(oblioSeries)
			inv.OblioNumber = pgText(oblioNum)
			inv.OblioDownloadUrl = pgText(oblioURL)
		}
	}

	// Auto-transmit to e-factura (best-effort, non-blocking).
	if inv.OblioNumber.Valid && inv.OblioNumber.String != "" {
		go func() {
			bgCtx := context.Background()
			if transmitErr := s.TransmitToEFactura(bgCtx, inv.ID); transmitErr != nil {
				log.Printf("invoice: auto e-factura transmission failed (non-fatal): %v", transmitErr)
			} else {
				log.Printf("invoice: auto-transmitted commission invoice %s to e-factura", invoiceNumber)
			}
		}()
	}

	log.Printf("invoice: created commission invoice %s for company %s", invoiceNumber, company.CompanyName)
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

	// Build invoice number with company-derived prefix.
	prefix := companyPrefix(company.CompanyName)
	invoiceNumber, err := s.NewInvoiceNumber(ctx, company.ID, prefix)
	if err != nil {
		return fmt.Errorf("invoice: generate number for subscription: %w", err)
	}

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

	inv, err := s.queries.CreateInvoice(ctx, db.CreateInvoiceParams{
		InvoiceType:          db.InvoiceTypeSubscriptionMonthly,
		InvoiceNumber:        pgText(invoiceNumber),
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

	// Sync to Oblio.eu (best-effort for MVP; do not fail the whole operation).
	lineItems, _ := s.queries.ListInvoiceLineItems(ctx, inv.ID)
	oblioSeries, oblioNum, oblioURL, apiErr := s.createInvoiceOnOblio(ctx, inv, lineItems)
	if apiErr != nil {
		log.Printf("invoice: oblio.eu API error for subscription invoice (non-fatal): %v", apiErr)
	} else if oblioNum != "" {
		updateErr := s.queries.UpdateInvoiceOblio(ctx, db.UpdateInvoiceOblioParams{
			ID:               inv.ID,
			OblioSeriesName:  pgText(oblioSeries),
			OblioNumber:      pgText(oblioNum),
			OblioDownloadUrl: pgText(oblioURL),
		})
		if updateErr != nil {
			log.Printf("invoice: failed to persist oblio metadata for subscription invoice: %v", updateErr)
		} else {
			inv.OblioSeriesName = pgText(oblioSeries)
			inv.OblioNumber = pgText(oblioNum)
			inv.OblioDownloadUrl = pgText(oblioURL)
		}
	}

	// Auto-transmit to e-factura (best-effort, non-blocking).
	if inv.OblioNumber.Valid && inv.OblioNumber.String != "" {
		go func() {
			bgCtx := context.Background()
			if transmitErr := s.TransmitToEFactura(bgCtx, inv.ID); transmitErr != nil {
				log.Printf("invoice: auto e-factura transmission failed for subscription invoice (non-fatal): %v", transmitErr)
			} else {
				log.Printf("invoice: auto-transmitted subscription invoice %s to e-factura", invoiceNumber)
			}
		}()
	}

	log.Printf("invoice: created subscription monthly invoice %s for subscription %s, amount=%d bani",
		invoiceNumber, uuidToString(sub.ID), totalBani)
	return nil
}

// CancelInvoice marks an invoice as cancelled, both locally and on Oblio.eu.
func (s *Service) CancelInvoice(ctx context.Context, invoiceID pgtype.UUID) (db.Invoice, error) {
	inv, err := s.queries.GetInvoiceByID(ctx, invoiceID)
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: get invoice for cancellation: %w", err)
	}

	if inv.Status == db.InvoiceStatusCancelled {
		return inv, nil
	}

	// Cancel on Oblio.eu if the invoice was synced.
	if inv.OblioNumber.Valid && inv.OblioNumber.String != "" {
		cancelPayload := map[string]string{
			"cif":        s.oblioCIF,
			"seriesName": textVal(inv.OblioSeriesName),
			"number":     inv.OblioNumber.String,
		}
		_, apiErr := s.callOblioAPI(ctx, http.MethodPut, "/docs/invoice/cancel", cancelPayload)
		if apiErr != nil {
			log.Printf("invoice: oblio.eu cancel error (non-fatal): %v", apiErr)
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

// TransmitToEFactura triggers e-factura transmission via the Oblio.eu API.
func (s *Service) TransmitToEFactura(ctx context.Context, invoiceID pgtype.UUID) error {
	inv, err := s.queries.GetInvoiceByID(ctx, invoiceID)
	if err != nil {
		return fmt.Errorf("invoice: get invoice for e-factura: %w", err)
	}

	if !inv.OblioNumber.Valid || inv.OblioNumber.String == "" {
		return errors.New("invoice: cannot transmit to e-factura: invoice not synced to oblio.eu")
	}

	eInvPayload := map[string]string{
		"cif":        s.oblioCIF,
		"seriesName": textVal(inv.OblioSeriesName),
		"number":     inv.OblioNumber.String,
	}

	respBody, err := s.callOblioAPI(ctx, http.MethodPost, "/docs/einvoice", eInvPayload)
	if err != nil {
		return fmt.Errorf("invoice: e-factura transmission via oblio: %w", err)
	}

	var efResp oblioEInvoiceResponse
	if jsonErr := json.Unmarshal(respBody, &efResp); jsonErr != nil {
		log.Printf("invoice: failed to parse oblio e-factura response: %v", jsonErr)
	}

	efStatus := oblioCodeToStatus(efResp.Data.Code)
	efIndex := efResp.Data.Text
	if efResp.Data.Code == -1 {
		log.Printf("invoice: oblio e-factura returned error code -1: %s", efResp.Data.Text)
	}

	err = s.queries.UpdateInvoiceEFactura(ctx, db.UpdateInvoiceEFacturaParams{
		ID:             invoiceID,
		EfacturaStatus: pgText(efStatus),
		EfacturaIndex:  pgText(efIndex),
	})
	if err != nil {
		return fmt.Errorf("invoice: update e-factura status: %w", err)
	}

	log.Printf("invoice: transmitted invoice %s to e-factura (index: %s)", textVal(inv.InvoiceNumber), efIndex)
	return nil
}

// CheckEFacturaStatus polls Oblio.eu for the current e-factura status
// of an invoice and updates the local database accordingly.
func (s *Service) CheckEFacturaStatus(ctx context.Context, invoiceID pgtype.UUID) (db.Invoice, error) {
	inv, err := s.queries.GetInvoiceByID(ctx, invoiceID)
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: get invoice: %w", err)
	}

	if !inv.OblioNumber.Valid || inv.OblioNumber.String == "" {
		return db.Invoice{}, errors.New("invoice: no oblio.eu number to check e-factura status for")
	}

	path := fmt.Sprintf("/docs/einvoice?cif=%s&seriesName=%s&number=%s",
		s.oblioCIF, textVal(inv.OblioSeriesName), inv.OblioNumber.String)

	respBody, err := s.callOblioAPI(ctx, http.MethodGet, path, nil)
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: check e-factura status via oblio: %w", err)
	}

	var statusResp oblioEInvoiceResponse
	if jsonErr := json.Unmarshal(respBody, &statusResp); jsonErr != nil {
		return db.Invoice{}, fmt.Errorf("invoice: parse oblio status response: %w", jsonErr)
	}

	newStatus := oblioCodeToStatus(statusResp.Data.Code)
	updateErr := s.queries.UpdateInvoiceEFactura(ctx, db.UpdateInvoiceEFacturaParams{
		ID:             invoiceID,
		EfacturaStatus: pgText(newStatus),
		EfacturaIndex:  pgText(statusResp.Data.Text),
	})
	if updateErr != nil {
		return db.Invoice{}, fmt.Errorf("invoice: update e-factura status: %w", updateErr)
	}

	// Re-read to return updated record.
	updated, err := s.queries.GetInvoiceByID(ctx, invoiceID)
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: re-read invoice: %w", err)
	}

	log.Printf("invoice: checked e-factura status for %s: %s", textVal(inv.InvoiceNumber), newStatus)
	return updated, nil
}

// GenerateCreditNote creates a credit note (storno) referencing an original invoice.
// The amount parameter is in bani and represents the credited total (VAT-inclusive).
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

	log.Printf("invoice: created credit note %s for original invoice %s", invoiceNumber, textVal(original.InvoiceNumber))
	return creditNote, nil
}

// ---------------------------------------------------------------------------
// Oblio.eu API helpers
// ---------------------------------------------------------------------------

// callOblioAPI performs an authenticated HTTP request to the Oblio.eu REST API.
// body must be JSON-serialisable or nil (for GET/DELETE without a body).
func (s *Service) callOblioAPI(ctx context.Context, method, path string, body interface{}) ([]byte, error) {
	token, err := s.oblioGetToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("invoice: oblio auth: %w", err)
	}

	var reqBody io.Reader
	if body != nil {
		jsonBytes, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("invoice: marshal oblio request body: %w", err)
		}
		reqBody = bytes.NewReader(jsonBytes)
	}

	req, err := http.NewRequestWithContext(ctx, method, "https://www.oblio.eu/api"+path, reqBody)
	if err != nil {
		return nil, fmt.Errorf("invoice: create oblio HTTP request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("invoice: oblio HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("invoice: read oblio response body: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("invoice: oblio API returned %d: %s", resp.StatusCode, string(respBody))
		return respBody, fmt.Errorf("invoice: oblio returned status %d", resp.StatusCode)
	}

	return respBody, nil
}

// oblioInvoiceRequest is the JSON payload for POST /docs/invoice.
type oblioInvoiceRequest struct {
	CIF        string         `json:"cif"`
	SeriesName string         `json:"seriesName"`
	Client     oblioClient    `json:"client"`
	IssueDate  string         `json:"issueDate"`
	DueDate    string         `json:"dueDate"`
	Currency   string         `json:"currency"`
	Language   string         `json:"language"`
	Products   []oblioProduct `json:"products"`
}

type oblioClient struct {
	Name     string `json:"name"`
	CIF      string `json:"cif,omitempty"`
	RC       string `json:"rc,omitempty"`
	Address  string `json:"address,omitempty"`
	State    string `json:"state,omitempty"`
	City     string `json:"city,omitempty"`
	VATpayer int    `json:"vatPayer"`
}

type oblioProduct struct {
	Name          string  `json:"name"`
	MeasuringUnit string  `json:"measuringUnit"`
	Quantity      float64 `json:"quantity"`
	Price         float64 `json:"price"`
	VATPercentage float64 `json:"vatPercentage"`
	VATIncluded   int     `json:"vatIncluded"`
}

// oblioInvoiceResponse is the standard Oblio API response envelope for invoice creation.
type oblioInvoiceResponse struct {
	Status        int    `json:"status"`
	StatusMessage string `json:"statusMessage"`
	Data          struct {
		SeriesName string `json:"seriesName"`
		Number     string `json:"number"`
		Link       string `json:"link"`
	} `json:"data"`
}

// oblioEInvoiceResponse is the response for e-invoice endpoints (POST/GET /docs/einvoice).
type oblioEInvoiceResponse struct {
	Status        int    `json:"status"`
	StatusMessage string `json:"statusMessage"`
	Data          struct {
		Text string `json:"text"`
		Sent bool   `json:"sent"`
		// Code: -1=error, 0=pending/processing, 1=uploaded, 2=accepted by SPV
		Code int `json:"code"`
	} `json:"data"`
}

// createInvoiceOnOblio syncs a local invoice to Oblio.eu and returns the
// (seriesName, number, downloadURL) assigned by Oblio.
func (s *Service) createInvoiceOnOblio(ctx context.Context, inv db.Invoice, lineItems []db.InvoiceLineItem) (string, string, string, error) {
	if s.oblioClientID == "" {
		return "", "", "", nil // Not configured; skip silently.
	}

	vatRate := float64(s.loadVATRate(ctx))

	products := make([]oblioProduct, 0, len(lineItems))
	for _, li := range lineItems {
		products = append(products, oblioProduct{
			Name:          li.DescriptionRo,
			MeasuringUnit: "buc",
			Quantity:      numericToFloat64(li.Quantity),
			Price:         baniToRON(li.UnitPrice), // net price in RON
			VATPercentage: vatRate,
			VATIncluded:   0, // price is net; Oblio calculates VAT on top
		})
	}

	// Fallback: single synthetic line item when no line items are present.
	if len(products) == 0 {
		products = append(products, oblioProduct{
			Name:          "Servicii curatenie",
			MeasuringUnit: "buc",
			Quantity:      1,
			Price:         baniToRON(inv.SubtotalAmount),
			VATPercentage: vatRate,
			VATIncluded:   0,
		})
	}

	vatPayer := 0
	if inv.BuyerIsVatPayer.Valid && inv.BuyerIsVatPayer.Bool {
		vatPayer = 1
	}

	issueDate := time.Now().Format("2006-01-02")
	dueDate := time.Now().AddDate(0, 0, 30).Format("2006-01-02")

	payload := oblioInvoiceRequest{
		CIF:        s.oblioCIF,
		SeriesName: s.oblioSeriesName,
		Client: oblioClient{
			Name:     inv.BuyerName,
			CIF:      textVal(inv.BuyerCui),
			RC:       textVal(inv.BuyerRegNumber),
			Address:  textVal(inv.BuyerAddress),
			State:    textVal(inv.BuyerCounty),
			City:     textVal(inv.BuyerCity),
			VATpayer: vatPayer,
		},
		IssueDate: issueDate,
		DueDate:   dueDate,
		Currency:  inv.Currency,
		Language:  "RO",
		Products:  products,
	}

	respBody, err := s.callOblioAPI(ctx, http.MethodPost, "/docs/invoice", payload)
	if err != nil {
		return "", "", "", fmt.Errorf("create invoice on oblio.eu: %w", err)
	}

	var apiResp oblioInvoiceResponse
	if jsonErr := json.Unmarshal(respBody, &apiResp); jsonErr != nil {
		return "", "", "", fmt.Errorf("parse oblio invoice response: %w", jsonErr)
	}
	if apiResp.Status != 200 {
		return "", "", "", fmt.Errorf("oblio invoice error: %s", apiResp.StatusMessage)
	}

	return apiResp.Data.SeriesName, apiResp.Data.Number, apiResp.Data.Link, nil
}

// oblioCodeToStatus converts the Oblio e-invoice status code to a string status.
// Code: -1=error, 0=pending, 1=uploaded, 2=accepted by SPV.
func oblioCodeToStatus(code int) string {
	switch code {
	case 2:
		return "transmitted"
	case 1:
		return "uploaded"
	case 0:
		return "pending"
	default:
		return "error"
	}
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
