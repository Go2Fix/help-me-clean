-- name: GetAddressByID :one
SELECT * FROM client_addresses WHERE id = $1;

-- name: ListAddressesByUser :many
SELECT * FROM client_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC;

-- name: CreateAddress :one
INSERT INTO client_addresses (user_id, label, street_address, city, county, postal_code, floor, apartment, entry_code, latitude, longitude, notes, is_default)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
RETURNING *;

-- name: UpdateAddress :one
UPDATE client_addresses SET label = $2, street_address = $3, city = $4, county = $5, postal_code = $6, floor = $7, apartment = $8, entry_code = $9, latitude = $10, longitude = $11, notes = $12
WHERE id = $1 RETURNING *;

-- name: DeleteAddress :exec
DELETE FROM client_addresses WHERE id = $1;

-- name: SetDefaultAddress :exec
UPDATE client_addresses SET is_default = (id = $2) WHERE user_id = $1;

-- name: GetAddressesByIDs :many
SELECT * FROM client_addresses WHERE id = ANY($1::uuid[]);
