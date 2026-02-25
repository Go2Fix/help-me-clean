-- name: CreateReview :one
INSERT INTO reviews (
  booking_id, reviewer_user_id, reviewed_user_id, reviewed_worker_id,
  rating, rating_punctuality, rating_quality, rating_communication, rating_value,
  comment, review_type, status
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'published')
RETURNING *;

-- name: GetReviewByBookingID :one
SELECT * FROM reviews WHERE booking_id = $1;

-- name: ListReviewsByWorkerID :many
SELECT * FROM reviews WHERE reviewed_worker_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: GetAverageWorkerRating :one
SELECT COALESCE(AVG(rating), 0)::DECIMAL(3,2) AS avg_rating FROM reviews WHERE reviewed_worker_id = $1;

-- name: ListAllReviews :many
SELECT * FROM reviews ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: ListAllReviewsFiltered :many
SELECT * FROM reviews
WHERE (sqlc.narg('rating')::int IS NULL OR rating = sqlc.narg('rating'))
  AND (sqlc.narg('review_type')::text IS NULL OR review_type = sqlc.narg('review_type'))
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: DeleteReview :exec
DELETE FROM reviews WHERE id = $1;

-- name: CountAllReviews :one
SELECT COUNT(*) FROM reviews;

-- name: CountAllReviewsFiltered :one
SELECT COUNT(*) FROM reviews
WHERE (sqlc.narg('rating')::int IS NULL OR rating = sqlc.narg('rating'))
  AND (sqlc.narg('review_type')::text IS NULL OR review_type = sqlc.narg('review_type'));

-- name: CountReviewsByWorkerID :one
SELECT COUNT(*) FROM reviews WHERE reviewed_worker_id = $1;

-- name: ListReviewsByCompanyWorkers :many
SELECT r.* FROM reviews r
JOIN workers w ON r.reviewed_worker_id = w.id
WHERE w.company_id = $1
  AND (sqlc.narg('rating')::int IS NULL OR r.rating = sqlc.narg('rating'))
ORDER BY r.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountReviewsByCompanyWorkers :one
SELECT COUNT(*) FROM reviews r
JOIN workers w ON r.reviewed_worker_id = w.id
WHERE w.company_id = $1
  AND (sqlc.narg('rating')::int IS NULL OR r.rating = sqlc.narg('rating'));

-- name: UpdateReviewStatus :one
UPDATE reviews SET status = $2 WHERE id = $1 RETURNING *;

-- name: GetReviewByID :one
SELECT * FROM reviews WHERE id = $1;

-- name: CreateReviewPhoto :one
INSERT INTO review_photos (review_id, photo_url, sort_order)
VALUES ($1, $2, $3)
RETURNING *;

-- name: ListReviewPhotos :many
SELECT * FROM review_photos WHERE review_id = $1 ORDER BY sort_order;

-- name: DeleteReviewPhoto :exec
DELETE FROM review_photos WHERE id = $1;
