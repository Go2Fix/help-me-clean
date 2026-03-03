-- Migration: 000057_referral_system (rollback)

ALTER TABLE bookings DROP COLUMN IF EXISTS referral_discount_id;
ALTER TABLE users    DROP COLUMN IF EXISTS referral_code_used;

DROP TABLE IF EXISTS referral_earned_discounts;
DROP TABLE IF EXISTS referral_signups;
DROP TABLE IF EXISTS referral_codes;
