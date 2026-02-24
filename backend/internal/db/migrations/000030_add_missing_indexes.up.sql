-- Add missing indexes for cleaner_availability (frequently queried by cleaner_id).
CREATE INDEX IF NOT EXISTS idx_cleaner_availability_cleaner
  ON cleaner_availability (cleaner_id);

CREATE INDEX IF NOT EXISTS idx_cleaner_availability_cleaner_day
  ON cleaner_availability (cleaner_id, day_of_week);

-- Composite index for invoice lookups by type + company (common admin query).
CREATE INDEX IF NOT EXISTS idx_invoices_type_company
  ON invoices (invoice_type, company_id);
