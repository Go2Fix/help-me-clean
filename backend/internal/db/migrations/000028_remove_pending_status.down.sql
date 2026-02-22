-- Re-add 'pending' to booking_status enum and restore it as default.

ALTER TABLE bookings ALTER COLUMN status DROP DEFAULT;
DROP INDEX IF EXISTS idx_bookings_status;
DROP INDEX IF EXISTS idx_bookings_cleaner_date_active;

ALTER TABLE bookings ALTER COLUMN status TYPE text USING status::text;
DROP TYPE booking_status;
CREATE TYPE booking_status AS ENUM (
    'pending',
    'assigned',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled_by_client',
    'cancelled_by_company',
    'cancelled_by_admin'
);
ALTER TABLE bookings ALTER COLUMN status TYPE booking_status USING status::booking_status;

ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'pending';
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_cleaner_date_active ON bookings (cleaner_id, scheduled_date)
    WHERE status <> ALL (ARRAY['cancelled_by_client'::booking_status, 'cancelled_by_company'::booking_status, 'cancelled_by_admin'::booking_status]);
