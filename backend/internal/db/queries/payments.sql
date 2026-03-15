-- ============================================
-- CLIENT PAYMENT METHODS
-- ============================================

-- name: ListPaymentMethodsByUser :many
SELECT * FROM client_payment_methods WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC;

-- name: CreatePaymentMethod :one
INSERT INTO client_payment_methods (user_id, stripe_payment_method_id, card_last_four, card_brand, is_default, card_exp_month, card_exp_year)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetPaymentMethodByID :one
SELECT * FROM client_payment_methods WHERE id = $1;

-- name: DeletePaymentMethod :exec
DELETE FROM client_payment_methods WHERE id = $1;

-- name: SetDefaultPaymentMethod :exec
UPDATE client_payment_methods SET is_default = (id = $2) WHERE user_id = $1;

-- name: GetPaymentMethodByStripeID :one
SELECT * FROM client_payment_methods WHERE stripe_payment_method_id = $1;

-- ============================================
-- BOOKING PAYMENT STATUS
-- ============================================

-- name: UpdateBookingPayment :one
UPDATE bookings SET stripe_payment_intent_id = $2, payment_status = $3, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: MarkBookingPaid :one
UPDATE bookings SET payment_status = 'paid', paid_at = NOW(), updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: MarkBookingPaidAndConfirmed :one
-- Atomically marks a booking as paid AND auto-confirms it if still assigned.
-- Idempotent: if booking is already confirmed or later, status is left unchanged.
UPDATE bookings
SET payment_status = 'paid', paid_at = NOW(),
    status = CASE WHEN status = 'assigned' THEN 'confirmed'::booking_status ELSE status END,
    updated_at = NOW()
WHERE id = $1 RETURNING *;

-- ============================================
-- STRIPE CUSTOMER
-- ============================================

-- name: GetUserStripeCustomerID :one
SELECT stripe_customer_id FROM users WHERE id = $1;

-- name: SetUserStripeCustomerID :exec
UPDATE users SET stripe_customer_id = $2, updated_at = NOW() WHERE id = $1;

-- ============================================
-- PAYMENT TRANSACTIONS
-- ============================================

-- name: CreatePaymentTransaction :one
INSERT INTO payment_transactions (
  booking_id, stripe_payment_intent_id, amount_total, amount_company,
  amount_platform_fee, currency, status
) VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetPaymentTransactionByStripePI :one
SELECT * FROM payment_transactions WHERE stripe_payment_intent_id = $1;

-- name: GetPaymentTransactionByBookingID :one
SELECT * FROM payment_transactions WHERE booking_id = $1 ORDER BY created_at DESC LIMIT 1;

-- name: UpdatePaymentTransactionStatus :one
UPDATE payment_transactions SET status = $2, stripe_charge_id = $3, updated_at = NOW()
WHERE stripe_payment_intent_id = $1 RETURNING *;

-- name: UpdatePaymentTransactionFailed :one
UPDATE payment_transactions SET status = 'failed', failure_reason = $2, updated_at = NOW()
WHERE stripe_payment_intent_id = $1 RETURNING *;

-- name: UpdatePaymentTransactionRefund :one
UPDATE payment_transactions SET status = $2, refund_amount = $3, stripe_refund_id = $4, updated_at = NOW()
WHERE stripe_payment_intent_id = $1 RETURNING *;

-- name: UpdatePaymentTransactionDisputed :one
UPDATE payment_transactions
SET status = 'disputed',
    stripe_dispute_id = $2,
    failure_reason = $3,
    updated_at = NOW()
WHERE stripe_payment_intent_id = $1
RETURNING *;

-- name: ListPaymentTransactionsByBooking :many
SELECT * FROM payment_transactions WHERE booking_id = $1 ORDER BY created_at DESC;

-- name: ListAllPaymentTransactions :many
SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: ListPaymentTransactionsByStatus :many
SELECT * FROM payment_transactions WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- ============================================
-- STRIPE CONNECT (Companies)
-- ============================================

-- name: GetCompanyStripeConnect :one
SELECT stripe_connect_account_id, stripe_connect_onboarding_complete, stripe_connect_charges_enabled, stripe_connect_payouts_enabled
FROM companies WHERE id = $1;

-- name: SetCompanyStripeConnect :exec
UPDATE companies SET
  stripe_connect_account_id = $2,
  stripe_connect_onboarding_complete = $3,
  stripe_connect_charges_enabled = $4,
  stripe_connect_payouts_enabled = $5,
  updated_at = NOW()
WHERE id = $1;

-- ============================================
-- COMPANY PAYOUTS
-- ============================================

-- name: CreateCompanyPayout :one
INSERT INTO company_payouts (company_id, amount, currency, period_from, period_to, booking_count, status)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: UpdatePayoutStatus :one
UPDATE company_payouts SET status = $2, stripe_transfer_id = $3, paid_at = CASE WHEN $2 = 'paid' THEN NOW() ELSE paid_at END, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: UpdatePayoutFailed :one
UPDATE company_payouts
SET status = 'failed',
    failure_reason = $2,
    updated_at = NOW()
WHERE stripe_payout_id = $1
RETURNING *;

-- name: UpdatePayoutStripeIDs :exec
UPDATE company_payouts
SET stripe_payout_id = $2,
    stripe_transfer_id = $3,
    status = 'processing',
    updated_at = NOW()
WHERE id = $1;

-- name: UpdatePayoutPaid :one
UPDATE company_payouts
SET status = 'paid',
    paid_at = NOW(),
    updated_at = NOW()
WHERE stripe_payout_id = $1
RETURNING *;

-- name: GetPayoutByStripePayoutID :one
SELECT * FROM company_payouts WHERE stripe_payout_id = $1;

-- name: ListAllCompaniesWithStripeConnect :many
SELECT id, stripe_connect_account_id
FROM companies
WHERE stripe_connect_account_id IS NOT NULL
  AND stripe_connect_charges_enabled = true;

-- name: ListPayoutsByCompany :many
SELECT * FROM company_payouts WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: GetPayoutByID :one
SELECT * FROM company_payouts WHERE id = $1;

-- name: ListAllPayouts :many
SELECT * FROM company_payouts ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: ListPayoutsByStatus :many
SELECT * FROM company_payouts WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: ListPayoutsByCompanyAndStatus :many
SELECT * FROM company_payouts WHERE company_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4;

-- ============================================
-- PAYOUT LINE ITEMS
-- ============================================

-- name: CreatePayoutLineItem :one
INSERT INTO payout_line_items (payout_id, payment_transaction_id, booking_id, amount_gross, amount_commission, amount_net)
VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;

-- name: ListPayoutLineItems :many
SELECT * FROM payout_line_items WHERE payout_id = $1 ORDER BY created_at;

-- ============================================
-- REFUND REQUESTS
-- ============================================

-- name: CreateRefundRequest :one
INSERT INTO refund_requests (booking_id, payment_transaction_id, requested_by_user_id, amount, reason, status)
VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;

-- name: UpdateRefundRequestStatus :one
UPDATE refund_requests SET status = $2, approved_by_user_id = $3, stripe_refund_id = $4,
  processed_at = CASE WHEN $2 IN ('processed', 'rejected') THEN NOW() ELSE processed_at END,
  updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: ListRefundRequestsByStatus :many
SELECT * FROM refund_requests WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: ListAllRefundRequests :many
SELECT * FROM refund_requests ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: GetRefundRequestByID :one
SELECT * FROM refund_requests WHERE id = $1;

-- name: GetRefundRequestByBookingID :one
SELECT * FROM refund_requests WHERE booking_id = $1 ORDER BY created_at DESC LIMIT 1;

-- name: ListRefundRequestsByUser :many
SELECT * FROM refund_requests WHERE requested_by_user_id = $1 ORDER BY created_at DESC;

-- name: SumRefundedAmountByBooking :one
SELECT COALESCE(SUM(amount), 0)::INT as total_refunded
FROM refund_requests
WHERE booking_id = $1 AND status IN ('approved', 'processed');

-- ============================================
-- PAYMENT HISTORY (Client-facing)
-- ============================================

-- name: ListPaymentHistoryByUser :many
SELECT pt.* FROM payment_transactions pt
JOIN bookings b ON b.id = pt.booking_id
WHERE b.client_user_id = $1
ORDER BY pt.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountPaymentHistoryByUser :one
SELECT COUNT(*) FROM payment_transactions pt
JOIN bookings b ON b.id = pt.booking_id
WHERE b.client_user_id = $1;

-- ============================================
-- COMPANY EARNINGS (Reporting)
-- ============================================

-- name: SumCompanyEarnings :one
SELECT
  COALESCE(SUM(pt.amount_total), 0)::BIGINT as total_gross,
  COALESCE(SUM(pt.amount_platform_fee), 0)::BIGINT as total_commission,
  COALESCE(SUM(pt.amount_company), 0)::BIGINT as total_net,
  COUNT(pt.id)::BIGINT as booking_count
FROM payment_transactions pt
JOIN bookings b ON b.id = pt.booking_id
WHERE b.company_id = $1 AND pt.status = 'succeeded'
  AND pt.created_at >= $2 AND pt.created_at <= $3;

-- name: SumCompanyUnpaidEarnings :one
SELECT COALESCE(SUM(pt.amount_company), 0)::BIGINT as total_unpaid
FROM payment_transactions pt
JOIN bookings b ON b.id = pt.booking_id
LEFT JOIN payout_line_items pli ON pli.payment_transaction_id = pt.id
WHERE b.company_id = $1
  AND pt.status = 'succeeded'
  AND pli.id IS NULL;

-- ============================================
-- PLATFORM REVENUE (Admin reporting)
-- ============================================

-- name: GetPlatformRevenueReport :one
SELECT
  COALESCE(SUM(pt.amount_total), 0)::BIGINT as total_revenue,
  COALESCE(SUM(pt.amount_platform_fee), 0)::BIGINT as total_commission,
  COUNT(DISTINCT pt.id)::BIGINT as booking_count
FROM payment_transactions pt
WHERE pt.status = 'succeeded'
  AND pt.created_at >= $1 AND pt.created_at <= $2;

-- name: GetTotalPayoutsInPeriod :one
SELECT
  COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)::BIGINT as total_paid,
  COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0)::BIGINT as total_pending
FROM company_payouts
WHERE created_at >= $1 AND created_at <= $2;

-- name: GetTotalRefundsInPeriod :one
SELECT COALESCE(SUM(amount), 0)::BIGINT as total_refunds
FROM refund_requests
WHERE status = 'processed' AND processed_at >= $1 AND processed_at <= $2;

-- ============================================
-- UNPAID TRANSACTIONS (Payout calculation)
-- ============================================

-- name: CheckTransactionInPayout :one
-- Checks if a payment transaction is already part of any payout
SELECT EXISTS(
  SELECT 1 FROM payout_line_items WHERE payment_transaction_id = $1
)::BOOLEAN as in_payout;

-- name: ListUnpaidCompanyTransactions :many
SELECT pt.* FROM payment_transactions pt
JOIN bookings b ON b.id = pt.booking_id
LEFT JOIN payout_line_items pli ON pli.payment_transaction_id = pt.id
WHERE b.company_id = $1
  AND pt.status = 'succeeded'
  AND pli.id IS NULL
  AND pt.created_at >= $2 AND pt.created_at <= $3
ORDER BY pt.created_at;
