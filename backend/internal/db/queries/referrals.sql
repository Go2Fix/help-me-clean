-- ============================================================
-- Referral Codes
-- ============================================================

-- name: GetReferralCodeByOwner :one
SELECT * FROM referral_codes WHERE owner_user_id = $1;

-- name: GetReferralCodeByID :one
SELECT * FROM referral_codes WHERE id = $1;

-- name: GetReferralCodeByCode :one
SELECT * FROM referral_codes WHERE code = $1;

-- name: CreateReferralCode :one
INSERT INTO referral_codes (owner_user_id, code)
VALUES ($1, $2)
RETURNING *;

-- name: IncrementReferralCycle :one
UPDATE referral_codes
SET current_cycle = current_cycle + 1
WHERE id = $1
RETURNING *;

-- ============================================================
-- Referral Signups
-- ============================================================

-- name: CreateReferralSignup :one
INSERT INTO referral_signups (referral_code_id, referred_user_id, cycle_number)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetReferralSignupByReferredUser :one
SELECT * FROM referral_signups WHERE referred_user_id = $1;

-- name: MarkReferralSignupCompleted :one
UPDATE referral_signups
SET first_booking_completed_at = NOW(),
    qualifying_booking_id = $2
WHERE referred_user_id = $1
  AND first_booking_completed_at IS NULL
RETURNING *;

-- name: CountCompletedSignupsInCycle :one
SELECT COUNT(*)
FROM referral_signups
WHERE referral_code_id = $1
  AND cycle_number = $2
  AND first_booking_completed_at IS NOT NULL;

-- name: CountSignupsInCycle :one
SELECT COUNT(*)
FROM referral_signups
WHERE referral_code_id = $1
  AND cycle_number = $2;

-- name: GetReferralSignupsForCode :many
SELECT * FROM referral_signups
WHERE referral_code_id = $1
ORDER BY joined_at DESC;

-- ============================================================
-- Referral Earned Discounts
-- ============================================================

-- name: CreateReferralEarnedDiscount :one
INSERT INTO referral_earned_discounts (referral_code_id, owner_user_id, cycle_number, expires_at)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetAvailableReferralDiscount :one
SELECT * FROM referral_earned_discounts
WHERE owner_user_id = $1
  AND status = 'available'
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY earned_at ASC
LIMIT 1;

-- name: CountAvailableReferralDiscounts :one
SELECT COUNT(*) FROM referral_earned_discounts
WHERE owner_user_id = $1
  AND status = 'available'
  AND (expires_at IS NULL OR expires_at > NOW());

-- name: ReserveReferralDiscount :one
UPDATE referral_earned_discounts
SET status = 'reserved',
    applied_to_booking_id = $2
WHERE id = $1
  AND status = 'available'
RETURNING *;

-- name: ConfirmReferralDiscountUsed :one
UPDATE referral_earned_discounts
SET status = 'applied',
    applied_at = NOW()
WHERE id = $1
  AND status = 'reserved'
RETURNING *;

-- name: ReleaseReferralDiscount :one
UPDATE referral_earned_discounts
SET status = 'available',
    applied_to_booking_id = NULL
WHERE id = $1
  AND status = 'reserved'
RETURNING *;

-- name: GetReferralEarnedDiscountByID :one
SELECT * FROM referral_earned_discounts WHERE id = $1;

-- name: ListReferralEarnedDiscountsByOwner :many
SELECT * FROM referral_earned_discounts
WHERE owner_user_id = $1
ORDER BY earned_at DESC;
