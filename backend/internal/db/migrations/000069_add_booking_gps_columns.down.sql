ALTER TABLE bookings
    DROP COLUMN IF EXISTS start_lat,
    DROP COLUMN IF EXISTS start_lng,
    DROP COLUMN IF EXISTS finish_lat,
    DROP COLUMN IF EXISTS finish_lng;
