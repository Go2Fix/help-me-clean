DROP INDEX IF EXISTS idx_subscriptions_pending_worker_change;
ALTER TABLE subscriptions
  DROP COLUMN IF EXISTS worker_change_requested_at,
  DROP COLUMN IF EXISTS worker_change_reason;
-- Note: enum values cannot be easily removed in PostgreSQL; left as-is.
