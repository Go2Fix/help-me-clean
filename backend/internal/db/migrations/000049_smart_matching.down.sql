ALTER TABLE city_areas DROP COLUMN IF EXISTS latitude, DROP COLUMN IF EXISTS longitude;
ALTER TABLE workers    DROP COLUMN IF EXISTS home_latitude, DROP COLUMN IF EXISTS home_longitude;
ALTER TABLE bookings   DROP COLUMN IF EXISTS city_area_id;
