-- Price audit log tracks all pricing-related changes for compliance and debugging.
CREATE TABLE price_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT
);

CREATE INDEX idx_price_audit_log_entity ON price_audit_log(entity_type, entity_id);
CREATE INDEX idx_price_audit_log_changed_at ON price_audit_log(changed_at DESC);
CREATE INDEX idx_price_audit_log_changed_by ON price_audit_log(changed_by);
