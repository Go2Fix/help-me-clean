-- name: CreateJobPhoto :one
INSERT INTO booking_job_photos (booking_id, uploaded_by, photo_url, phase, sort_order)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListJobPhotosByBooking :many
SELECT * FROM booking_job_photos WHERE booking_id = $1 ORDER BY phase, sort_order;

-- name: DeleteJobPhoto :exec
DELETE FROM booking_job_photos WHERE id = $1;

-- name: GetJobPhoto :one
SELECT * FROM booking_job_photos WHERE id = $1;
