-- name: ListEnabledCities :many
SELECT id, name, county, is_active, pricing_multiplier, created_at
FROM enabled_cities
ORDER BY name;

-- name: ListActiveCities :many
SELECT id, name, county, is_active, pricing_multiplier, created_at
FROM enabled_cities
WHERE is_active = TRUE
ORDER BY name;

-- name: GetCityByID :one
SELECT id, name, county, is_active, pricing_multiplier, created_at
FROM enabled_cities
WHERE id = $1;

-- name: GetCityByName :one
SELECT id, name, county, is_active, pricing_multiplier, created_at
FROM enabled_cities
WHERE LOWER(name) = LOWER($1) AND is_active = TRUE;

-- name: CreateCity :one
INSERT INTO enabled_cities (name, county)
VALUES ($1, $2)
RETURNING id, name, county, is_active, pricing_multiplier, created_at;

-- name: UpdateCityActive :one
UPDATE enabled_cities
SET is_active = $2
WHERE id = $1
RETURNING id, name, county, is_active, pricing_multiplier, created_at;

-- name: UpdateCityPricingMultiplier :one
UPDATE enabled_cities
SET pricing_multiplier = $2
WHERE id = $1
RETURNING id, name, county, is_active, pricing_multiplier, created_at;

-- name: ListAreasByCity :many
SELECT ca.id, ca.city_id, ca.name, ca.created_at, ec.name AS city_name
FROM city_areas ca
JOIN enabled_cities ec ON ec.id = ca.city_id
WHERE ca.city_id = $1
ORDER BY ca.name;

-- name: GetAreaByID :one
SELECT ca.id, ca.city_id, ca.name, ca.created_at, ec.name AS city_name
FROM city_areas ca
JOIN enabled_cities ec ON ec.id = ca.city_id
WHERE ca.id = $1;

-- name: CreateArea :one
INSERT INTO city_areas (city_id, name)
VALUES ($1, $2)
RETURNING id, city_id, name, created_at;

-- name: DeleteArea :exec
DELETE FROM city_areas WHERE id = $1;
