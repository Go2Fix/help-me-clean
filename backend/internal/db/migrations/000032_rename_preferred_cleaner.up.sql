-- Fix missed column from P0-3 rename
ALTER TABLE recurring_booking_groups RENAME COLUMN preferred_cleaner_id TO preferred_worker_id;
