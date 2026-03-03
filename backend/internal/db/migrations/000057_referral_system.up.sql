-- Migration: 000057_referral_system
-- Adds full referral code system: referral_codes, referral_signups, referral_earned_discounts
-- Alters users (referral_code_used) and bookings (referral_discount_id)

-- One unique referral code per client user (lazy-created after first completed booking)
CREATE TABLE referral_codes (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id   UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    code            VARCHAR(12) NOT NULL UNIQUE,
    current_cycle   INT         NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_codes_code ON referral_codes(code);

-- Tracks each new user who registered using a referral code
CREATE TABLE referral_signups (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code_id            UUID        NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
    referred_user_id            UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    cycle_number                INT         NOT NULL,
    joined_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    first_booking_completed_at  TIMESTAMPTZ,
    qualifying_booking_id       UUID        REFERENCES bookings(id) ON DELETE SET NULL
);

CREATE INDEX idx_referral_signups_code_cycle ON referral_signups(referral_code_id, cycle_number);
CREATE INDEX idx_referral_signups_referred   ON referral_signups(referred_user_id);

-- One earned discount per completed cycle of 3 qualifying referrals
CREATE TABLE referral_earned_discounts (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code_id        UUID        NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
    owner_user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cycle_number            INT         NOT NULL,
    earned_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_to_booking_id   UUID        REFERENCES bookings(id) ON DELETE SET NULL,
    applied_at              TIMESTAMPTZ,
    expires_at              TIMESTAMPTZ,
    status                  VARCHAR(20) NOT NULL DEFAULT 'available',
    CONSTRAINT uq_referral_earned_cycle  UNIQUE(referral_code_id, cycle_number),
    CONSTRAINT chk_referral_discount_status CHECK (status IN ('available', 'reserved', 'applied', 'expired'))
);

CREATE INDEX idx_referral_earned_owner_status ON referral_earned_discounts(owner_user_id, status);

-- Track which referral code a user used at signup
ALTER TABLE users ADD COLUMN referral_code_used VARCHAR(12);

-- Link an earned referral discount to a booking
ALTER TABLE bookings ADD COLUMN referral_discount_id UUID REFERENCES referral_earned_discounts(id) ON DELETE SET NULL;
