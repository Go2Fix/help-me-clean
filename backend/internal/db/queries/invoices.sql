-- ============================================
-- CLIENT BILLING PROFILES
-- ============================================

-- name: GetBillingProfileByUser :one
SELECT * FROM client_billing_profiles WHERE user_id = $1 AND is_default = TRUE LIMIT 1;

-- name: CreateBillingProfile :one
INSERT INTO client_billing_profiles (
  user_id, is_company, company_name, cui, reg_number, address, city, county, is_vat_payer, bank_name, iban, is_default
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE)
RETURNING *;

-- name: UpdateBillingProfile :one
UPDATE client_billing_profiles SET
  is_company = $2, company_name = $3, cui = $4, reg_number = $5,
  address = $6, city = $7, county = $8, is_vat_payer = $9,
  bank_name = $10, iban = $11, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteBillingProfile :exec
DELETE FROM client_billing_profiles WHERE id = $1;

-- ============================================
-- INVOICES
-- ============================================

-- name: CreateInvoice :one
INSERT INTO invoices (
  invoice_type, invoice_number,
  seller_company_name, seller_cui, seller_reg_number, seller_address, seller_city, seller_county,
  seller_is_vat_payer, seller_bank_name, seller_iban,
  buyer_name, buyer_cui, buyer_reg_number, buyer_address, buyer_city, buyer_county,
  buyer_is_vat_payer, buyer_email,
  subtotal_amount, vat_rate, vat_amount, total_amount, currency,
  booking_id, payment_transaction_id, company_id, client_user_id,
  status, due_date, notes
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
  $12, $13, $14, $15, $16, $17, $18, $19,
  $20, $21, $22, $23, $24,
  $25, $26, $27, $28,
  $29, $30, $31
)
RETURNING *;

-- name: GetInvoiceByID :one
SELECT * FROM invoices WHERE id = $1;

-- name: GetInvoiceByBookingAndType :one
SELECT * FROM invoices WHERE booking_id = $1 AND invoice_type = $2 ORDER BY created_at DESC LIMIT 1;

-- name: UpdateInvoiceStatus :one
UPDATE invoices SET status = $2, issued_at = CASE WHEN $2 = 'issued' THEN NOW() ELSE issued_at END, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: UpdateInvoiceFactureaza :exec
UPDATE invoices SET factureaza_id = $2, factureaza_download_url = $3, updated_at = NOW()
WHERE id = $1;

-- name: UpdateInvoiceEFactura :exec
UPDATE invoices SET efactura_status = $2, efactura_index = $3, updated_at = NOW()
WHERE id = $1;

-- ============================================
-- INVOICE LISTING (Client)
-- ============================================

-- name: ListInvoicesByClient :many
SELECT * FROM invoices WHERE client_user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: CountInvoicesByClient :one
SELECT COUNT(*) FROM invoices WHERE client_user_id = $1;

-- ============================================
-- INVOICE LISTING (Company)
-- ============================================

-- name: ListInvoicesByCompany :many
SELECT * FROM invoices WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: CountInvoicesByCompany :one
SELECT COUNT(*) FROM invoices WHERE company_id = $1;

-- name: ListInvoicesByCompanyAndStatus :many
SELECT * FROM invoices WHERE company_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4;

-- name: ListInvoicesByCompanyID :many
SELECT * FROM invoices WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: ListReceivedInvoicesByCompany :many
-- Lists platform commission invoices where the company is the buyer
SELECT * FROM invoices WHERE company_id = $1 AND invoice_type = 'platform_commission' ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: CountReceivedInvoicesByCompany :one
SELECT COUNT(*) FROM invoices WHERE company_id = $1 AND invoice_type = 'platform_commission';

-- name: GetCommissionInvoiceByPeriod :one
-- Check for existing commission invoice to prevent duplicates
SELECT * FROM invoices
WHERE company_id = $1 AND invoice_type = 'platform_commission'
  AND notes LIKE '%' || $2 || '%' AND notes LIKE '%' || $3 || '%'
ORDER BY created_at DESC LIMIT 1;

-- ============================================
-- INVOICE LISTING (Admin)
-- ============================================

-- name: ListAllInvoices :many
SELECT * FROM invoices ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: ListInvoicesByType :many
SELECT * FROM invoices WHERE invoice_type = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: ListInvoicesByTypeAndStatus :many
SELECT * FROM invoices WHERE invoice_type = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4;

-- ============================================
-- INVOICE LINE ITEMS
-- ============================================

-- name: CreateInvoiceLineItem :one
INSERT INTO invoice_line_items (
  invoice_id, description_ro, description_en, quantity, unit_price,
  vat_rate, vat_amount, line_total, line_total_with_vat, sort_order
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: ListInvoiceLineItems :many
SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY sort_order;

-- ============================================
-- INVOICE SEQUENCES
-- ============================================

-- name: GetNextInvoiceNumber :one
UPDATE invoice_sequences SET current_number = current_number + 1
WHERE company_id IS NOT DISTINCT FROM $1 AND prefix = $2 AND year = $3
RETURNING current_number;

-- name: CreateInvoiceSequence :exec
INSERT INTO invoice_sequences (company_id, prefix, year, current_number)
VALUES ($1, $2, $3, 0)
ON CONFLICT (company_id, prefix, year) DO NOTHING;

-- ============================================
-- INVOICE ANALYTICS (Admin reporting)
-- ============================================

-- name: GetInvoiceAnalytics :one
SELECT
  COUNT(*)::BIGINT as total_issued,
  COALESCE(SUM(total_amount), 0)::BIGINT as total_amount,
  COALESCE(SUM(vat_amount), 0)::BIGINT as total_vat
FROM invoices
WHERE created_at >= $1 AND created_at <= $2;

-- name: GetInvoiceCountByStatus :many
SELECT status, COUNT(*)::BIGINT as count, COALESCE(SUM(total_amount), 0)::BIGINT as total_amount
FROM invoices
WHERE created_at >= $1 AND created_at <= $2
GROUP BY status;

-- name: GetInvoiceCountByType :many
SELECT invoice_type, COUNT(*)::BIGINT as count, COALESCE(SUM(total_amount), 0)::BIGINT as total_amount
FROM invoices
WHERE created_at >= $1 AND created_at <= $2
GROUP BY invoice_type;
