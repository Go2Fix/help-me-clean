-- Link service extras to categories.
-- NULL category_id = global (available to all categories).
ALTER TABLE service_extras ADD COLUMN category_id UUID REFERENCES service_categories(id);

-- Assign all existing extras to 'curatenie' category.
UPDATE service_extras SET category_id = (SELECT id FROM service_categories WHERE slug = 'curatenie');

CREATE INDEX idx_service_extras_category ON service_extras(category_id);
