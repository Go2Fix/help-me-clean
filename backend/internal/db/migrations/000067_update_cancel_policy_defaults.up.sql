-- Update cancellation policy defaults to the official Go2Fix T&C:
-- >24h: free cancel (100% refund)
-- 2-24h: late cancel (70% refund, 30% administration fee)
-- <2h: no refund

INSERT INTO platform_settings (key, value) VALUES
    ('cancel_free_hours_before',      '24'),
    ('cancel_late_refund_pct',        '70'),
    ('cancel_no_refund_hours_before', '2')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
