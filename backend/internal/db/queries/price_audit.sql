-- name: CreatePriceAuditEntry :one
INSERT INTO price_audit_log (entity_type, entity_id, field_name, old_value, new_value, changed_by, reason)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: ListPriceAuditLog :many
SELECT pal.*, u.full_name AS changed_by_name, u.email AS changed_by_email
FROM price_audit_log pal
LEFT JOIN users u ON u.id = pal.changed_by
WHERE (sqlc.narg('entity_type')::text IS NULL OR pal.entity_type = sqlc.narg('entity_type')::text)
ORDER BY pal.changed_at DESC
LIMIT $1 OFFSET $2;

-- name: CountPriceAuditLog :one
SELECT COUNT(*)
FROM price_audit_log
WHERE (sqlc.narg('entity_type')::text IS NULL OR entity_type = sqlc.narg('entity_type')::text);

-- name: ListPriceAuditLogByEntity :many
SELECT pal.*, u.full_name AS changed_by_name, u.email AS changed_by_email
FROM price_audit_log pal
LEFT JOIN users u ON u.id = pal.changed_by
WHERE pal.entity_type = $1 AND pal.entity_id = $2
ORDER BY pal.changed_at DESC
LIMIT $3 OFFSET $4;
