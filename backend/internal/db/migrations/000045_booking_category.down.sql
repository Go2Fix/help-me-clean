DROP INDEX IF EXISTS idx_subscriptions_category;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS category_id;
DROP INDEX IF EXISTS idx_bookings_category;
ALTER TABLE bookings DROP COLUMN IF EXISTS category_id;
