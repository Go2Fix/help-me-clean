ALTER TABLE bookings DROP COLUMN IF EXISTS city_pricing_multiplier;
ALTER TABLE enabled_cities DROP COLUMN IF EXISTS pricing_multiplier;
