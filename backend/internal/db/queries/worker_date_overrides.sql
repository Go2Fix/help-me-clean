-- name: UpsertWorkerDateOverride :one
INSERT INTO worker_date_overrides (worker_id, override_date, is_available, start_time, end_time)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (worker_id, override_date)
DO UPDATE SET is_available = EXCLUDED.is_available, start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time
RETURNING *;

-- name: ListWorkerDateOverrides :many
SELECT * FROM worker_date_overrides
WHERE worker_id = $1 AND override_date >= $2 AND override_date <= $3
ORDER BY override_date;

-- name: DeleteWorkerDateOverride :exec
DELETE FROM worker_date_overrides WHERE worker_id = $1 AND override_date = $2;
