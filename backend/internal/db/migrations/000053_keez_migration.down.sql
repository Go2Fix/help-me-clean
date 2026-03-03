ALTER TABLE invoices DROP COLUMN IF EXISTS keez_external_id;
ALTER TABLE invoices RENAME COLUMN keez_series TO oblio_series_name;
ALTER TABLE invoices RENAME COLUMN keez_download_url TO oblio_download_url;
ALTER TABLE invoices RENAME COLUMN keez_number TO oblio_number;
