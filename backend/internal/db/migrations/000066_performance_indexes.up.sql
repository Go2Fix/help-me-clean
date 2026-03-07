-- Performance indexes for analytics, rating aggregation, and ILIKE search.
-- Migration 000066: adds missing indexes identified during pre-launch review.

-- Analytics queries: WHERE status = 'completed' AND completed_at BETWEEN ...
-- Used by: GetRevenueByDateRange, CompanyFinancialSummary, WorkerPerformanceStats
CREATE INDEX IF NOT EXISTS idx_bookings_status_completed_at
  ON bookings(status, completed_at) WHERE status = 'completed';

-- Rating aggregation: JOIN workers w ON r.reviewed_worker_id = w.id
-- Used by: GetAverageWorkerRating, GetCompanyAverageRating (hot path in enrichWorkerStats)
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_worker_id
  ON reviews(reviewed_worker_id);

-- Trigram extension for ILIKE prefix+suffix search (SearchBookings, SearchCompanies, SearchUsers)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ILIKE '%term%' on reference_code (SearchBookingsWithDetails)
CREATE INDEX IF NOT EXISTS idx_bookings_reference_code_trgm
  ON bookings USING gin(reference_code gin_trgm_ops);

-- ILIKE '%term%' on full_name (SearchUsers, SearchBookings via joined user)
CREATE INDEX IF NOT EXISTS idx_users_full_name_trgm
  ON users USING gin(full_name gin_trgm_ops);

-- ILIKE '%term%' on company_name and cui (SearchCompanies)
CREATE INDEX IF NOT EXISTS idx_companies_name_trgm
  ON companies USING gin(company_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_companies_cui_trgm
  ON companies USING gin(cui gin_trgm_ops);

-- Worker bookings by date: scheduling queries
CREATE INDEX IF NOT EXISTS idx_bookings_worker_date
  ON bookings(worker_id, scheduled_date) WHERE worker_id IS NOT NULL;

-- Notification queries: list unread by user
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, is_read, created_at DESC);
