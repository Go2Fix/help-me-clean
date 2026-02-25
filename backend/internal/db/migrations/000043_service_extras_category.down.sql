DROP INDEX IF EXISTS idx_service_extras_category;
ALTER TABLE service_extras DROP COLUMN IF EXISTS category_id;
