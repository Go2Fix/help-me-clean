ALTER TABLE bookings DROP COLUMN IF EXISTS promo_discount_amount;
ALTER TABLE bookings DROP COLUMN IF EXISTS promo_code_id;
DROP TABLE IF EXISTS promo_code_uses;
DROP TABLE IF EXISTS promo_codes;
