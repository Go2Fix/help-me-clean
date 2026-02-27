ALTER TABLE companies
  DROP COLUMN IF EXISTS anaf_status,
  DROP COLUMN IF EXISTS anaf_denumire,
  DROP COLUMN IF EXISTS anaf_adresa,
  DROP COLUMN IF EXISTS anaf_data_infiintare,
  DROP COLUMN IF EXISTS anaf_scp_tva,
  DROP COLUMN IF EXISTS anaf_inactive,
  DROP COLUMN IF EXISTS anaf_verified_at,
  DROP COLUMN IF EXISTS anaf_raw_error;
