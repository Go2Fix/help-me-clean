-- Add worker change request fields to subscriptions
ALTER TABLE subscriptions
  ADD COLUMN worker_change_requested_at TIMESTAMPTZ,
  ADD COLUMN worker_change_reason TEXT;

-- Partial index for quick lookup of pending requests
CREATE INDEX idx_subscriptions_pending_worker_change
  ON subscriptions(worker_change_requested_at)
  WHERE worker_change_requested_at IS NOT NULL;

-- New notification types for subscription worker changes
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'subscription_worker_change_requested';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'subscription_worker_changed';
