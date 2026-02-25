-- Add configurable VAT rate to platform settings (previously hardcoded at 21%).
INSERT INTO platform_settings (key, value, value_type, description)
VALUES ('vat_rate_pct', '21.00', 'number', 'Cota TVA standard Romania (%)')
ON CONFLICT (key) DO NOTHING;
