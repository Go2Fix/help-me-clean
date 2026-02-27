-- ANAF verification snapshot stored per company (latest only).
-- anaf_status values: NULL (never checked) | 'verified' | 'not_found' | 'error'
ALTER TABLE companies
  ADD COLUMN anaf_status           VARCHAR(20),
  ADD COLUMN anaf_denumire         TEXT,
  ADD COLUMN anaf_adresa           TEXT,
  ADD COLUMN anaf_data_infiintare  TEXT,
  ADD COLUMN anaf_scp_tva          BOOLEAN,
  ADD COLUMN anaf_inactive         BOOLEAN,
  ADD COLUMN anaf_verified_at      TIMESTAMPTZ,
  ADD COLUMN anaf_raw_error        TEXT;
