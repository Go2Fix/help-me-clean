-- Area centroid coordinates for distance-based route estimation.
-- Admin enters approximate center point per area (e.g., each Bucharest sector).
ALTER TABLE city_areas
  ADD COLUMN latitude  DOUBLE PRECISION,
  ADD COLUMN longitude DOUBLE PRECISION;

-- Worker home/base location for start-of-day routing.
ALTER TABLE workers
  ADD COLUMN home_latitude  DOUBLE PRECISION,
  ADD COLUMN home_longitude DOUBLE PRECISION;

-- Area FK on bookings — set at booking creation for fast routing lookup.
ALTER TABLE bookings
  ADD COLUMN city_area_id UUID REFERENCES city_areas(id);

-- Seed Bucharest sector centroids (approximate geographic centers).
UPDATE city_areas ca
SET latitude  = v.lat,
    longitude = v.lng
FROM (VALUES
  ('Sector 1', 44.4554, 26.0457),
  ('Sector 2', 44.4404, 26.1153),
  ('Sector 3', 44.4147, 26.1153),
  ('Sector 4', 44.3898, 26.0855),
  ('Sector 5', 44.3997, 26.0353),
  ('Sector 6', 44.4353, 26.0003)
) AS v(name, lat, lng)
WHERE ca.name = v.name
  AND EXISTS (
    SELECT 1 FROM enabled_cities ec WHERE ec.id = ca.city_id AND ec.name ILIKE '%Bucure%'
  );
