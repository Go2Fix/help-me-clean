-- Revert P0-3: worker → cleaner

-- 1. Rename indexes back
ALTER INDEX idx_bookings_worker RENAME TO idx_bookings_cleaner;
ALTER INDEX idx_workers_company RENAME TO idx_cleaners_company;
ALTER INDEX idx_workers_user_id RENAME TO idx_cleaners_user_id;
ALTER INDEX idx_bookings_worker_date_active RENAME TO idx_bookings_cleaner_date_active;
ALTER INDEX idx_personality_assessments_worker RENAME TO idx_personality_assessments_cleaner;
ALTER INDEX idx_worker_availability_worker RENAME TO idx_cleaner_availability_cleaner;
ALTER INDEX idx_worker_availability_worker_day RENAME TO idx_cleaner_availability_cleaner_day;
ALTER INDEX idx_worker_service_areas_worker RENAME TO idx_cleaner_service_areas_cleaner;
ALTER INDEX idx_worker_service_areas_area RENAME TO idx_cleaner_service_areas_area;
ALTER INDEX idx_worker_documents_worker RENAME TO idx_cleaner_documents_cleaner;

-- 2. Rename columns back
ALTER TABLE personality_assessments RENAME COLUMN worker_id TO cleaner_id;
ALTER TABLE reviews RENAME COLUMN reviewed_worker_id TO reviewed_cleaner_id;
ALTER TABLE bookings RENAME COLUMN worker_id TO cleaner_id;
ALTER TABLE worker_documents RENAME COLUMN worker_id TO cleaner_id;
ALTER TABLE worker_service_areas RENAME COLUMN worker_id TO cleaner_id;
ALTER TABLE worker_date_overrides RENAME COLUMN worker_id TO cleaner_id;
ALTER TABLE worker_availability RENAME COLUMN worker_id TO cleaner_id;
ALTER TABLE workers RENAME CONSTRAINT workers_user_id_unique TO cleaners_user_id_unique;

-- 3. Rename tables back
ALTER TABLE worker_documents RENAME TO cleaner_documents;
ALTER TABLE worker_service_areas RENAME TO cleaner_service_areas;
ALTER TABLE worker_date_overrides RENAME TO cleaner_date_overrides;
ALTER TABLE worker_availability RENAME TO cleaner_availability;
ALTER TABLE workers RENAME TO cleaners;

-- 4. Rename enum types back
ALTER TYPE user_role RENAME VALUE 'worker' TO 'cleaner';
ALTER TYPE worker_status RENAME TO cleaner_status;
