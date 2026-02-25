-- name: GetRevenueByDateRange :many
SELECT DATE(completed_at) AS date,
    COUNT(*)::bigint AS booking_count,
    COALESCE(SUM(COALESCE(final_total, estimated_total)), 0)::numeric AS revenue,
    COALESCE(SUM(COALESCE(platform_commission_amount, 0)), 0)::numeric AS commission
FROM bookings
WHERE status = 'completed' AND completed_at >= $1 AND completed_at <= $2
GROUP BY DATE(completed_at) ORDER BY date;

-- name: GetRevenueByServiceType :many
SELECT service_type,
    COUNT(*)::bigint AS booking_count,
    COALESCE(SUM(COALESCE(final_total, estimated_total)), 0)::numeric AS revenue
FROM bookings
WHERE status = 'completed' AND completed_at >= $1 AND completed_at <= $2
GROUP BY service_type ORDER BY revenue DESC;

-- name: GetTopCompaniesByRevenue :many
SELECT c.id, c.company_name,
    COUNT(b.id)::bigint AS booking_count,
    COALESCE(SUM(COALESCE(b.final_total, b.estimated_total)), 0)::numeric AS revenue,
    COALESCE(SUM(COALESCE(b.platform_commission_amount, 0)), 0)::numeric AS commission
FROM bookings b JOIN companies c ON b.company_id = c.id
WHERE b.status = 'completed' AND b.completed_at >= $1 AND b.completed_at <= $2
GROUP BY c.id, c.company_name ORDER BY revenue DESC LIMIT $3;

-- name: GetCompanyRevenueByDateRange :many
SELECT DATE(completed_at) AS date,
    COUNT(*)::bigint AS booking_count,
    COALESCE(SUM(COALESCE(final_total, estimated_total)), 0)::numeric AS revenue,
    COALESCE(SUM(COALESCE(platform_commission_amount, 0)), 0)::numeric AS commission
FROM bookings
WHERE company_id = $1 AND status = 'completed' AND completed_at >= $2 AND completed_at <= $3
GROUP BY DATE(completed_at) ORDER BY date;

-- name: GetWorkerEarningsByDateRange :many
SELECT DATE(completed_at) AS date,
    COALESCE(SUM(COALESCE(final_total, estimated_total)), 0)::numeric AS amount
FROM bookings
WHERE worker_id = $1 AND status = 'completed' AND completed_at >= $2 AND completed_at <= $3
GROUP BY DATE(completed_at) ORDER BY date;

-- name: GetPlatformTotals :one
SELECT
    COUNT(*) FILTER (WHERE status = 'completed')::bigint AS total_completed,
    COUNT(*)::bigint AS total_bookings,
    COALESCE(SUM(COALESCE(final_total, estimated_total)) FILTER (WHERE status = 'completed'), 0)::numeric AS total_revenue,
    COALESCE(SUM(platform_commission_amount) FILTER (WHERE status = 'completed'), 0)::numeric AS total_commission,
    COUNT(DISTINCT client_user_id)::bigint AS unique_clients,
    COUNT(DISTINCT company_id) FILTER (WHERE company_id IS NOT NULL)::bigint AS active_companies
FROM bookings;

-- name: GetBookingDemandHeatmap :many
SELECT
  EXTRACT(DOW FROM scheduled_date)::int AS day_of_week,
  CAST(SPLIT_PART(scheduled_start_time, ':', 1) AS int) AS hour,
  COUNT(*)::bigint AS booking_count
FROM bookings
WHERE scheduled_date >= @date_from::date AND scheduled_date <= @date_to::date
GROUP BY day_of_week, hour
ORDER BY day_of_week, hour;

-- name: GetAllCompanyScorecards :many
SELECT c.id, c.company_name, c.status::text AS company_status,
  COUNT(b.id) FILTER (WHERE b.status = 'completed')::bigint AS completed_count,
  COUNT(b.id) FILTER (WHERE b.status::text LIKE 'cancelled%')::bigint AS cancelled_count,
  COUNT(b.id)::bigint AS total_count,
  COALESCE(SUM(COALESCE(b.final_total, b.estimated_total)) FILTER (WHERE b.status = 'completed'), 0)::numeric AS total_revenue
FROM companies c
LEFT JOIN bookings b ON b.company_id = c.id
WHERE c.status = 'approved'
GROUP BY c.id, c.company_name, c.status
ORDER BY total_revenue DESC
LIMIT $1 OFFSET $2;

-- name: GetCompanyAvgRating :one
SELECT COALESCE(AVG(r.rating), 0)::numeric AS avg_rating, COUNT(r.id)::bigint AS review_count
FROM reviews r JOIN workers w ON r.reviewed_worker_id = w.id
WHERE w.company_id = $1;
