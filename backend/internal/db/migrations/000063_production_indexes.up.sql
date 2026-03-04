-- Composite indexes for the three most-called booking list queries
CREATE INDEX IF NOT EXISTS idx_bookings_client_status  ON bookings(client_user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_company_status ON bookings(company_id, status) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_worker_status  ON bookings(worker_id, status)  WHERE worker_id IS NOT NULL;

-- Missing simple FK/filter indexes
CREATE INDEX IF NOT EXISTS idx_client_addresses_user_id   ON client_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_promo_code_id     ON bookings(promo_code_id)   WHERE promo_code_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_city_area_id      ON bookings(city_area_id)    WHERE city_area_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_user_id    ON promo_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_line_items_txn      ON payout_line_items(payment_transaction_id);
CREATE INDEX IF NOT EXISTS idx_booking_disputes_opened_by ON booking_disputes(opened_by);

-- FK constraint on subscriptions.worker_id (was missing entirely).
-- NOT VALID = validates new rows only, safe for production.
-- Guard with DO block since ADD CONSTRAINT IF NOT EXISTS is not supported in PostgreSQL.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = current_schema()
          AND table_name = 'subscriptions'
          AND constraint_name = 'fk_subscriptions_worker'
    ) THEN
        ALTER TABLE subscriptions
            ADD CONSTRAINT fk_subscriptions_worker
            FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL
            NOT VALID;
    END IF;
END
$$;
