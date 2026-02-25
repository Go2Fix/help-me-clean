ALTER TABLE bookings ADD COLUMN category_id UUID REFERENCES service_categories(id);
UPDATE bookings SET category_id = (SELECT id FROM service_categories WHERE slug = 'curatenie');
CREATE INDEX idx_bookings_category ON bookings(category_id);

ALTER TABLE subscriptions ADD COLUMN category_id UUID REFERENCES service_categories(id);
UPDATE subscriptions SET category_id = (SELECT id FROM service_categories WHERE slug = 'curatenie');
CREATE INDEX idx_subscriptions_category ON subscriptions(category_id);
