-- Per-city pricing multiplier (e.g., 1.20 for Bucharest, 0.90 for smaller cities).
ALTER TABLE enabled_cities ADD COLUMN pricing_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00;

-- Snapshot of city pricing multiplier at booking creation time.
ALTER TABLE bookings ADD COLUMN city_pricing_multiplier DECIMAL(4,2) DEFAULT 1.00;
