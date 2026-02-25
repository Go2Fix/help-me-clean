-- Per-sqm pricing model for non-cleaning services (e.g., disinfection).
CREATE TYPE pricing_model AS ENUM ('hourly', 'per_sqm');

ALTER TABLE service_definitions ADD COLUMN pricing_model pricing_model NOT NULL DEFAULT 'hourly';
ALTER TABLE service_definitions ADD COLUMN price_per_sqm DECIMAL(10,2);

COMMENT ON COLUMN service_definitions.pricing_model IS 'How this service is priced: hourly (duration-based) or per_sqm (area-based)';
COMMENT ON COLUMN service_definitions.price_per_sqm IS 'Price per square meter (used when pricing_model = per_sqm)';

-- Store pricing model on booking for audit.
ALTER TABLE bookings ADD COLUMN pricing_model pricing_model DEFAULT 'hourly';
