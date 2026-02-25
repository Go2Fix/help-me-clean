ALTER TABLE bookings DROP COLUMN IF EXISTS pricing_model;
ALTER TABLE service_definitions DROP COLUMN IF EXISTS price_per_sqm;
ALTER TABLE service_definitions DROP COLUMN IF EXISTS pricing_model;
DROP TYPE IF EXISTS pricing_model;
