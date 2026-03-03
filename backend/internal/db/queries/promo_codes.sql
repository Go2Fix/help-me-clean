-- name: CreatePromoCode :one
INSERT INTO promo_codes (code, description, discount_type, discount_value, min_order_amount, max_uses, max_uses_per_user, active_from, active_until, is_active, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetPromoCodeByCode :one
SELECT * FROM promo_codes WHERE UPPER(code) = UPPER($1);

-- name: GetPromoCodeByID :one
SELECT * FROM promo_codes WHERE id = $1;

-- name: ListPromoCodes :many
SELECT * FROM promo_codes ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: UpdatePromoCode :one
UPDATE promo_codes
SET description = $2, discount_type = $3, discount_value = $4, min_order_amount = $5,
    max_uses = $6, max_uses_per_user = $7, active_from = $8, active_until = $9,
    is_active = $10, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: IncrementPromoCodeUses :one
UPDATE promo_codes SET uses_count = uses_count + 1, updated_at = NOW() WHERE id = $1 RETURNING *;

-- name: CreatePromoCodeUse :one
INSERT INTO promo_code_uses (promo_code_id, user_id, booking_id, discount_amount)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: CountPromoCodeUsesByUser :one
SELECT COUNT(*) FROM promo_code_uses WHERE promo_code_id = $1 AND user_id = $2;

-- name: GetPromoCodeUseByBooking :one
SELECT * FROM promo_code_uses WHERE booking_id = $1 LIMIT 1;

-- name: ApplyPromoCodeToBooking :one
UPDATE bookings SET promo_code_id = $2, promo_discount_amount = $3, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: CountAllPromoCodes :one
SELECT COUNT(*) FROM promo_codes;
