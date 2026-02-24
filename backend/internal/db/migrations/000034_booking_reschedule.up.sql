-- Add reschedule tracking columns to bookings.
ALTER TABLE bookings
  ADD COLUMN reschedule_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN rescheduled_at TIMESTAMPTZ;

-- Add notification type for reschedule events.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'booking_rescheduled';

-- Seed cancellation / reschedule policy settings.
INSERT INTO platform_settings (key, value, value_type, description) VALUES
  ('cancel_free_hours_before',     '48', 'number', 'Ore inainte de booking pentru anulare gratuita'),
  ('cancel_late_refund_pct',       '50', 'number', 'Procentul de rambursare pentru anulare tarzie (%)'),
  ('reschedule_free_hours_before', '24', 'number', 'Ore inainte de booking pentru reprogramare gratuita'),
  ('reschedule_max_per_booking',   '2',  'number', 'Numarul maxim de reprogramari per booking')
ON CONFLICT (key) DO NOTHING;
