-- name: CreateCompanyCategoryRequest :one
INSERT INTO company_category_requests (
    company_id, category_id, request_type, requested_by
) VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetCompanyCategoryRequest :one
SELECT * FROM company_category_requests WHERE id = $1;

-- name: ListPendingCategoryRequests :many
SELECT
    ccr.*,
    co.company_name,
    sc.slug        AS category_slug,
    sc.name_ro     AS category_name_ro,
    sc.name_en     AS category_name_en,
    sc.icon        AS category_icon
FROM company_category_requests ccr
JOIN companies co ON co.id = ccr.company_id
JOIN service_categories sc ON sc.id = ccr.category_id
WHERE ccr.status = 'pending'
ORDER BY ccr.created_at ASC;

-- name: ListCompanyCategoryRequests :many
SELECT
    ccr.*,
    co.company_name,
    sc.slug        AS category_slug,
    sc.name_ro     AS category_name_ro,
    sc.name_en     AS category_name_en,
    sc.icon        AS category_icon
FROM company_category_requests ccr
JOIN companies co ON co.id = ccr.company_id
JOIN service_categories sc ON sc.id = ccr.category_id
WHERE ccr.company_id = $1
ORDER BY ccr.created_at DESC;

-- name: UpdateCompanyCategoryRequestStatus :one
UPDATE company_category_requests
SET status = $2, reviewed_by = $3, review_note = $4, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: CountPendingCategoryRequests :one
SELECT COUNT(*) FROM company_category_requests WHERE status = 'pending';

-- name: HasPendingCategoryRequest :one
SELECT EXISTS(
    SELECT 1 FROM company_category_requests
    WHERE company_id = $1 AND category_id = $2 AND request_type = $3 AND status = 'pending'
) AS has_pending;
