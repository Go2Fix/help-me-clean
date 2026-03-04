ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS fk_subscriptions_worker;

DROP INDEX IF EXISTS idx_bookings_client_status;
DROP INDEX IF EXISTS idx_bookings_company_status;
DROP INDEX IF EXISTS idx_bookings_worker_status;
DROP INDEX IF EXISTS idx_client_addresses_user_id;
DROP INDEX IF EXISTS idx_bookings_promo_code_id;
DROP INDEX IF EXISTS idx_bookings_city_area_id;
DROP INDEX IF EXISTS idx_promo_code_uses_user_id;
DROP INDEX IF EXISTS idx_payout_line_items_txn;
DROP INDEX IF EXISTS idx_booking_disputes_opened_by;
