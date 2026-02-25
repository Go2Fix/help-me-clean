-- name: ListCompanyServiceCategories :many
SELECT csc.id, csc.company_id, csc.category_id, csc.created_at,
       sc.slug, sc.name_ro, sc.name_en, sc.icon
FROM company_service_categories csc
JOIN service_categories sc ON sc.id = csc.category_id
WHERE csc.company_id = $1
ORDER BY sc.sort_order;

-- name: DeleteAllCompanyServiceCategories :exec
DELETE FROM company_service_categories WHERE company_id = $1;

-- name: InsertCompanyServiceCategory :exec
INSERT INTO company_service_categories (company_id, category_id) VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: CompanyHasCategory :one
SELECT EXISTS(
    SELECT 1 FROM company_service_categories
    WHERE company_id = $1 AND category_id = $2
) AS has_category;
