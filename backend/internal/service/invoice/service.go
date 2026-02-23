// Package invoice implements invoice generation, Factureaza.ro API integration,
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

// vatRatePct is the standard Romanian VAT rate (21%).
const vatRatePct = 21

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

// Service handles invoice generation, storage, and Factureaza.ro API integration.
type Service struct {
	queries        *db.Queries
	apiBaseURL     string
	apiKey         string
	httpClient     *http.Client
	platformConfig PlatformConfig
}

// NewService creates a new invoice service, reading configuration from environment variables.
func NewService(queries *db.Queries) *Service {
	apiBaseURL := os.Getenv("FACTUREAZA_API_URL")
	if apiBaseURL == "" {
		apiBaseURL = "https://sandbox.factureaza.ro/api/v1"
	}
	// Ensure the base URL does not have a trailing slash.
	apiBaseURL = strings.TrimRight(apiBaseURL, "/")

	svc := &Service{
		queries:        queries,
		apiBaseURL:     apiBaseURL,
		apiKey:         os.Getenv("FACTUREAZA_API_KEY"),
		httpClient:     &http.Client{Timeout: 30 * time.Second},
		platformConfig: PlatformConfig{}, // Will be loaded from DB on first use
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

// Ping is a health-check method for the invoice service.
func (s *Service) Ping(ctx context.Context) string {
	return "invoice service: ok"
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// NewInvoiceNumber generates the next sequential invoice number for a given company
// and prefix. The format is "{prefix}-{year}-{number:04d}", for example "HMC-2026-0001".
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

	// Treat booking total as VAT-inclusive (21%): net = total * 100 / 121, vat = total - net.
	subtotalNet := totalBani * 100 / 121
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
		VatRate:              numericFromInt(vatRatePct),
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
		VatRate:          numericFromInt(vatRatePct),
		VatAmount:        vatAmount,
		LineTotal:        subtotalNet,
		LineTotalWithVat: totalBani,
		SortOrder:        pgtype.Int4{Int32: 1, Valid: true},
	})
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: create line item: %w", err)
	}

	// Sync to Factureaza.ro (best-effort for MVP; do not fail the whole operation).
	lineItems, _ := s.queries.ListInvoiceLineItems(ctx, inv.ID)
	factureazaID, downloadURL, apiErr := s.createInvoiceOnFactureaza(ctx, inv, lineItems)
	if apiErr != nil {
		log.Printf("invoice: factureaza.ro API error (non-fatal): %v", apiErr)
	} else if factureazaID != "" {
		updateErr := s.queries.UpdateInvoiceFactureaza(ctx, db.UpdateInvoiceFactureazaParams{
			ID:                    inv.ID,
			FactureazaID:          pgText(factureazaID),
			FactureazaDownloadUrl: pgText(downloadURL),
		})
		if updateErr != nil {
			log.Printf("invoice: failed to persist factureaza metadata: %v", updateErr)
		} else {
			inv.FactureazaID = pgText(factureazaID)
			inv.FactureazaDownloadUrl = pgText(downloadURL)
		}
	}

	// Auto-transmit to e-factura (best-effort, non-blocking).
	if inv.FactureazaID.Valid && inv.FactureazaID.String != "" {
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
	subtotalNet := amount
	vatAmount := subtotalNet * vatRatePct / 100
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
		VatRate:              numericFromInt(vatRatePct),
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
		VatRate:          numericFromInt(vatRatePct),
		VatAmount:        vatAmount,
		LineTotal:        subtotalNet,
		LineTotalWithVat: totalAmount,
		SortOrder:        pgtype.Int4{Int32: 1, Valid: true},
	})
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: create commission line item: %w", err)
	}

	// Sync to Factureaza.ro (best-effort).
	lineItems, _ := s.queries.ListInvoiceLineItems(ctx, inv.ID)
	factureazaID, downloadURL, apiErr := s.createInvoiceOnFactureaza(ctx, inv, lineItems)
	if apiErr != nil {
		log.Printf("invoice: factureaza.ro API error (non-fatal): %v", apiErr)
	} else if factureazaID != "" {
		updateErr := s.queries.UpdateInvoiceFactureaza(ctx, db.UpdateInvoiceFactureazaParams{
			ID:                    inv.ID,
			FactureazaID:          pgText(factureazaID),
			FactureazaDownloadUrl: pgText(downloadURL),
		})
		if updateErr != nil {
			log.Printf("invoice: failed to persist factureaza metadata: %v", updateErr)
		} else {
			inv.FactureazaID = pgText(factureazaID)
			inv.FactureazaDownloadUrl = pgText(downloadURL)
		}
	}

	// Auto-transmit to e-factura (best-effort, non-blocking).
	if inv.FactureazaID.Valid && inv.FactureazaID.String != "" {
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

// CancelInvoice marks an invoice as cancelled, both locally and on Factureaza.ro.
func (s *Service) CancelInvoice(ctx context.Context, invoiceID pgtype.UUID) (db.Invoice, error) {
	inv, err := s.queries.GetInvoiceByID(ctx, invoiceID)
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: get invoice for cancellation: %w", err)
	}

	if inv.Status == db.InvoiceStatusCancelled {
		return inv, nil
	}

	// Cancel on Factureaza.ro if the invoice was synced.
	if inv.FactureazaID.Valid && inv.FactureazaID.String != "" {
		_, apiErr := s.callFactureazaAPI(ctx, http.MethodDelete, "/invoices/"+inv.FactureazaID.String+".json", nil)
		if apiErr != nil {
			log.Printf("invoice: factureaza.ro cancel error (non-fatal): %v", apiErr)
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

// TransmitToEFactura triggers e-factura transmission via the Factureaza.ro API.
func (s *Service) TransmitToEFactura(ctx context.Context, invoiceID pgtype.UUID) error {
	inv, err := s.queries.GetInvoiceByID(ctx, invoiceID)
	if err != nil {
		return fmt.Errorf("invoice: get invoice for e-factura: %w", err)
	}

	if !inv.FactureazaID.Valid || inv.FactureazaID.String == "" {
		return errors.New("invoice: cannot transmit to e-factura without a factureaza.ro ID")
	}

	respBody, err := s.callFactureazaAPI(ctx, http.MethodPost, "/invoices/"+inv.FactureazaID.String+"/efactura.json", nil)
	if err != nil {
		return fmt.Errorf("invoice: e-factura transmission: %w", err)
	}

	// Parse the response to extract the e-factura index.
	var efResp efacturaResponse
	if jsonErr := json.Unmarshal(respBody, &efResp); jsonErr != nil {
		log.Printf("invoice: failed to parse e-factura response: %v", jsonErr)
	}

	efStatus := "transmitted"
	efIndex := efResp.EfacturaIndex
	if efResp.Error != "" {
		efStatus = "error"
		log.Printf("invoice: e-factura API returned error: %s", efResp.Error)
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

// CheckEFacturaStatus polls Factureaza.ro for the current e-factura status
// of an invoice and updates the local database accordingly.
func (s *Service) CheckEFacturaStatus(ctx context.Context, invoiceID pgtype.UUID) (db.Invoice, error) {
	inv, err := s.queries.GetInvoiceByID(ctx, invoiceID)
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: get invoice: %w", err)
	}

	if !inv.FactureazaID.Valid || inv.FactureazaID.String == "" {
		return db.Invoice{}, errors.New("invoice: no factureaza.ro ID to check status for")
	}

	respBody, err := s.callFactureazaAPI(ctx, http.MethodGet, "/invoices/"+inv.FactureazaID.String+".json", nil)
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: check e-factura status: %w", err)
	}

	var statusResp struct {
		EfacturaStatus string `json:"efactura_status"`
		EfacturaIndex  string `json:"efactura_index"`
	}
	if jsonErr := json.Unmarshal(respBody, &statusResp); jsonErr != nil {
		return db.Invoice{}, fmt.Errorf("invoice: parse status response: %w", jsonErr)
	}

	if statusResp.EfacturaStatus != "" {
		updateErr := s.queries.UpdateInvoiceEFactura(ctx, db.UpdateInvoiceEFacturaParams{
			ID:             invoiceID,
			EfacturaStatus: pgText(statusResp.EfacturaStatus),
			EfacturaIndex:  pgText(statusResp.EfacturaIndex),
		})
		if updateErr != nil {
			return db.Invoice{}, fmt.Errorf("invoice: update e-factura status: %w", updateErr)
		}
	}

	// Re-read to return updated record.
	updated, err := s.queries.GetInvoiceByID(ctx, invoiceID)
	if err != nil {
		return db.Invoice{}, fmt.Errorf("invoice: re-read invoice: %w", err)
	}

	log.Printf("invoice: checked e-factura status for %s: %s", textVal(inv.InvoiceNumber), statusResp.EfacturaStatus)
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
	creditTotal := amount
	creditNet := creditTotal * 100 / 121
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
		VatRate:              numericFromInt(vatRatePct),
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
		VatRate:          numericFromInt(vatRatePct),
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
// Factureaza.ro API helpers
// ---------------------------------------------------------------------------

// callFactureazaAPI performs an authenticated HTTP request to the Factureaza.ro API.
func (s *Service) callFactureazaAPI(ctx context.Context, method string, path string, body interface{}) ([]byte, error) {
	if s.apiKey == "" {
		return nil, errors.New("invoice: FACTUREAZA_API_KEY is not configured")
	}

	url := s.apiBaseURL + path + "?api_key=" + s.apiKey

	var reqBody io.Reader
	if body != nil {
		jsonBytes, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("invoice: marshal request body: %w", err)
		}
		reqBody = bytes.NewReader(jsonBytes)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("invoice: create HTTP request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("invoice: HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("invoice: read response body: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("invoice: factureaza.ro API returned %d: %s", resp.StatusCode, string(respBody))
		return respBody, fmt.Errorf("invoice: factureaza.ro returned status %d", resp.StatusCode)
	}

	return respBody, nil
}

// factureazaInvoiceRequest represents the JSON payload for creating an invoice
// on Factureaza.ro.
type factureazaInvoiceRequest struct {
	Invoice factureazaInvoiceBody `json:"invoice"`
}

type factureazaInvoiceBody struct {
	ClientName      string                  `json:"client_name"`
	ClientCUI       string                  `json:"client_cui,omitempty"`
	ClientAddress   string                  `json:"client_address,omitempty"`
	ClientCity      string                  `json:"client_city,omitempty"`
	ClientCounty    string                  `json:"client_county,omitempty"`
	Currency        string                  `json:"currency"`
	DocumentDate    string                  `json:"document_date"`
	DueDays         int                     `json:"due_days,omitempty"`
	UpperAnnotation string                  `json:"upper_annotation,omitempty"`
	Positions       []factureazaInvoiceItem `json:"document_positions"`
}

type factureazaInvoiceItem struct {
	Description string  `json:"description"`
	Unit        string  `json:"unit"`
	UnitCount   float64 `json:"unit_count"`
	Price       float64 `json:"price"`
	VAT         int     `json:"vat"`
}

// factureazaInvoiceResponse represents the JSON response from Factureaza.ro
// after creating an invoice.
type factureazaInvoiceResponse struct {
	ID          string `json:"id"`
	DownloadURL string `json:"download_url"`
	Error       string `json:"error,omitempty"`
}

// efacturaResponse represents the JSON response from the e-factura endpoint.
type efacturaResponse struct {
	EfacturaIndex string `json:"efactura_index"`
	Error         string `json:"error,omitempty"`
}

// createInvoiceOnFactureaza syncs an invoice and its line items to Factureaza.ro.
// Returns the Factureaza ID and download URL on success.
func (s *Service) createInvoiceOnFactureaza(ctx context.Context, inv db.Invoice, lineItems []db.InvoiceLineItem) (string, string, error) {
	if s.apiKey == "" {
		return "", "", nil // No API key configured; skip silently.
	}

	positions := make([]factureazaInvoiceItem, 0, len(lineItems))
	for _, li := range lineItems {
		positions = append(positions, factureazaInvoiceItem{
			Description: li.DescriptionRo,
			Unit:        "buc",
			UnitCount:   numericToFloat64(li.Quantity),
			Price:       baniToRON(li.UnitPrice),
			VAT:         vatRatePct,
		})
	}

	// If no line items were provided (edge case), build a single item from the invoice totals.
	if len(positions) == 0 {
		positions = append(positions, factureazaInvoiceItem{
			Description: "Servicii curatenie",
			Unit:        "buc",
			UnitCount:   1,
			Price:       baniToRON(inv.SubtotalAmount),
			VAT:         vatRatePct,
		})
	}

	reqPayload := factureazaInvoiceRequest{
		Invoice: factureazaInvoiceBody{
			ClientName:      inv.BuyerName,
			ClientCUI:       textVal(inv.BuyerCui),
			ClientAddress:   textVal(inv.BuyerAddress),
			ClientCity:      textVal(inv.BuyerCity),
			ClientCounty:    textVal(inv.BuyerCounty),
			Currency:        inv.Currency,
			DocumentDate:    time.Now().Format("2006-01-02"),
			DueDays:         30,
			UpperAnnotation: textVal(inv.Notes),
			Positions:       positions,
		},
	}

	respBody, err := s.callFactureazaAPI(ctx, http.MethodPost, "/invoices.json", reqPayload)
	if err != nil {
		return "", "", fmt.Errorf("create invoice on factureaza.ro: %w", err)
	}

	var apiResp factureazaInvoiceResponse
	if jsonErr := json.Unmarshal(respBody, &apiResp); jsonErr != nil {
		return "", "", fmt.Errorf("parse factureaza.ro response: %w", jsonErr)
	}

	if apiResp.Error != "" {
		return "", "", fmt.Errorf("factureaza.ro error: %s", apiResp.Error)
	}

	return apiResp.ID, apiResp.DownloadURL, nil
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
