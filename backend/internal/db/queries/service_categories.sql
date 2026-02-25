-- name: ListActiveServiceCategories :many
SELECT * FROM service_categories
WHERE is_active = TRUE
ORDER BY sort_order, name_ro;

-- name: ListAllServiceCategories :many
SELECT * FROM service_categories
ORDER BY sort_order, name_ro;

-- name: GetServiceCategoryByID :one
SELECT * FROM service_categories WHERE id = $1;

-- name: GetServiceCategoryBySlug :one
SELECT * FROM service_categories WHERE slug = $1;

-- name: CreateServiceCategory :one
INSERT INTO service_categories (slug, name_ro, name_en, description_ro, description_en, icon, image_url, commission_pct, sort_order, is_active, form_fields)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: UpdateServiceCategory :one
UPDATE service_categories SET
    name_ro = $2, name_en = $3, description_ro = $4, description_en = $5,
    icon = $6, image_url = $7, commission_pct = $8, sort_order = $9,
    is_active = $10, form_fields = $11, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: ListServicesByCategory :many
SELECT * FROM service_definitions
WHERE category_id = $1 AND is_active = TRUE
ORDER BY service_type;
