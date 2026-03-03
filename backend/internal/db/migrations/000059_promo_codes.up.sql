-- Migration: 000059_promo_codes
-- Platform-wide promo code system for marketing campaigns

CREATE TABLE promo_codes (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(50) NOT NULL UNIQUE,
    description         TEXT,
    discount_type       VARCHAR(20) NOT NULL DEFAULT 'percent',
    discount_value      NUMERIC(10,2) NOT NULL,
    min_order_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
    max_uses            INT,
    uses_count          INT         NOT NULL DEFAULT 0,
    max_uses_per_user   INT         NOT NULL DEFAULT 1,
    active_from         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active_until        TIMESTAMPTZ,
    is_active           BOOLEAN     NOT NULL DEFAULT true,
    created_by          UUID        REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_discount_type CHECK (discount_type IN ('percent', 'fixed_amount')),
    CONSTRAINT chk_discount_value CHECK (discount_value > 0),
    CONSTRAINT chk_percent_max CHECK (discount_type != 'percent' OR discount_value <= 100)
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_active ON promo_codes(is_active, active_from, active_until);

CREATE TABLE promo_code_uses (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id   UUID        NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
    user_id         UUID        REFERENCES users(id) ON DELETE SET NULL,
    booking_id      UUID        REFERENCES bookings(id) ON DELETE SET NULL,
    discount_amount NUMERIC(10,2) NOT NULL,
    used_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promo_code_uses_code ON promo_code_uses(promo_code_id);
CREATE INDEX idx_promo_code_uses_booking ON promo_code_uses(booking_id);

ALTER TABLE bookings
    ADD COLUMN promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
    ADD COLUMN promo_discount_amount NUMERIC(10,2);
