-- ============================================================
-- P0-3: Rename "cleaner" → "worker" across the database
-- ============================================================

-- 1. Rename enum types
ALTER TYPE cleaner_status RENAME TO worker_status;

-- 2. Rename 'cleaner' value to 'worker' in user_role enum
ALTER TYPE user_role RENAME VALUE 'cleaner' TO 'worker';

-- 3. Rename tables
ALTER TABLE cleaners RENAME TO workers;
ALTER TABLE cleaner_availability RENAME TO worker_availability;
ALTER TABLE cleaner_date_overrides RENAME TO worker_date_overrides;
ALTER TABLE cleaner_service_areas RENAME TO worker_service_areas;
ALTER TABLE cleaner_documents RENAME TO worker_documents;

-- 4. Rename columns referencing "cleaner"
ALTER TABLE workers RENAME CONSTRAINT cleaners_user_id_unique TO workers_user_id_unique;
ALTER TABLE worker_availability RENAME COLUMN cleaner_id TO worker_id;
ALTER TABLE worker_date_overrides RENAME COLUMN cleaner_id TO worker_id;
ALTER TABLE worker_service_areas RENAME COLUMN cleaner_id TO worker_id;
ALTER TABLE worker_documents RENAME COLUMN cleaner_id TO worker_id;
ALTER TABLE bookings RENAME COLUMN cleaner_id TO worker_id;
ALTER TABLE reviews RENAME COLUMN reviewed_cleaner_id TO reviewed_worker_id;
ALTER TABLE personality_assessments RENAME COLUMN cleaner_id TO worker_id;

-- 5. Rename indexes
ALTER INDEX idx_bookings_cleaner RENAME TO idx_bookings_worker;
ALTER INDEX idx_cleaners_company RENAME TO idx_workers_company;
ALTER INDEX idx_cleaners_user_id RENAME TO idx_workers_user_id;
ALTER INDEX idx_bookings_cleaner_date_active RENAME TO idx_bookings_worker_date_active;
ALTER INDEX idx_personality_assessments_cleaner RENAME TO idx_personality_assessments_worker;
ALTER INDEX idx_cleaner_availability_cleaner RENAME TO idx_worker_availability_worker;
ALTER INDEX idx_cleaner_availability_cleaner_day RENAME TO idx_worker_availability_worker_day;
ALTER INDEX idx_cleaner_service_areas_cleaner RENAME TO idx_worker_service_areas_worker;
ALTER INDEX idx_cleaner_service_areas_area RENAME TO idx_worker_service_areas_area;
ALTER INDEX idx_cleaner_documents_cleaner RENAME TO idx_worker_documents_worker;
