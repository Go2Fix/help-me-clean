-- name: GetPlatformStats :one
SELECT
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM companies WHERE status = 'approved') AS active_companies,
    (SELECT COUNT(*) FROM workers WHERE status = 'active') AS active_workers,
    (SELECT COUNT(*) FROM bookings) AS total_bookings,
    (SELECT COUNT(*) FROM bookings WHERE status = 'completed') AS completed_bookings,
    (SELECT COALESCE(SUM(COALESCE(final_total, estimated_total)), 0) FROM bookings WHERE status = 'completed') AS total_revenue,
    (SELECT COALESCE(SUM(platform_commission_amount), 0) FROM bookings WHERE status = 'completed') AS total_commission,
    (SELECT COUNT(*) FROM bookings WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) AS bookings_this_month,
    (SELECT COALESCE(SUM(COALESCE(final_total, estimated_total)), 0) FROM bookings WHERE status = 'completed' AND completed_at >= DATE_TRUNC('month', CURRENT_DATE)) AS revenue_this_month,
    (SELECT COALESCE(SUM(platform_commission_amount), 0) FROM bookings WHERE status = 'completed' AND completed_at >= DATE_TRUNC('month', CURRENT_DATE)) AS commission_this_month,
    (SELECT COUNT(*) FROM users WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) AS new_clients_this_month,
    (SELECT COUNT(*) FROM companies WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) AS new_companies_this_month,
    (SELECT COALESCE(AVG(rating), 0) FROM reviews) AS average_rating;

-- name: GetBookingCountByStatus :many
SELECT status, COUNT(*) AS count FROM bookings GROUP BY status;

-- name: GetRevenueByMonth :many
SELECT
    TO_CHAR(DATE_TRUNC('month', completed_at), 'YYYY-MM') AS month,
    COALESCE(SUM(COALESCE(final_total, estimated_total)), 0)::bigint AS total_revenue,
    COALESCE(SUM(COALESCE(platform_commission_amount, 0)), 0)::bigint AS commission_revenue,
    COUNT(*) AS booking_count
FROM bookings
WHERE status = 'completed' AND completed_at IS NOT NULL
GROUP BY TO_CHAR(DATE_TRUNC('month', completed_at), 'YYYY-MM')
ORDER BY month DESC
LIMIT $1;

-- name: GetCompanyPerformance :many
SELECT
    c.id, c.company_name, c.rating_avg, c.total_jobs_completed,
    COUNT(b.id) AS active_bookings
FROM companies c
LEFT JOIN bookings b ON c.id = b.company_id AND b.status IN ('assigned', 'confirmed', 'in_progress')
WHERE c.status = 'approved'
GROUP BY c.id
ORDER BY c.total_jobs_completed DESC
LIMIT $1 OFFSET $2;

-- name: ListAllBookings :many
SELECT * FROM bookings ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: CreatePlatformEvent :exec
INSERT INTO platform_events (event_type, entity_type, entity_id, metadata) VALUES ($1, $2, $3, $4);
