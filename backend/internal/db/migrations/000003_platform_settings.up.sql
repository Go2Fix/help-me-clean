-- Platform settings key-value store
CREATE TABLE platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    value_type TEXT NOT NULL DEFAULT 'string',
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial settings
INSERT INTO platform_settings (key, value, value_type, description) VALUES
('platform_commission_pct', '25.00', 'number', 'Comision platforma (%)'),
('min_booking_hours', '2', 'number', 'Durata minima rezervare (ore)'),
('max_booking_hours', '12', 'number', 'Durata maxima rezervare (ore)'),
('default_hourly_rate', '50.00', 'number', 'Tarif implicit pe ora (RON)'),
('support_email', 'support@go2fix.ro', 'string', 'Email suport'),
('support_phone', '+40700000000', 'string', 'Telefon suport'),
('terms_url', 'https://go2fix.ro/termeni', 'string', 'URL termeni si conditii'),
('privacy_url', 'https://go2fix.ro/confidentialitate', 'string', 'URL politica confidentialitate'),
('booking_auto_cancel_hours', '48', 'number', 'Ore pana la anularea automata a rezervarilor neasignate'),
('require_company_approval', 'true', 'boolean', 'Companiile noi necesita aprobare admin');
