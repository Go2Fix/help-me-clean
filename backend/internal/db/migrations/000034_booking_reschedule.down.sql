ALTER TABLE bookings
  DROP COLUMN IF EXISTS reschedule_count,
  DROP COLUMN IF EXISTS rescheduled_at;

-- Note: PostgreSQL does not support removing enum values.
-- 'booking_rescheduled' will remain in notification_type.

DELETE FROM platform_settings WHERE key IN (
  'cancel_free_hours_before',
  'cancel_late_refund_pct',
  'reschedule_free_hours_before',
  'reschedule_max_per_booking'
);
