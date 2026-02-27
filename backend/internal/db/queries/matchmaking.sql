-- name: FindMatchingWorkers :many
SELECT DISTINCT c.id, c.user_id, u.full_name, u.avatar_url, c.rating_avg, c.total_jobs_completed,
       co.company_name, co.id AS company_id
FROM workers c
JOIN users u ON c.user_id = u.id
JOIN companies co ON c.company_id = co.id
JOIN company_service_areas csa ON csa.company_id = co.id AND csa.city_area_id = $1
JOIN worker_service_areas wsa ON wsa.worker_id = c.id AND wsa.city_area_id = $1
WHERE c.status = 'active'
  AND co.status = 'approved'
ORDER BY c.rating_avg DESC, c.total_jobs_completed DESC;

-- name: ListWorkerBookingsForDate :many
SELECT id, scheduled_start_time, estimated_duration_hours
FROM bookings
WHERE worker_id = $1
  AND scheduled_date = $2
  AND status NOT IN ('cancelled_by_client', 'cancelled_by_company', 'cancelled_by_admin')
ORDER BY scheduled_start_time;

-- name: CountWorkerBookingsInDateRange :one
SELECT COUNT(*) FROM bookings
WHERE worker_id = $1
  AND scheduled_date >= $2
  AND scheduled_date <= $3
  AND status NOT IN ('cancelled_by_client', 'cancelled_by_company', 'cancelled_by_admin');

-- name: FindMatchingWorkersByCategory :many
-- Area + category filtering: only returns workers (and their companies) qualified for the given category.
SELECT DISTINCT c.id, c.user_id, u.full_name, u.avatar_url, c.rating_avg, c.total_jobs_completed,
       co.company_name, co.id AS company_id
FROM workers c
JOIN users u ON c.user_id = u.id
JOIN companies co ON c.company_id = co.id
JOIN company_service_areas csa ON csa.company_id = co.id AND csa.city_area_id = @area_id
JOIN worker_service_areas wsa ON wsa.worker_id = c.id AND wsa.city_area_id = @area_id
JOIN company_service_categories ccsc ON ccsc.company_id = co.id AND ccsc.category_id = @category_id
JOIN worker_service_categories wcsc ON wcsc.worker_id = c.id AND wcsc.category_id = @category_id
WHERE c.status = 'active'
  AND co.status = 'approved'
ORDER BY c.rating_avg DESC, c.total_jobs_completed DESC;

-- name: FindAvailableWorkersByCategory :many
-- Area + category + no-conflict filtering for worker replacement.
SELECT w.id, w.user_id, w.company_id, w.rating_avg
FROM workers w
JOIN worker_service_areas wsa ON wsa.worker_id = w.id AND wsa.city_area_id = @cat_area_id
JOIN companies co ON w.company_id = co.id AND co.status = 'approved'
JOIN worker_service_categories wcsc ON wcsc.worker_id = w.id AND wcsc.category_id = @cat_category_id
JOIN company_service_categories ccsc ON ccsc.company_id = co.id AND ccsc.category_id = @cat_category_id
WHERE w.status = 'active'
  AND w.id != @cat_exclude_worker_id
  AND w.id NOT IN (
    SELECT DISTINCT b.worker_id FROM bookings b
    WHERE b.scheduled_date = @cat_target_date
      AND b.worker_id IS NOT NULL
      AND b.status NOT IN ('cancelled_by_client', 'cancelled_by_company', 'cancelled_by_admin')
  )
ORDER BY (CASE WHEN w.company_id = @cat_preferred_company_id THEN 0 ELSE 1 END), w.rating_avg DESC
LIMIT 5;

-- name: FindAvailableWorkersForDateAndArea :many
-- Finds workers in an area who have no conflicting bookings on a specific date.
-- Orders by same-company first (matching $4), then by rating.
SELECT w.id, w.user_id, w.company_id, w.rating_avg
FROM workers w
JOIN worker_service_areas wsa ON wsa.worker_id = w.id AND wsa.city_area_id = @area_id
JOIN companies co ON w.company_id = co.id AND co.status = 'approved'
WHERE w.status = 'active'
  AND w.id != @exclude_worker_id
  AND w.id NOT IN (
    SELECT DISTINCT b.worker_id FROM bookings b
    WHERE b.scheduled_date = @target_date
      AND b.worker_id IS NOT NULL
      AND b.status NOT IN ('cancelled_by_client', 'cancelled_by_company', 'cancelled_by_admin')
  )
ORDER BY (CASE WHEN w.company_id = @preferred_company_id THEN 0 ELSE 1 END), w.rating_avg DESC
LIMIT 5;

-- name: GetWorkerDailyJobLocations :many
-- Returns scheduled bookings for a worker on a date with best-available coordinates.
-- Priority: client_address lat/lng → booking's city_area centroid → zero (sentinel for no location).
SELECT
    b.id,
    b.scheduled_start_time,
    b.estimated_duration_hours,
    COALESCE(a.latitude,  ca.latitude,  0.0) AS lat,
    COALESCE(a.longitude, ca.longitude, 0.0) AS lng,
    (a.latitude IS NOT NULL OR ca.latitude IS NOT NULL) AS has_location
FROM bookings b
JOIN client_addresses a  ON b.address_id   = a.id
LEFT JOIN city_areas  ca ON b.city_area_id = ca.id
WHERE b.worker_id      = $1
  AND b.scheduled_date = $2
  AND b.status NOT IN ('cancelled_by_client', 'cancelled_by_company', 'cancelled_by_admin')
ORDER BY b.scheduled_start_time;

-- name: GetCityAreaCoordinates :one
-- Returns the centroid coordinates for a city area (set during migration seed or by admin).
SELECT latitude, longitude FROM city_areas WHERE id = $1;

-- name: GetClientWorkerHistory :one
-- Returns how many completed jobs a worker has done for a specific client, and the avg rating.
SELECT
    COUNT(b.id)::INT                              AS total_jobs,
    COALESCE(AVG(r.rating), 0.0)::DOUBLE PRECISION AS avg_rating
FROM bookings b
LEFT JOIN reviews r ON r.booking_id = b.id AND r.reviewed_worker_id = b.worker_id
WHERE b.client_user_id = $1
  AND b.worker_id      = $2
  AND b.status         = 'completed';

-- name: GetWorkerSubRatings :one
-- Per-dimension rating averages for a worker (from reviews with sub-ratings since migration 000047).
SELECT
    COALESCE(AVG(rating_punctuality),   0.0)::DOUBLE PRECISION AS avg_punctuality,
    COALESCE(AVG(rating_quality),       0.0)::DOUBLE PRECISION AS avg_quality,
    COALESCE(AVG(rating_communication), 0.0)::DOUBLE PRECISION AS avg_communication,
    COALESCE(AVG(rating_value),         0.0)::DOUBLE PRECISION AS avg_value,
    COUNT(*) FILTER (WHERE rating_punctuality IS NOT NULL)::INT  AS rated_count
FROM reviews
WHERE reviewed_worker_id = $1 AND status = 'published';
