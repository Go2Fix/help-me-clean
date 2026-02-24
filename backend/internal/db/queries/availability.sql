-- name: ListWorkerAvailability :many
SELECT * FROM worker_availability WHERE worker_id = $1 ORDER BY day_of_week, start_time;

-- name: SetWorkerAvailability :one
INSERT INTO worker_availability (worker_id, day_of_week, start_time, end_time, is_available)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: DeleteWorkerAvailability :exec
DELETE FROM worker_availability WHERE worker_id = $1;
