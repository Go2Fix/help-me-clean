-- Migrate invoicing provider from Oblio.eu to Keez.ro.
-- Keez identifies invoices by a UUID externalId; series and number are returned after creation.
ALTER TABLE invoices RENAME COLUMN oblio_number TO keez_number;
ALTER TABLE invoices RENAME COLUMN oblio_download_url TO keez_download_url;
ALTER TABLE invoices RENAME COLUMN oblio_series_name TO keez_series;
ALTER TABLE invoices ADD COLUMN keez_external_id VARCHAR(36);
