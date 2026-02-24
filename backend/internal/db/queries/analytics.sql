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
