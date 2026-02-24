-- name: ListWorkerServiceAreas :many
SELECT wsa.id, wsa.worker_id, wsa.city_area_id, wsa.created_at,
       ca.name AS area_name, ca.city_id, ec.name AS city_name
FROM worker_service_areas wsa
JOIN city_areas ca ON ca.id = wsa.city_area_id
JOIN enabled_cities ec ON ec.id = ca.city_id
WHERE wsa.worker_id = $1
ORDER BY ec.name, ca.name;

-- name: DeleteAllWorkerServiceAreas :exec
DELETE FROM worker_service_areas WHERE worker_id = $1;

-- name: InsertWorkerServiceArea :one
INSERT INTO worker_service_areas (worker_id, city_area_id)
VALUES ($1, $2)
RETURNING id, worker_id, city_area_id, created_at;
