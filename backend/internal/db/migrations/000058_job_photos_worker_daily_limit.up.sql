-- Migration: 000058_job_photos_worker_daily_limit
-- Adds booking_job_photos table and max_daily_bookings column to workers

CREATE TABLE booking_job_photos (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    uploaded_by     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_url       TEXT        NOT NULL,
    phase           VARCHAR(20) NOT NULL DEFAULT 'during',
    sort_order      INT         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_photo_phase CHECK (phase IN ('before', 'after', 'during'))
);

CREATE INDEX idx_booking_job_photos_booking ON booking_job_photos(booking_id);

-- Add worker daily booking limit (NULL = no limit)
ALTER TABLE workers ADD COLUMN max_daily_bookings INT;
