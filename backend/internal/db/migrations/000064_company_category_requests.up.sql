-- company_category_requests: tracks company requests to activate or deactivate service categories
CREATE TABLE company_category_requests (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id  UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('activate', 'deactivate')),
    status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_by UUID NOT NULL REFERENCES users(id),
    reviewed_by  UUID REFERENCES users(id),
    review_note  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate pending requests for the same (company, category, type)
CREATE UNIQUE INDEX idx_company_cat_req_unique_pending
    ON company_category_requests (company_id, category_id, request_type)
    WHERE status = 'pending';

CREATE INDEX idx_company_cat_req_company ON company_category_requests(company_id);
CREATE INDEX idx_company_cat_req_status  ON company_category_requests(status);

-- Add invited_category_ids to workers for storing intended categories until acceptance
ALTER TABLE workers ADD COLUMN invited_category_ids UUID[] NOT NULL DEFAULT '{}';
