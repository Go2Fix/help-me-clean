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
