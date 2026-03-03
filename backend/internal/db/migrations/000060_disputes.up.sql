-- Migration: 000060_disputes
-- Dispute system for booking complaints and resolution tracking

CREATE TYPE dispute_status AS ENUM (
    'open',
    'company_responded',
    'under_review',
    'resolved_refund_full',
    'resolved_refund_partial',
    'resolved_no_refund',
    'auto_closed'
);

CREATE TYPE dispute_reason AS ENUM (
    'poor_quality',
    'no_show',
    'property_damage',
    'incomplete_job',
    'overcharge',
    'other'
);

CREATE TABLE booking_disputes (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id           UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    opened_by            UUID        NOT NULL REFERENCES users(id),
    reason               dispute_reason NOT NULL,
    description          TEXT        NOT NULL,
    evidence_urls        TEXT[]      NOT NULL DEFAULT '{}',
    company_response     TEXT,
    company_responded_at TIMESTAMPTZ,
    resolution_notes     TEXT,
    resolved_by          UUID        REFERENCES users(id),
    refund_amount        NUMERIC(10,2),
    status               dispute_status NOT NULL DEFAULT 'open',
    auto_close_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_disputes_booking_id ON booking_disputes(booking_id);
CREATE INDEX idx_booking_disputes_status     ON booking_disputes(status);
CREATE INDEX idx_booking_disputes_opened_by  ON booking_disputes(opened_by);
