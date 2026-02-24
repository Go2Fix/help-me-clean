-- name: GetWorkerByID :one
SELECT * FROM workers WHERE id = $1;

-- name: GetWorkerByUserID :one
SELECT * FROM workers WHERE user_id = $1;

-- name: GetWorkerByInviteToken :one
SELECT * FROM workers WHERE invite_token = $1;

-- name: ListWorkersByCompany :many
SELECT * FROM workers WHERE company_id = $1 ORDER BY created_at DESC;

-- name: CreateWorkerUser :one
INSERT INTO users (email, full_name, phone, role, status, created_at, updated_at)
VALUES ($1, $2, $3, 'worker'::user_role, $4, NOW(), NOW())
RETURNING *;

-- name: CreateWorkerProfile :one
INSERT INTO workers (user_id, company_id, status, is_company_admin, invite_token, invite_expires_at)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListAllActiveWorkers :many
SELECT
    c.id,
    c.user_id,
    c.company_id,
    c.status,
    c.is_company_admin,
    c.invite_token,
    c.invite_expires_at,
    c.bio,
    c.rating_avg,
    c.total_jobs_completed,
    c.created_at,
    c.updated_at
FROM workers c
JOIN users u ON c.user_id = u.id
WHERE c.status = 'active'
ORDER BY u.full_name ASC;

-- name: UpdateWorkerStatus :one
UPDATE workers SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *;

-- name: LinkWorkerToUser :one
UPDATE workers SET user_id = $2, status = 'pending_review', updated_at = NOW() WHERE id = $1 RETURNING *;

-- name: ActivateWorkerStatus :one
UPDATE workers SET status = 'active', updated_at = NOW() WHERE id = $1 RETURNING *;

-- name: UpdateWorkerBio :one
UPDATE workers SET
    bio = $2,
    updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: UpdateWorkerUserPhone :exec
UPDATE users
SET phone = $2, updated_at = NOW()
WHERE id = (SELECT user_id FROM workers WHERE workers.id = $1);

-- name: GetWorkerPerformanceStats :one
SELECT
    c.id,
    u.full_name,
    COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_worker_id = c.id), 0)::DECIMAL(3,2) AS rating_avg,
    COUNT(b.id) FILTER (WHERE b.status = 'completed')::bigint AS total_completed_jobs,
    COUNT(b.id) FILTER (WHERE b.status = 'completed' AND b.completed_at >= date_trunc('month', CURRENT_DATE))::bigint AS this_month_completed,
    COALESCE(SUM(COALESCE(b.final_total, b.estimated_total)) FILTER (WHERE b.status = 'completed'), 0)::numeric AS total_earnings,
    COALESCE(SUM(COALESCE(b.final_total, b.estimated_total)) FILTER (WHERE b.status = 'completed' AND b.completed_at >= date_trunc('month', CURRENT_DATE)), 0)::numeric AS this_month_earnings
FROM workers c
JOIN users u ON c.user_id = u.id
LEFT JOIN bookings b ON b.worker_id = c.id
WHERE c.id = $1
GROUP BY c.id, u.full_name;

-- DEPRECATED: Avatar now stored in users table (see users.sql UpdateUserAvatar)
-- -- name: UpdateWorkerAvatar :one
-- UPDATE workers SET avatar_url = $2, updated_at = NOW() WHERE id = $1 RETURNING *;
