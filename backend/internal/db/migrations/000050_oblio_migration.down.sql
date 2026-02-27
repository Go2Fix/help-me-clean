ALTER TABLE invoices RENAME COLUMN oblio_number TO factureaza_id;
ALTER TABLE invoices RENAME COLUMN oblio_download_url TO factureaza_download_url;
ALTER TABLE invoices DROP COLUMN IF EXISTS oblio_series_name;
