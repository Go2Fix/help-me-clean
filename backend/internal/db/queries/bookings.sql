-- name: GetBookingByID :one
SELECT * FROM bookings WHERE id = $1;

-- name: GetBookingByReferenceCode :one
SELECT * FROM bookings WHERE reference_code = $1;

-- name: ListBookingsByClient :many
SELECT * FROM bookings WHERE client_user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: CountBookingsByClient :one
SELECT COUNT(*) FROM bookings WHERE client_user_id = $1;

-- name: CountBookingsByClientAndStatus :one
SELECT COUNT(*) FROM bookings WHERE client_user_id = $1 AND status = $2;

-- name: CountBookingsByCompany :one
SELECT COUNT(*) FROM bookings WHERE company_id = $1;

-- name: CountBookingsByCompanyAndStatus :one
SELECT COUNT(*) FROM bookings WHERE company_id = $1 AND status = $2;

-- name: ListBookingsByCompany :many
SELECT * FROM bookings WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: ListBookingsByCompanyAndStatus :many
SELECT * FROM bookings WHERE company_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4;

-- name: ListBookingsByWorker :many
SELECT * FROM bookings WHERE worker_id = $1 ORDER BY scheduled_date DESC;

-- name: ListBookingsByStatus :many
SELECT * FROM bookings WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: ListTodaysJobsByWorker :many
SELECT * FROM bookings WHERE worker_id = $1 AND scheduled_date = CURRENT_DATE ORDER BY scheduled_start_time;

-- name: CreateBooking :one
INSERT INTO bookings (
    reference_code, client_user_id, address_id, service_type, scheduled_date,
    scheduled_start_time, estimated_duration_hours, property_type, num_rooms,
    num_bathrooms, area_sqm, has_pets, special_instructions, hourly_rate, estimated_total,
    recurring_group_id, occurrence_number, platform_commission_pct, city_pricing_multiplier,
    pricing_model, category_id, custom_fields
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
RETURNING *;

-- name: UpdateBookingStatus :one
UPDATE bookings SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *;

-- name: AdminCancelBookingWithReason :one
UPDATE bookings
SET status = 'cancelled_by_admin',
    cancelled_at = NOW(),
    cancellation_reason = $2,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: CancelFutureBookingsByCompany :many
UPDATE bookings
SET status = 'cancelled_by_admin',
    cancelled_at = NOW(),
    cancellation_reason = $2,
    updated_at = NOW()
WHERE company_id = $1
  AND scheduled_date >= CURRENT_DATE
  AND status IN ('assigned', 'confirmed')
RETURNING *;

-- name: AssignWorkerToBooking :one
UPDATE bookings SET company_id = $2, worker_id = $3, status = 'assigned', updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: StartBooking :one
UPDATE bookings SET status = 'in_progress', started_at = NOW(), updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: CompleteBooking :one
UPDATE bookings SET status = 'completed', completed_at = NOW(), updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: CountBookingsByStatus :one
SELECT COUNT(*) FROM bookings WHERE status = $1;

-- name: CountAllBookings :one
SELECT COUNT(*) FROM bookings;

-- name: CountCompletedJobsByWorker :one
SELECT COUNT(*) FROM bookings WHERE worker_id = $1 AND status = 'completed';

-- name: CountThisMonthJobsByWorker :one
SELECT COUNT(*) FROM bookings
WHERE worker_id = $1
  AND scheduled_date >= date_trunc('month', CURRENT_DATE)::date
  AND status NOT IN ('cancelled_by_client', 'cancelled_by_company', 'cancelled_by_admin');

-- name: SumThisMonthEarningsByWorker :one
SELECT COALESCE(SUM(COALESCE(final_total, estimated_total)), 0)::numeric AS total
FROM bookings
WHERE worker_id = $1
  AND status = 'completed'
  AND completed_at >= date_trunc('month', CURRENT_DATE);

-- name: CancelBookingWithReason :one
UPDATE bookings SET status = $2, cancelled_at = NOW(), cancellation_reason = $3, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: ListBookingsByClientAndStatus :many
SELECT * FROM bookings WHERE client_user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4;

-- name: SetBookingFinalTotal :one
UPDATE bookings SET final_total = $2, platform_commission_amount = $3, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: SearchBookings :many
SELECT * FROM bookings WHERE
    (@query::text = '' OR reference_code ILIKE '%' || @query::text || '%')
    AND (@status_filter::text = '' OR status::text = @status_filter::text)
ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: CountSearchBookings :one
SELECT COUNT(*) FROM bookings WHERE
    (@query::text = '' OR reference_code ILIKE '%' || @query::text || '%')
    AND (@status_filter::text = '' OR status::text = @status_filter::text);

-- name: SearchBookingsWithDetails :many
SELECT b.*,
       u.full_name AS client_full_name,
       u.email AS client_email,
       c.company_name AS company_company_name,
       sd.name_ro AS service_name_ro
FROM bookings b
LEFT JOIN users u ON b.client_user_id = u.id
LEFT JOIN companies c ON b.company_id = c.id
LEFT JOIN service_definitions sd ON b.service_type = sd.service_type
WHERE
    (@query::text = '' OR b.reference_code ILIKE '%' || @query::text || '%'
     OR u.full_name ILIKE '%' || @query::text || '%'
     OR c.company_name ILIKE '%' || @query::text || '%')
    AND (@status_filter::text = '' OR b.status::text = @status_filter::text)
    AND (sqlc.narg('date_from')::date IS NULL OR b.scheduled_date >= sqlc.narg('date_from')::date)
    AND (sqlc.narg('date_to')::date IS NULL OR b.scheduled_date <= sqlc.narg('date_to')::date)
    AND (sqlc.narg('company_id')::uuid IS NULL OR b.company_id = sqlc.narg('company_id')::uuid)
    AND (sqlc.narg('service_type')::text IS NULL OR b.service_type::text = sqlc.narg('service_type')::text)
ORDER BY b.created_at DESC LIMIT $1 OFFSET $2;

-- name: CountSearchBookingsWithDetails :one
SELECT COUNT(*) FROM bookings b
LEFT JOIN users u ON b.client_user_id = u.id
LEFT JOIN companies c ON b.company_id = c.id
WHERE
    (@query::text = '' OR b.reference_code ILIKE '%' || @query::text || '%'
     OR u.full_name ILIKE '%' || @query::text || '%'
     OR c.company_name ILIKE '%' || @query::text || '%')
    AND (@status_filter::text = '' OR b.status::text = @status_filter::text)
    AND (sqlc.narg('date_from')::date IS NULL OR b.scheduled_date >= sqlc.narg('date_from')::date)
    AND (sqlc.narg('date_to')::date IS NULL OR b.scheduled_date <= sqlc.narg('date_to')::date)
    AND (sqlc.narg('company_id')::uuid IS NULL OR b.company_id = sqlc.narg('company_id')::uuid)
    AND (sqlc.narg('service_type')::text IS NULL OR b.service_type::text = sqlc.narg('service_type')::text);

-- name: ListBookingsByCompanyAndDateRange :many
SELECT * FROM bookings
WHERE company_id = $1
  AND scheduled_date >= @date_from::date
  AND scheduled_date <= @date_to::date
  AND status NOT IN ('cancelled_by_client', 'cancelled_by_company', 'cancelled_by_admin')
ORDER BY scheduled_date, scheduled_start_time;

-- name: ListBookingsByWorkerAndDateRange :many
SELECT * FROM bookings
WHERE worker_id = $1
  AND scheduled_date >= @date_from::date
  AND scheduled_date <= @date_to::date
  AND status NOT IN ('cancelled_by_client', 'cancelled_by_company', 'cancelled_by_admin')
ORDER BY scheduled_date, scheduled_start_time;

-- name: SearchCompanyBookings :many
SELECT * FROM bookings WHERE
    company_id = $1
    AND (@query::text = '' OR reference_code ILIKE '%' || @query::text || '%')
    AND (@status_filter::text = '' OR status::text = @status_filter::text OR (@status_filter::text = 'cancelled' AND status::text LIKE 'cancelled%'))
    AND (@date_from::date = '0001-01-01' OR scheduled_date >= @date_from::date)
    AND (@date_to::date = '0001-01-01' OR scheduled_date <= @date_to::date)
ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: CountSearchCompanyBookings :one
SELECT COUNT(*) FROM bookings WHERE
    company_id = $1
    AND (@query::text = '' OR reference_code ILIKE '%' || @query::text || '%')
    AND (@status_filter::text = '' OR status::text = @status_filter::text OR (@status_filter::text = 'cancelled' AND status::text LIKE 'cancelled%'))
    AND (@date_from::date = '0001-01-01' OR scheduled_date >= @date_from::date)
    AND (@date_to::date = '0001-01-01' OR scheduled_date <= @date_to::date);

-- name: SetBookingPreferredWorker :one
UPDATE bookings SET company_id = $2, worker_id = $3, status = 'confirmed', updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: SearchWorkerBookings :many
SELECT * FROM bookings WHERE
    worker_id = $1
    AND (@query::text = '' OR reference_code ILIKE '%' || @query::text || '%')
    AND (@status_filter::text = '' OR status::text = @status_filter::text OR (@status_filter::text = 'cancelled' AND status::text LIKE 'cancelled%'))
    AND (@date_from::date = '0001-01-01' OR scheduled_date >= @date_from::date)
    AND (@date_to::date = '0001-01-01' OR scheduled_date <= @date_to::date)
ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: CountSearchWorkerBookings :one
SELECT COUNT(*) FROM bookings WHERE
    worker_id = $1
    AND (@query::text = '' OR reference_code ILIKE '%' || @query::text || '%')
    AND (@status_filter::text = '' OR status::text = @status_filter::text OR (@status_filter::text = 'cancelled' AND status::text LIKE 'cancelled%'))
    AND (@date_from::date = '0001-01-01' OR scheduled_date >= @date_from::date)
    AND (@date_to::date = '0001-01-01' OR scheduled_date <= @date_to::date);

-- name: UpdateBookingSchedule :one
UPDATE bookings SET scheduled_date = $2, scheduled_start_time = $3, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: RescheduleBooking :one
UPDATE bookings
SET scheduled_date = $2, scheduled_start_time = $3,
    reschedule_count = reschedule_count + 1, rescheduled_at = NOW(), updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: InsertBookingExtra :exec
INSERT INTO booking_extras (booking_id, extra_id, price, quantity)
VALUES ($1, $2, $3, $4);

-- name: ListBookingExtras :many
SELECT be.id, be.booking_id, be.extra_id, be.price, be.quantity,
       se.name_ro, se.name_en, se.price AS extra_price, se.duration_minutes, se.icon, se.allow_multiple, se.unit_label
FROM booking_extras be
JOIN service_extras se ON se.id = be.extra_id
WHERE be.booking_id = $1;
