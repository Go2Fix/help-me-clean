-- name: CreateRecurringGroup :one
INSERT INTO recurring_booking_groups (
    client_user_id, company_id, preferred_cleaner_id, address_id,
    recurrence_type, day_of_week, preferred_time, service_type,
    property_type, num_rooms, num_bathrooms, area_sqm, has_pets,
    special_instructions, hourly_rate, estimated_total_per_occurrence
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
RETURNING *;

-- name: GetRecurringGroupByID :one
SELECT * FROM recurring_booking_groups WHERE id = $1;

-- name: ListRecurringGroupsByClient :many
SELECT * FROM recurring_booking_groups
WHERE client_user_id = $1
ORDER BY created_at DESC;

-- name: ListActiveRecurringGroupsByClient :many
SELECT * FROM recurring_booking_groups
WHERE client_user_id = $1 AND is_active = TRUE
ORDER BY created_at DESC;

-- name: GetBookingsByRecurringGroup :many
SELECT * FROM bookings
WHERE recurring_group_id = $1
ORDER BY scheduled_date, scheduled_start_time;

-- name: GetUpcomingBookingsByRecurringGroup :many
SELECT * FROM bookings
WHERE recurring_group_id = $1
  AND scheduled_date >= CURRENT_DATE
  AND status NOT IN ('cancelled_by_client', 'cancelled_by_company', 'cancelled_by_admin')
ORDER BY scheduled_date, scheduled_start_time;

-- name: CancelRecurringGroup :one
UPDATE recurring_booking_groups
SET is_active = FALSE, cancelled_at = NOW(), cancellation_reason = $2, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: PauseRecurringGroup :one
UPDATE recurring_booking_groups
SET is_active = FALSE, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: ResumeRecurringGroup :one
UPDATE recurring_booking_groups
SET is_active = TRUE, cancelled_at = NULL, cancellation_reason = NULL, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: InsertRecurringGroupExtra :exec
INSERT INTO recurring_group_extras (group_id, extra_id, quantity)
VALUES ($1, $2, $3);

-- name: GetRecurringGroupExtras :many
SELECT rge.*, se.name_ro, se.name_en, se.price, se.duration_minutes
FROM recurring_group_extras rge
JOIN service_extras se ON se.id = rge.extra_id
WHERE rge.group_id = $1;

-- name: CountActiveRecurringGroups :one
SELECT COUNT(*) FROM recurring_booking_groups WHERE is_active = TRUE;

-- name: CancelFutureOccurrences :exec
UPDATE bookings
SET status = 'cancelled_by_client', cancelled_at = NOW(), cancellation_reason = $2, updated_at = NOW()
WHERE recurring_group_id = $1
  AND scheduled_date >= CURRENT_DATE
  AND status IN ('assigned', 'confirmed');
