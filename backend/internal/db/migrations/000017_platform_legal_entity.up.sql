-- Platform Legal Entity Table
-- This table stores the platform's legal entity details for commission invoices.
-- It should contain exactly one row (enforced by CHECK constraint).

CREATE TABLE IF NOT EXISTS platform_legal_entity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    cui VARCHAR(50) NOT NULL,
    reg_number VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    county VARCHAR(100) NOT NULL,
    is_vat_payer BOOLEAN NOT NULL DEFAULT true,
    bank_name VARCHAR(255),
    iban VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Ensure only one row exists in this table
    singleton_guard BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT platform_legal_entity_singleton CHECK (singleton_guard = true),
    CONSTRAINT platform_legal_entity_singleton_unique UNIQUE (singleton_guard)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_platform_legal_entity_singleton ON platform_legal_entity(singleton_guard);

-- Insert default platform legal entity data from environment variables
-- This data will be migrated from .env during deployment
INSERT INTO platform_legal_entity (
    company_name,
    cui,
    reg_number,
    address,
    city,
    county,
    is_vat_payer,
    bank_name,
    iban
) VALUES (
    'Go2Fix SRL',
    'RO12345678',
    'J40/1234/2024',
    'Str. Exemplu nr. 1',
    'Bucuresti',
    'Bucuresti',
    true,
    'ING Bank',
    'RO49AAAA1B31007593840000'
) ON CONFLICT (singleton_guard) DO NOTHING;
