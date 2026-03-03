-- Phone verification for WhatsApp-based support communication

-- Add phone_verified flag to users (default false for all existing users)
ALTER TABLE users ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT false;

-- OTP codes for WhatsApp phone verification (mirrors email_otp_codes pattern)
CREATE TABLE phone_otp_codes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone      VARCHAR(50) NOT NULL,
    code       CHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_phone_otp_user ON phone_otp_codes(user_id, created_at DESC);
