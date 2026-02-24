-- Remove dispute tracking column (enum values cannot be removed in PostgreSQL)
ALTER TABLE payment_transactions DROP COLUMN IF EXISTS stripe_dispute_id;
