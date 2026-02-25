-- name: ListActiveServices :many
SELECT * FROM service_definitions WHERE is_active = TRUE ORDER BY service_type;

-- name: GetServiceByType :one
SELECT * FROM service_definitions WHERE service_type = $1;

-- name: ListActiveExtras :many
SELECT * FROM service_extras WHERE is_active = TRUE ORDER BY name_en;

-- name: GetExtraByID :one
SELECT * FROM service_extras WHERE id = $1;

-- name: ListAllServices :many
SELECT * FROM service_definitions ORDER BY name_ro;

-- name: UpdateServiceDefinition :one
UPDATE service_definitions SET name_ro = $2, name_en = $3, base_price_per_hour = $4,
    min_hours = $5, hours_per_room = $6, hours_per_bathroom = $7, hours_per_100_sqm = $8,
    house_multiplier = $9, pet_duration_minutes = $10, is_active = $11, included_items = $12,
    category_id = $13, pricing_model = $14, price_per_sqm = $15
WHERE id = $1 RETURNING *;

-- name: ListAllExtras :many
SELECT * FROM service_extras ORDER BY name_ro;

-- name: UpdateServiceExtra :one
UPDATE service_extras SET name_ro = $2, name_en = $3, price = $4, duration_minutes = $5,
    is_active = $6, allow_multiple = $7, unit_label = $8
WHERE id = $1 RETURNING *;

-- name: CreateServiceDefinition :one
INSERT INTO service_definitions (service_type, name_ro, name_en, base_price_per_hour, min_hours,
    hours_per_room, hours_per_bathroom, hours_per_100_sqm, house_multiplier, pet_duration_minutes,
    is_active, included_items, category_id, pricing_model, price_per_sqm)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *;

-- name: CreateServiceExtra :one
INSERT INTO service_extras (name_ro, name_en, price, duration_minutes, is_active, allow_multiple, unit_label)
VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;

-- name: GetServiceByID :one
SELECT * FROM service_definitions WHERE id = $1;
