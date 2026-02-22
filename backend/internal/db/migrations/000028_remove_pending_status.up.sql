-- Remove 'pending' from booking_status enum.
-- Bookings now start as 'confirmed' since payment happens at creation.

-- 1. Migrate any existing pending bookings to confirmed
UPDATE bookings SET status = 'confirmed' WHERE status = 'pending';

-- 2. Drop the column default and partial indexes that reference the enum
ALTER TABLE bookings ALTER COLUMN status DROP DEFAULT;
DROP INDEX IF EXISTS idx_bookings_status;
DROP INDEX IF EXISTS idx_bookings_cleaner_date_active;

-- 3. Convert column to text, recreate enum without 'pending', convert back
ALTER TABLE bookings ALTER COLUMN status TYPE text USING status::text;
DROP TYPE booking_status;
CREATE TYPE booking_status AS ENUM (
    'assigned',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled_by_client',
    'cancelled_by_company',
    'cancelled_by_admin'
);
ALTER TABLE bookings ALTER COLUMN status TYPE booking_status USING status::booking_status;

-- 4. Restore default and indexes
ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'confirmed';
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_cleaner_date_active ON bookings (cleaner_id, scheduled_date)
    WHERE status <> ALL (ARRAY['cancelled_by_client'::booking_status, 'cancelled_by_company'::booking_status, 'cancelled_by_admin'::booking_status]);
