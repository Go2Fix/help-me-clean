-- Migrate invoicing provider from Factureaza.ro to Oblio.eu.
-- Oblio identifies invoices by a (seriesName, number) pair instead of a single ID.
ALTER TABLE invoices RENAME COLUMN factureaza_id TO oblio_number;
ALTER TABLE invoices RENAME COLUMN factureaza_download_url TO oblio_download_url;
ALTER TABLE invoices ADD COLUMN oblio_series_name VARCHAR(20);
