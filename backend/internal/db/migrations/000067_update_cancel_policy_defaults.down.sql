-- Revert to previous cancellation policy defaults
INSERT INTO platform_settings (key, value) VALUES
    ('cancel_free_hours_before', '48'),
    ('cancel_late_refund_pct',   '50')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DELETE FROM platform_settings WHERE key = 'cancel_no_refund_hours_before';
