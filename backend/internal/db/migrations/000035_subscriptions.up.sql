-- P2-3: Stripe Subscription-based recurring bookings with configurable discounts

-- ─── Recurring Discounts (admin-configurable) ─────────────────────────────
CREATE TABLE recurring_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recurrence_type recurrence_type NOT NULL UNIQUE,
    discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO recurring_discounts (recurrence_type, discount_pct) VALUES
    ('weekly', 15.00),
    ('biweekly', 10.00),
    ('monthly', 5.00);

-- ─── Subscription Status Enum ─────────────────────────────────────────────
CREATE TYPE subscription_status AS ENUM (
    'active',
    'paused',
    'past_due',
    'cancelled',
    'incomplete'
);

-- ─── Invoice Type: subscription monthly ───────────────────────────────────
ALTER TYPE invoice_type ADD VALUE IF NOT EXISTS 'subscription_monthly';

-- ─── Subscriptions Table ──────────────────────────────────────────────────
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships
    client_user_id UUID NOT NULL REFERENCES users(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    worker_id UUID REFERENCES workers(id),
    address_id UUID NOT NULL REFERENCES client_addresses(id),

    -- Service details (snapshot at creation time)
    recurrence_type recurrence_type NOT NULL,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    preferred_time TIME NOT NULL,
    service_type service_type NOT NULL,
    property_type VARCHAR(50),
    num_rooms INTEGER,
    num_bathrooms INTEGER,
    area_sqm INTEGER,
    has_pets BOOLEAN DEFAULT FALSE,
    special_instructions TEXT,

    -- Pricing
    hourly_rate DECIMAL(10,2) NOT NULL,
    estimated_duration_hours DECIMAL(5,2) NOT NULL,
    per_session_original DECIMAL(10,2) NOT NULL,
    discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
    per_session_discounted DECIMAL(10,2) NOT NULL,
    sessions_per_month INTEGER NOT NULL,
    monthly_amount DECIMAL(10,2) NOT NULL,
    monthly_amount_bani INTEGER NOT NULL,
    platform_commission_pct DECIMAL(5,2) NOT NULL,

    -- Stripe IDs
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_price_id VARCHAR(255),
    stripe_product_id VARCHAR(255),

    -- Status & lifecycle
    status subscription_status NOT NULL DEFAULT 'incomplete',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    paused_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Subscription Extras ──────────────────────────────────────────────────
CREATE TABLE subscription_extras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    extra_id UUID NOT NULL REFERENCES service_extras(id),
    quantity INTEGER DEFAULT 1
);

-- ─── Link bookings to subscriptions ───────────────────────────────────────
ALTER TABLE bookings ADD COLUMN subscription_id UUID REFERENCES subscriptions(id);

-- ─── Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX idx_subscriptions_client ON subscriptions(client_user_id);
CREATE INDEX idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status) WHERE status IN ('active', 'paused', 'past_due');
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_bookings_subscription ON bookings(subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX idx_subscription_extras_sub ON subscription_extras(subscription_id);
