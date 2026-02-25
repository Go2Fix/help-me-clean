DROP INDEX IF EXISTS idx_service_categories_slug;
DROP INDEX IF EXISTS idx_service_definitions_category;
ALTER TABLE service_definitions DROP COLUMN IF EXISTS category_id;
DROP TABLE IF EXISTS service_categories;
