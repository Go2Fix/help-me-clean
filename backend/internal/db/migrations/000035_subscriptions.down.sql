-- Reverse P2-3: Stripe Subscription-based recurring bookings

DROP INDEX IF EXISTS idx_subscription_extras_sub;
DROP INDEX IF EXISTS idx_bookings_subscription;
DROP INDEX IF EXISTS idx_subscriptions_stripe;
DROP INDEX IF EXISTS idx_subscriptions_status;
DROP INDEX IF EXISTS idx_subscriptions_company;
DROP INDEX IF EXISTS idx_subscriptions_client;

ALTER TABLE bookings DROP COLUMN IF EXISTS subscription_id;

DROP TABLE IF EXISTS subscription_extras;
DROP TABLE IF EXISTS subscriptions;
DROP TYPE IF EXISTS subscription_status;
DROP TABLE IF EXISTS recurring_discounts;
