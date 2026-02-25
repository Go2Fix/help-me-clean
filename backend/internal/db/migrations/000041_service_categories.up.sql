-- Service categories group services by type (cleaning, disinfection, etc.)
-- enabling per-category commission rates and SEO-friendly pages.
CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) NOT NULL UNIQUE,
    name_ro VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description_ro TEXT,
    description_en TEXT,
    icon VARCHAR(100),
    image_url TEXT,
    commission_pct DECIMAL(5,2),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN service_categories.commission_pct IS 'Per-category commission rate. NULL means use platform default.';

-- Link service definitions to categories.
ALTER TABLE service_definitions ADD COLUMN category_id UUID REFERENCES service_categories(id);

-- Seed the initial "Curatenie" (Cleaning) category.
INSERT INTO service_categories (slug, name_ro, name_en, description_ro, description_en, icon, sort_order, is_active)
VALUES ('curatenie', 'Curatenie', 'Cleaning', 'Servicii profesionale de curatenie pentru case, apartamente si birouri', 'Professional cleaning services for homes, apartments and offices', 'Sparkles', 1, true);

-- Assign all existing services to the Cleaning category.
UPDATE service_definitions SET category_id = (SELECT id FROM service_categories WHERE slug = 'curatenie');

CREATE INDEX idx_service_definitions_category ON service_definitions(category_id);
CREATE INDEX idx_service_categories_slug ON service_categories(slug);
