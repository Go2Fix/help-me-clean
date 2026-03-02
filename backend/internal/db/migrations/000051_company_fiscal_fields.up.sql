ALTER TABLE companies
  ADD COLUMN reg_number  VARCHAR(50),
  ADD COLUMN is_vat_payer BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN bank_name   VARCHAR(255),
  ADD COLUMN iban        VARCHAR(50);
