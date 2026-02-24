-- ─── RECURRING DISCOUNTS ──────────────────────────────────────────────────

-- name: ListRecurringDiscounts :many
SELECT * FROM recurring_discounts ORDER BY recurrence_type;

-- name: ListActiveRecurringDiscounts :many
SELECT * FROM recurring_discounts WHERE is_active = TRUE ORDER BY recurrence_type;

-- name: GetRecurringDiscountByType :one
SELECT * FROM recurring_discounts WHERE recurrence_type = $1;

-- name: UpdateRecurringDiscount :one
UPDATE recurring_discounts
SET discount_pct = $2, updated_at = NOW()
WHERE recurrence_type = $1
RETURNING *;

-- ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────

-- name: CreateSubscription :one
INSERT INTO subscriptions (
    client_user_id, company_id, worker_id, address_id,
    recurrence_type, day_of_week, preferred_time, service_type,
    property_type, num_rooms, num_bathrooms, area_sqm, has_pets,
    special_instructions, hourly_rate, estimated_duration_hours,
    per_session_original, discount_pct, per_session_discounted,
    sessions_per_month, monthly_amount, monthly_amount_bani,
    platform_commission_pct, stripe_subscription_id, stripe_price_id,
    stripe_product_id, status, current_period_start, current_period_end
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
    $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,
    $28, $29
) RETURNING *;

-- name: GetSubscriptionByID :one
SELECT * FROM subscriptions WHERE id = $1;

-- name: GetSubscriptionByStripeID :one
SELECT * FROM subscriptions WHERE stripe_subscription_id = $1;

-- name: ListSubscriptionsByClient :many
SELECT * FROM subscriptions WHERE client_user_id = $1 ORDER BY created_at DESC;

-- name: ListActiveSubscriptionsByClient :many
SELECT * FROM subscriptions
WHERE client_user_id = $1 AND status IN ('active', 'paused', 'past_due')
ORDER BY created_at DESC;

-- name: ListSubscriptionsByCompany :many
SELECT * FROM subscriptions WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: CountSubscriptionsByCompany :one
SELECT COUNT(*) FROM subscriptions WHERE company_id = $1;

-- name: ListSubscriptionsByWorker :many
SELECT * FROM subscriptions
WHERE worker_id = $1 AND status IN ('active', 'paused')
ORDER BY created_at DESC;

-- name: ListAllSubscriptions :many
SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: ListSubscriptionsByStatus :many
SELECT * FROM subscriptions WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: CountAllSubscriptions :one
SELECT COUNT(*) FROM subscriptions;

-- name: CountSubscriptionsByStatusFilter :one
SELECT COUNT(*) FROM subscriptions WHERE status = $1;

-- name: UpdateSubscriptionStatus :one
UPDATE subscriptions SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *;

-- name: UpdateSubscriptionPeriod :one
UPDATE subscriptions
SET current_period_start = $2, current_period_end = $3, status = $4, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: PauseSubscription :one
UPDATE subscriptions SET status = 'paused', paused_at = NOW(), updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: ResumeSubscription :one
UPDATE subscriptions SET status = 'active', paused_at = NULL, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: CancelSubscription :one
UPDATE subscriptions
SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = $2, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: UpdateSubscriptionStripeIDs :one
UPDATE subscriptions
SET stripe_subscription_id = $2, stripe_price_id = $3, stripe_product_id = $4, status = $5, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: UpdateSubscriptionWorker :one
UPDATE subscriptions SET worker_id = $2, updated_at = NOW() WHERE id = $1 RETURNING *;

-- name: RequestSubscriptionWorkerChange :one
UPDATE subscriptions
SET worker_change_requested_at = NOW(), worker_change_reason = $2, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: ResolveSubscriptionWorkerChange :one
UPDATE subscriptions
SET worker_id = $2, company_id = $3,
    worker_change_requested_at = NULL, worker_change_reason = NULL,
    updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: ReassignFutureSubscriptionBookings :exec
UPDATE bookings
SET worker_id = @new_worker_id, updated_at = NOW()
WHERE subscription_id = @subscription_id
  AND scheduled_date > CURRENT_DATE
  AND status IN ('assigned', 'confirmed');

-- name: ReassignSingleBookingWorker :one
UPDATE bookings
SET worker_id = $2, updated_at = NOW()
WHERE id = $1
  AND status IN ('assigned', 'confirmed')
RETURNING *;

-- ─── SUBSCRIPTION EXTRAS ──────────────────────────────────────────────────

-- name: InsertSubscriptionExtra :exec
INSERT INTO subscription_extras (subscription_id, extra_id, quantity) VALUES ($1, $2, $3);

-- name: GetSubscriptionExtras :many
SELECT se.id, se.subscription_id, se.extra_id, se.quantity,
       sext.name_ro, sext.name_en, sext.price, sext.duration_minutes
FROM subscription_extras se
JOIN service_extras sext ON sext.id = se.extra_id
WHERE se.subscription_id = $1;

-- ─── SUBSCRIPTION BOOKINGS ───────────────────────────────────────────────

-- name: GetBookingsBySubscription :many
SELECT * FROM bookings WHERE subscription_id = $1 ORDER BY scheduled_date, scheduled_start_time;

-- name: GetUpcomingBookingsBySubscription :many
SELECT * FROM bookings
WHERE subscription_id = $1
  AND scheduled_date >= CURRENT_DATE
  AND status NOT IN ('cancelled_by_client', 'cancelled_by_company', 'cancelled_by_admin')
ORDER BY scheduled_date, scheduled_start_time;

-- name: CountBookingsBySubscription :one
SELECT COUNT(*) FROM bookings WHERE subscription_id = $1;

-- name: CountCompletedBookingsBySubscription :one
SELECT COUNT(*) FROM bookings WHERE subscription_id = $1 AND status = 'completed';

-- name: CancelFutureSubscriptionBookings :exec
UPDATE bookings
SET status = 'cancelled_by_client', cancelled_at = NOW(), cancellation_reason = $2, updated_at = NOW()
WHERE subscription_id = $1
  AND scheduled_date >= CURRENT_DATE
  AND status IN ('assigned', 'confirmed');

-- ─── STATS ────────────────────────────────────────────────────────────────

-- name: GetSubscriptionStats :one
SELECT
    COUNT(*) FILTER (WHERE status = 'active') as active_count,
    COUNT(*) FILTER (WHERE status = 'paused') as paused_count,
    COUNT(*) FILTER (WHERE status = 'past_due') as past_due_count,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
    COALESCE(SUM(monthly_amount_bani) FILTER (WHERE status = 'active'), 0)::BIGINT as monthly_recurring_revenue_bani
FROM subscriptions;
