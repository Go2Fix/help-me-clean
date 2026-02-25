-- Track which service categories a company offers.
CREATE TABLE company_service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, category_id)
);

-- Track which service categories a worker is qualified for.
CREATE TABLE worker_service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(worker_id, category_id)
);

CREATE INDEX idx_company_service_categories_company ON company_service_categories(company_id);
CREATE INDEX idx_company_service_categories_category ON company_service_categories(category_id);
CREATE INDEX idx_worker_service_categories_worker ON worker_service_categories(worker_id);
CREATE INDEX idx_worker_service_categories_category ON worker_service_categories(category_id);

-- Seed: assign all existing companies to 'curatenie' category.
INSERT INTO company_service_categories (company_id, category_id)
SELECT c.id, sc.id
FROM companies c
CROSS JOIN service_categories sc
WHERE sc.slug = 'curatenie';

-- Seed: assign all existing workers to 'curatenie' category.
INSERT INTO worker_service_categories (worker_id, category_id)
SELECT w.id, sc.id
FROM workers w
CROSS JOIN service_categories sc
WHERE sc.slug = 'curatenie';
