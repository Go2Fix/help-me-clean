-- name: ListWorkerServiceCategories :many
SELECT wsc.id, wsc.worker_id, wsc.category_id, wsc.created_at,
       sc.slug, sc.name_ro, sc.name_en, sc.icon
FROM worker_service_categories wsc
JOIN service_categories sc ON sc.id = wsc.category_id
WHERE wsc.worker_id = $1
ORDER BY sc.sort_order;

-- name: DeleteAllWorkerServiceCategories :exec
DELETE FROM worker_service_categories WHERE worker_id = $1;

-- name: InsertWorkerServiceCategory :exec
INSERT INTO worker_service_categories (worker_id, category_id) VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: WorkerHasCategory :one
SELECT EXISTS(
    SELECT 1 FROM worker_service_categories
    WHERE worker_id = $1 AND category_id = $2
) AS has_category;
