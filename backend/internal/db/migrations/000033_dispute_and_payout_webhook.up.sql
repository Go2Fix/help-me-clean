-- Add 'disputed' to payment_transaction_status enum
ALTER TYPE payment_transaction_status ADD VALUE IF NOT EXISTS 'disputed';

-- Add dispute tracking column to payment_transactions
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS stripe_dispute_id VARCHAR(255);
