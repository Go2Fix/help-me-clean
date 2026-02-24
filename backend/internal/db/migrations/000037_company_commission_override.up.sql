ALTER TABLE companies ADD COLUMN commission_override_pct DECIMAL(5,2) DEFAULT NULL;
COMMENT ON COLUMN companies.commission_override_pct IS 'Per-company commission override. NULL means use platform default.';
