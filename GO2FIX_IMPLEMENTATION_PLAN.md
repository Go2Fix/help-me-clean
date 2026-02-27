# Go2Fix.ro — Implementation Plan

**Date:** 2026-02-23 (last updated: 2026-02-25)
**Platform:** Go2Fix.ro — Romania's Home Services Marketplace
**Goal:** Shape the MVP into a professional, scalable two-sided marketplace

---

## Table of Contents

1. [Business Model Clarifications](#1-business-model-clarifications)
2. [Phase 0 — Critical Bugs & Technical Debt](#2-phase-0--critical-bugs--technical-debt)
3. [Phase 1 — Core Platform Corrections](#3-phase-1--core-platform-corrections)
4. [Phase 2 — Smart Booking Features](#4-phase-2--smart-booking-features)
5. [Phase 3 — Admin Control Center](#5-phase-3--admin-control-center)
6. [Phase 4 — Multi-Service Readiness](#6-phase-4--multi-service-readiness)
7. [Phase 5 — Company & Worker Management](#7-phase-5--company--worker-management)
8. [Phase 6 — Client Experience Polish](#8-phase-6--client-experience-polish)
9. [Phase 7 — Admin Dashboard Enhancements](#9-phase-7--admin-dashboard-enhancements)
10. [Phase 8 — Future (Deferred)](#10-phase-8--future-deferred)
11. [Additional Work Completed](#11-additional-work-completed)
12. [Task Summary](#12-task-summary)

---

## 1. Business Model Clarifications

These decisions override previous assumptions and guide all implementation:

| Decision | Detail |
|----------|--------|
| **Company visibility** | NO public company profiles. Companies provide services through the platform — they are "our workers," not independent brands. |
| **Pricing** | Companies do NOT set their own prices. Unified platform pricing controlled by admin. |
| **Booking links** | NO direct booking links for companies. All bookings go through the platform. |
| **Favorite companies** | NO favorite companies feature. Clients can request recurring with same worker or request a worker change. |
| **Company growth** | Quality over quantity. Open new company collaborations only as demand increases, keeping schedules full. |
| **Notifications** | NO emails, push, or in-app notifications for now. This is a separate future task. |
| **Recurring bookings** | Most important client type. Smart discount system controlled by admin. |
| **Multi-service** | Platform will expand beyond cleaning. Architecture must support any home service type. |

---

## 2. Phase 0 — Critical Bugs & Technical Debt ✅ ALL COMPLETED

> ~~Fix immediately. These are production-impacting bugs.~~ ALL DONE

### P0-2: HMC- Prefix → G2F- Prefix ✅ COMPLETED

~~**Problem:** Booking reference codes still use old "HelpMeClean" brand prefix.~~

**Fix:**
- [x] Change `HMC-` → `G2F-` in booking.resolvers.go
- [x] Change `HMC-` → `G2F-` in recurring_helpers.go
- [x] Update invoice/service.go comment
- [x] Update test fixtures to use G2F- prefix (7 test files: convert_test.go + 6 frontend tests)
- [x] Existing HMC- bookings in production remain as-is (historical)

---

### P0-3: "Cleaner" Terminology → "Worker" ✅ COMPLETED

**Problem:** Database tables, enums, and code reference "cleaner" everywhere, blocking multi-service expansion.

**Affected areas:**
- DB tables: `cleaners`, `cleaner_availability`, `cleaner_reviews`
- DB enum: `user_role` has `CLEANER` value
- GraphQL schema: `Cleaner` type, `assignCleaner` mutation
- Frontend: Romanian UI already uses "lucrator" in some places but "curatenitor" in others
- Go code: resolver files, service layer

**Fix (phased):**
- [x] Create DB migration renaming tables: `cleaners` → `workers`, `cleaner_availability` → `worker_availability`, `cleaner_reviews` → `worker_reviews` (migrations 000031 + 000032)
- [x] Rename `CLEANER` → `WORKER` in user_role enum via ALTER TYPE RENAME VALUE
- [x] Update sqlc queries to use new table names
- [x] Update GraphQL schema: `Cleaner` → `Worker`, `assignCleaner` → `assignWorker`
- [x] Update all Go resolvers and service code
- [x] Update frontend components and translations
- [x] Update all test files
- [x] All Go backend tests pass (66 tests)
- [x] All frontend tests pass (413 tests across 44 files)

---

### P0-4: Missing Stripe Webhook Event Handlers ✅ COMPLETED

**Problem:** Only `payment_intent.succeeded` and `payment_intent.payment_failed` are handled. Missing critical events.

**Fix:**
- [x] Add handler for `charge.refunded` — update payment transaction status (already existed)
- [x] Add handler for `charge.dispute.created` — mark transaction disputed, record dispute ID
- [x] Add handler for `account.updated` — update company Stripe onboarding status (already existed)
- [x] Add handler for `payout.failed` — mark payout as failed with failure reason
- [x] Migration 000033: added `disputed` enum value + `stripe_dispute_id` column
- [x] All 6 webhook events now handled: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded, charge.dispute.created, account.updated, payout.failed

---

### P0-5: Missing Database Indexes ✅ COMPLETED

**Problem:** Several frequently-queried columns lack indexes.

**Fix:**
- [x] Add index on `bookings.scheduled_date` (date range queries) — exists in 000001 (`idx_bookings_date`)
- [x] Add index on `bookings.status` (status filtering) — exists in 000001/000028 (`idx_bookings_status`)
- [x] Add index on `payment_transactions.status` (payment queries) — exists in 000011 (`idx_payment_transactions_status`)
- [x] Add index on `invoices.invoice_type` + `invoices.company_id` (invoice lookups) — exists in 000030 (`idx_invoices_type_company`)
- [x] Add composite index on `worker_availability(worker_id, date)` (scheduling) — exists in 000030 (`idx_cleaner_availability_cleaner_day`)

All indexes already existed from prior migrations. No new migration needed.

---

## 3. Phase 1 — Core Platform Corrections ✅ ALL N/A

> Remove/modify features that don't align with business model.

### P1-2: Remove Company Public Profiles ✅ N/A (never built)

**N/A — Never built.** No public company profile routes, pages, or GraphQL queries exist. Companies have their own authenticated dashboard (`/firma/*`) but no public-facing profile page. No action needed.

---

### P1-3: Remove Company Pricing Controls ✅ N/A (never built)

**N/A — Never built.** All pricing is platform-wide via `service_definitions` table, managed by admins only. Companies have no pricing controls in their dashboard. No action needed.

---

### P1-4: Remove Direct Booking Links ✅ N/A (never built)

**N/A — Never built.** No direct booking routes exist. All bookings go through the standard `/rezervare` flow. No company slugs or direct booking URLs in the codebase. No action needed.

---

### P1-5: Remove Favorite Companies Feature ✅ N/A (never built)

**N/A — Never built.** No favorites table, GraphQL operations, or UI components exist. No action needed.

---

## 4. Phase 2 — Smart Booking Features ✅ MOSTLY COMPLETED

> Key differentiators for the platform.

### P2-1: Smart Time Suggestion During Booking ✅ COMPLETED

**Problem:** When no workers are available for selected time, booking just fails. Should suggest alternatives.

**Implementation:**
- [x] Backend: Implemented `SuggestWorkers` resolver in `location.resolvers.go`
  - Extended `FindMatchingWorkers` query with `user_id` + `avatar_url` (no N+1 queries)
  - Created `suggestWorkersForSlots` + `evaluateWorkerForSlots` helpers in `location_helpers.go`
  - Uses matching engine: `ComputeFreeIntervals` → `FindOptimalPlacement` → `ComputeMatchScore`
  - Determines availability status: "available" (within requested window), "partial" (different time same day)
  - Falls back to full-day placement when client's preferred slot has no room
  - Returns top 5 workers sorted by match score (rating, gap optimization, load balancing)
- [x] Frontend: Enhanced `StepWorker` component in `BookingPage.tsx`
  - Improved empty state: Calendar icon, friendly message, "Alege alt interval" button navigates back to schedule step
  - Smart amber info banner when a "partial" worker is selected, showing their actual available time window
  - All existing worker cards, availability badges, and suggested times continue to work
- [x] **Bug fix:** Workers with no available slots are now excluded (return `nil`) instead of being shown as "Indisponibil"
- [x] **Bug fix:** Default availability fallback (Mon-Fri 08:00-20:00) for workers without availability records configured — applied to both one-time and subscription flows
- [ ] Admin: Dashboard demand heatmap — deferred to post-MVP

---

### P2-2: Booking Reschedule with Configurable Rules ✅ COMPLETED

**Problem:** No reschedule/cancel flow with appropriate fee/refund logic.

**Implementation:**

**Backend:**
- [x] Migration 000034: `reschedule_count` + `rescheduled_at` columns on bookings, `booking_rescheduled` notification type, policy settings in platform_settings
- [x] `RescheduleBooking` sqlc query (atomic counter increment + schedule update)
- [x] `rescheduleBooking` mutation — auth check, status guard (ASSIGNED/CONFIRMED only), policy-based count limit, date/time validation, async notifications
- [x] `adminRescheduleBooking` mutation — admin-only, no count limits
- [x] `bookingPolicy` query — returns configurable policy values (cancel/reschedule hours, refund %, max reschedules)
- [x] `reschedule_helpers.go` — `loadBookingPolicy`, `hoursUntilBooking`, `sendRescheduleNotifications`
- [x] Policy settings: `cancel_free_hours_before` (48h), `cancel_late_refund_pct` (50%), `reschedule_free_hours_before` (24h), `reschedule_max_per_booking` (2)

**Frontend — All user types:**
- [x] Shared `RescheduleModal` component with date/time pickers, policy warnings, reschedule count display
- [x] Client BookingDetailPage: "Reprogrameaza" button + RescheduleModal + policy-aware cancel (refund % message)
- [x] Company OrderDetailPage: "Reprogrameaza" button + RescheduleModal + policy-aware cancel
- [x] Admin BookingDetailPage: "Reprogrameaza" button + RescheduleModal (isAdmin, no limits)

**Frontend — Admin configuration:**
- [x] "Anulare / Reprogramare" settings group in admin SettingsPage with all 4 policy keys
- [ ] Advanced: Stripe auto-refund on cancel based on policy — deferred to post-MVP

---

### P2-3: Recurring Booking Subscriptions (Stripe Billing) ✅ COMPLETED

**Problem:** Recurring bookings are the most valuable clients but get no incentive. Old system created 8 bookings upfront with no billing integration.

**Implementation — Full Stripe Subscription system:**

**Backend:**
- [x] Migration 000035: `recurring_discounts` table, `subscription_status` enum, `subscriptions` table, `subscription_extras` table, `subscription_id` on bookings
- [x] Default discounts (admin-configurable): Weekly 15%, Bi-weekly 10%, Monthly 5%
- [x] Subscription service (`backend/internal/service/subscription/service.go`): Create/Pause/Resume/Cancel with Stripe Subscriptions API
- [x] Stripe Connect split payments: `application_fee_percent` + `transfer_data.destination`
- [x] Webhook handlers: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [x] Monthly invoice generation (`GenerateSubscriptionMonthlyInvoice`) — company → client
- [x] **Commission invoice generation** (`GenerateCommissionInvoice`) — platform → company, wired into `HandleInvoicePaid`
- [x] Automatic booking generation for each billing period
- [x] GraphQL schema: `ServiceSubscription` type, 7 queries, 6 mutations
- [x] Full resolver implementation with auth guards

**Frontend — Booking flow:**
- [x] Discount badges on frequency buttons ("Economisesti 15%!")
- [x] Subscription pricing preview (per-session, discount, sessions/month, monthly total)
- [x] `createSubscription` mutation for recurring bookings (replaces old `createBookingRequest`)
- [x] Success screen redirects to subscription detail page

**Frontend — Client dashboard:**
- [x] `/cont/abonamente` — subscription list with status badges, pricing, next billing
- [x] `/cont/abonamente/:id` — full detail with pause/resume/cancel actions, booking history
- [x] Client dashboard widget with subscription data

**Frontend — Company dashboard:**
- [x] `/firma/abonamente` — read-only subscription list with KPIs (active count, MRR, total)
- [x] Company dashboard updated with subscription metrics

**Frontend — Admin:**
- [x] `/admin/abonamente` — full table with status filter, KPI cards, force-cancel action
- [x] `/admin/abonamente/:id` — full subscription detail page with booking history, actions, financial summary
- [x] "Reduceri abonamente" tab in admin settings — edit discount percentages per frequency
- [x] Admin dashboard updated with subscription stats + MRR

---

### P2-4: Request Same Worker for Recurring ✅ COMPLETED

**What was done:**
- [x] `preferred_worker_id` field in DB (`recurring_booking_groups` table, migration 000032)
- [x] `preferredWorkerId` in GraphQL schema (`booking.graphql` + `subscription.graphql`) and `CreateBookingInput` / `CreateSubscriptionInput`
- [x] Booking flow UI: worker selection cards, auto-selects best match, client can pick preferred worker
- [x] `preferredWorkerId` sent in `createBookingRequest` and `createSubscription` mutations
- [x] `recurring_helpers.go`: `findAvailableWorkerForDate` tries preferred worker first, falls back to team mates
- [x] `subscription_matching.go`: scores worker consistency across 8 future weeks

---

## 5. Phase 3 — Admin Control Center

> Centralize all platform configuration in admin dashboard.

### P3-1: Unified Pricing Management ✅ COMPLETED

**Original plan:** Create a separate `service_pricing` table with per-region pricing.

**What was built instead:** Pricing is managed through `service_definitions` table with a full CRUD admin UI in the **"Servicii"** tab of admin SettingsPage. Each service definition has:
- `base_price_per_hour`, `min_hours`, `max_hours`
- Size-based multipliers, room pricing
- Included items configuration
- Active/inactive toggle

**Completed (migrations 000038–000042):**
- [x] Per-region/city pricing tiers — `pricing_multiplier` on `enabled_cities`, editable in admin Cities tab, applied in booking + estimate flows
- [x] Per-sqm pricing model — `pricing_model` enum (hourly/per_sqm) + `price_per_sqm` on `service_definitions`, branching logic in estimate + booking resolvers, admin UI with conditional fields
- [x] Price history audit log — `price_audit_log` table, `logPriceChange()` helper, "Jurnal Preturi" tab in admin with paginated/filtered view

---

### P3-2: Cancellation Policy Management ✅ COMPLETED

Fully covered in P2-2 above. Admin UI for all 4 policy keys exists in SettingsPage → "Anulare / Reprogramare" group.

---

### P3-3: Recurring Discount Management ✅ COMPLETED

Fully covered in P2-3 above. Admin UI for discount percentages per frequency exists in SettingsPage → "Reduceri abonamente" tab.

---

### P3-4: Commission Rate Configuration ✅ COMPLETED

**What exists:**
- [x] Global `platform_commission_pct` in `platform_settings` KV table (default 25%)
- [x] Admin UI: Editable in SettingsPage → "Business" group
- [x] Commission applied to Stripe Connect payments via `application_fee_percent`
- [x] Commission invoices auto-generated for subscriptions
- [x] Per-category commission rates — `service_categories` table with `commission_pct`, "Categorii" tab in admin with CRUD
- [x] Commission hierarchy: company override → category commission → platform default → 25% fallback

---

### P3-5: Platform Settings Consolidation ✅ COMPLETED

**What exists:** Admin SettingsPage has 8 tabs covering all settings:

| Tab | Contents | Status |
|-----|----------|--------|
| **Setari Generale** | Commission %, VAT %, booking hours, hourly rate, auto-cancel, approval, cancel/reschedule policies, contact info, legal URLs | ✅ Done |
| **Servicii** | Full CRUD for service definitions (pricing, duration, included items, pricing model, category) | ✅ Done |
| **Extra-uri** | Full CRUD for service extras (price, duration, allow-multiple) | ✅ Done |
| **Orase** | City + city area management with activate/deactivate + pricing multiplier | ✅ Done |
| **Categorii** | Service categories CRUD with per-category commission % | ✅ Done |
| **Reduceri abonamente** | Discount % per recurrence type (weekly/biweekly/monthly) | ✅ Done |
| **Jurnal Preturi** | Price audit log with pagination and entity type filter | ✅ Done |
| **Platforma** | Pre-release/live mode toggle + waitlist lead stats | ✅ Done |

- [x] VAT rate configuration — configurable via `vat_rate_pct` in platform_settings (migration 000038), cached in invoice service
- [ ] Settings cache with TTL refresh (currently reads from DB each time)

---

## 6. Phase 4 — Multi-Service Readiness

> Architectural changes to support services beyond cleaning.

### P4-1: Service Categories System ✅ COMPLETED

**Problem:** Currently hardcoded for cleaning (rooms, bathrooms, sqm). Must support any service.

**What's done (migrations 000041–000046):**
- [x] `service_categories` table: id, slug, name_ro, name_en, description, icon, image_url, commission_pct, sort_order, is_active
- [x] `category_id` FK on `service_definitions` — all existing services assigned to "curatenie" category
- [x] Full CRUD via GraphQL + admin "Categorii" tab
- [x] Per-category commission in booking commission hierarchy
- [x] Per-sqm pricing model — `pricing_model` enum (hourly/per_sqm) on `service_definitions` + `bookings`
- [x] Pricing engine branches on model: hourly vs per_sqm calculation
- [x] Admin UI: pricing model dropdown + conditional price/sqm field in Services tab
- [x] Dynamic booking form based on service type (P4-2)
- [x] Category-aware booking flow with category landing pages (`/servicii/:slug`)
- [x] Homepage redesigned as multi-service marketplace hub with category cards + "coming soon" placeholders
- [ ] `service_types` sub-table for more granular categorization (if needed post-MVP)

---

### P4-2: Dynamic Booking Form ✅ COMPLETED

**Problem:** Booking form has hardcoded cleaning fields (rooms, bathrooms, sqm).

**Implementation (migration 000046):**
- [x] `form_fields JSONB` on `service_categories` — defines which fields the booking form renders per category
- [x] `custom_fields JSONB` on `bookings` — stores dynamic field values for non-cleaning categories
- [x] Curatenie category seeded with existing form field definitions (propertyType, numRooms, numBathrooms, areaSqm, hasPets)
- [x] `DynamicFormFields` component — renders stepper, number, text, textarea, select, toggle, radio, file fields dynamically based on JSON definition
- [x] `BookingPage.tsx` branches on `isCleaning` — cleaning uses existing hardcoded JSX (zero regression), other categories use `DynamicFormFields`
- [x] Dynamic validation: all required fields must have truthy values before proceeding
- [x] `customFields` serialized as JSON in `CreateBookingInput` for non-cleaning bookings
- [x] Form field JSON schema supports: `showWhen` conditions, `surchargeLabel`, icons, min/max, defaultValue, options with labels in RO/EN
- [x] Admin "Categorii" tab: form fields JSON textarea in both create modal and inline edit row
- [x] All backend resolvers updated (convert.go, service.resolvers.go, booking.resolvers.go)
- [x] All 414 frontend tests pass, all Go tests pass, TypeScript clean

---

### P4-3: Worker Skill/Service Assignment ✅ COMPLETED

**Problem:** All workers are "cleaners." Need workers assigned to specific services.

**Already implemented in migration 000044 (Phase 4A multi-service work):**
- [x] `worker_service_categories` junction table with `worker_id`, `category_id`, UNIQUE constraint, proper indexes
- [x] `company_service_categories` junction table (same pattern for companies)
- [x] All existing workers/companies seeded to "curatenie" category
- [x] Company dashboard: WorkerDetailPage checkbox grid for assigning categories to workers
- [x] TeamPage: shows assigned categories as badge pills per worker
- [x] Scheduling engine: `FindMatchingWorkersByCategory` + `FindAvailableWorkersByCategory` queries filter by category
- [x] `assignWorkerToBooking` resolver validates `WorkerHasCategory` before assignment (booking.resolvers.go:398-414)
- [x] Worker profile: SettingsPage "Categoriile mele de servicii" read-only section with info note
- [x] Full GraphQL mutations: `updateWorkerServiceCategories`, `updateCompanyServiceCategories`

---

## 7. Phase 5 — Company & Worker Management ✅ ALL COMPLETED

### P5-1: Company Service Selection ✅ COMPLETED

~~**Problem:** Companies can't select which services they provide.~~

**What was done:**
- [x] `company_service_categories` junction table already existed (migration 000044)
- [x] Company onboarding: Added `categoryIds` to `CompanyApplicationInput` GraphQL schema
- [x] `ApplyAsCompany` resolver inserts selected categories (defaults to "curatenie" if none selected)
- [x] RegisterCompanyPage: category selection checkbox grid with `SERVICE_CATEGORIES` query
- [x] Company dashboard: manage active services already existed in SettingsPage
- [x] Platform matching: `FindMatchingWorkersByCategory` already JOINs company categories

---

### P5-2: Worker Schedule Management Improvements ✅ COMPLETED

**What was done:**
- [x] Full rewrite of worker SchedulePage (985 lines) with two-tab layout
- [x] Tab 1 "Program": Weekly calendar view with bookings, availability indicators, date override badges
- [x] Tab 2 "Disponibilitate": Weekly availability editor (7 rows with toggle + time pickers) + date override manager
- [x] Block time off: "Adauga zi libera" with date picker, start/end time, cancel/restore
- [x] Week navigation (forward/backward + "Azi" button)
- [x] Desktop 7-column grid + mobile list view (responsive)
- [x] Uses existing mutations: `UPDATE_AVAILABILITY`, `SET_WORKER_DATE_OVERRIDE`

**Note:** Company admin cross-company calendar already exists at `/firma/program`. Admin view deferred.

---

### P5-3: Company Dashboard — Reviews (Read-Only) ✅ COMPLETED

**What was done:**
- [x] Backend: `ListReviewsByCompanyWorkers` + `CountReviewsByCompanyWorkers` sqlc queries with rating filter
- [x] Backend: `companyWorkerReviews` GraphQL query + resolver with auth check + worker population
- [x] Frontend: `/firma/recenzii` page (338 lines) — KPI cards, rating filter, paginated table, detail modal
- [x] Route + sidebar link in CompanyLayout.tsx
- [x] Read-only (no delete action — companies can view but not manage reviews)

---

## 8. Phase 6 — Client Experience Polish ✅ ALL COMPLETED

### P6-1: Booking Flow UX Improvements ✅ COMPLETED

- [x] Progress indicator (step 1/N with icons and labels) — `StepIndicator` component in BookingPage
- [x] Clear price breakdown before confirmation (summary step + subscription pricing preview)
- [x] Guest booking flow preserved (no auth required to book)
- [x] Service category grouping in StepService — services grouped by category when multiple categories exist, flat grid for single category. Heading updated to "Alege serviciul"
- [x] Address autocomplete — Google Places API fully integrated (AddressAutocomplete component, Romanian-only, city matching)

---

### P6-2: Client Dashboard Enhancements ✅ COMPLETED

- [x] Recurring booking management (pause, resume, cancel, change frequency) — subscription detail page
- [x] Easy access to reschedule/cancel with policy info — booking detail page with `RescheduleModal`
- [x] Booking status timeline — 4-5 step visual stepper in BookingDetailPage (already existed)
- [x] "Contact support" — `/cont/ajutor` SupportPage with WhatsApp, email, phone, FAQ
- [x] Payment history — PaymentHistoryPage at `/cont/plati/istoric` (already existed)
- [x] Invoice download — InvoicesPage at `/cont/facturi` with B2B/B2C billing (already existed)

---

### P6-3: Review System Improvements ✅ COMPLETED

- [x] Rating categories: Punctualitate, Calitate, Comunicare, Raport calitate-pret (migration 000047, 4 new INT columns on reviews)
- [x] Photo upload with review — `review_photos` table, GCS upload, up to 3 photos per review
- [x] Review moderation by admin — `status` column (published/rejected), `approveReview`/`rejectReview` mutations, admin UI with status filter + moderation buttons
- [x] 4-category star rating form in BookingDetailPage (replaces simple 5-star picker)
- [x] Category ratings shown in admin + company review detail modals
- [ ] ~~Service-specific review prompts~~ — Skipped for MVP (only 1 category active)

---

## 9. Phase 7 — Admin Dashboard Enhancements ✅ COMPLETE

### P7-1: Demand Analytics ✅

- [x] Booking demand heatmap (day-of-week × hour, 7–21h) — `GetBookingDemandHeatmap` SQL, `bookingDemandHeatmap` GQL, `DemandHeatmap` component in ReportsPage with 6-level blue intensity + legend
- [ ] ~~Per-city booking demand trends~~ — Skipped for MVP
- [ ] ~~Unserved demand~~ — Skipped (requires new tracking infrastructure)
- [ ] ~~Worker utilization rate~~ — Skipped for MVP

### P7-2: Financial Reports ✅

- [x] CSV export for revenue reports — `exportToCSV` utility, "Exporta CSV" button in ReportsPage header
- [x] Per-company revenue breakdown — already existed (top companies table)
- [x] Per-service-type breakdown — already existed (bar chart)
- [ ] ~~PDF export~~ — Skipped (low ROI vs effort)
- [ ] ~~ANAF tax report~~ — Post-MVP

### P7-3: Company Performance Dashboard ✅

- [x] Company scorecards tab "Performanta" in CompaniesPage — `GetAllCompanyScorecards` + `GetCompanyAvgRating` SQL, `companyScorecards` GQL, 3-column card grid with completion/cancellation progress bars, rating badge, sort by Revenue/Rating/Completion
- [x] Flag underperforming companies — cancellation rate > 10% shown with ⚠ warning in red
- [ ] ~~Company comparison view~~ — Skipped for MVP
- [ ] ~~Auto-pause~~ — Post-MVP

### P7-4: Booking Management ✅

- [x] Advanced filters — date range, company dropdown, service type dropdown added to BookingsPage; `SearchBookingsWithDetails` SQL updated with optional filters via `sqlc.narg()`
- [x] Export booking data — "Exporta CSV" button exports currently filtered bookings
- [x] Booking timeline audit log — already existed in BookingDetailPage
- [ ] ~~Bulk actions~~ — Skipped for MVP

### Bonus: Dashboard Trends ✅

- [x] Month-over-month trend badges (↑/↓ %) on bookings, revenue, new clients metrics in DashboardPage
- [x] `GetPlatformStats` SQL extended with last-month counters

**What was done:** 5 new SQL queries, 3 new GQL types (`DemandSlot`, `CompanyScorecard`, extended `PlatformStats`), 3 new resolvers, `exportToCSV` utility, DemandHeatmap component, Performanta tab, advanced filters row, trend badges.

---

## 10. Phase 8 — Future (Deferred)

These items are explicitly deferred and should NOT be worked on now:

| Item | Reason |
|------|--------|
| **Notifications (email, push, in-app)** | Separate big task — will be its own project |
| **E-factura ANAF direct integration** | Using Factureaza.ro as intermediary for now |
| ~~**ANAF company verification API**~~ | ✅ **DONE** — Auto-verifies CUI on company application submission; admin sees ANAF card (name/address comparison, fiscal status, VAT status) in CompanyDetailPage with manual re-verify button. Shared `anaf` service package also powers the registration form lookup. |
| **In-app maps** | Not needed for MVP |
| **Advanced matching algorithm** | Simple availability-based matching sufficient |
| **Multi-payment methods** | Stripe card payments only for MVP |
| **Mobile apps (iOS/Android)** | Web responsive is sufficient for launch |
| **Multi-language beyond RO/EN** | Only Romanian market |
| **Referral system** | Post-launch growth feature |
| **Loyalty program** | Start with recurring discounts only |

---

## 11. Additional Work Completed

Work completed that was not part of the original plan:

### Dashboard KPI Standardization ✅

Unified the KPI card design across all portals (admin, company, worker). All dashboards and listing pages now use a consistent pattern:
- Single `<Card>` container with `Metric` components inside
- Gray `bg-gray-100` icon backgrounds, `divide-x` dividers between columns
- Consistent typography and spacing

**Pages updated:** `/admin`, `/admin/abonamente`, `/firma`, `/firma/plati`, `/firma/abonamente`, `/worker`

### Worker Dashboard Redesign ✅

Replaced the sparse 2-column layout with a richer single-column flow:
- **Onboarding checklist** ("Primii pasi") — progress bar + actionable checklist for new workers (profile, personality test, documents, availability)
- **Quick action cards** — 4 colorful icon cards in a horizontal grid (Comenzi, Program, Mesaje, Profil)
- **Compact empty states** — horizontal layout with helpful links instead of centered voids
- Removed the 2/3 + 1/3 grid that felt empty when no jobs/reviews exist

### Worker Suggestion Bug Fixes ✅

Two bugs fixed in the booking flow's worker suggestion system:
1. **One-time flow:** Workers without any available slots now return `nil` (excluded) instead of being shown as "Indisponibil"
2. **Subscription flow:** Default availability fallback (Mon-Fri 08:00-20:00) for workers with no availability records configured
3. Same default fallback applied to one-time flow in `location_helpers.go`

### Commission Invoice Wiring ✅

Platform commission invoices (`GenerateCommissionInvoice`) are now automatically generated during subscription billing:
- Wired into `HandleInvoicePaid` in subscription service
- Calculates commission from `MonthlyAmountBani * PlatformCommissionPct / 100`
- Generates platform → company invoice with VAT, syncs to Factureaza.ro

### i18n / Multilingual Support ✅

Full internationalization support added:
- **react-i18next** + i18next-http-backend + i18next-browser-languagedetector
- URL routing: RO = no prefix, EN = `/en/` prefix
- 9 namespaces × 2 languages = 18 JSON files in `public/locales/`
- SEOHead: hreflang tags, og:locale, canonical URLs per language

### Homepage Multi-Service Redesign ✅

Transformed the homepage from a cleaning-only layout to a multi-service marketplace hub:
- Categories section fetches live `SERVICE_CATEGORIES` from API instead of hardcoded services
- Active categories link to `/servicii/:slug` landing pages
- Coming-soon categories (dezinfectare, instalatii sanitare, electrician) shown as placeholders with "In curand" badges
- Updated i18n strings (RO + EN) to be marketplace-generic instead of cleaning-specific
- All 16 homepage tests updated and passing

### Codebase Audit & Cleanup ✅

Post-Phase-7 audit identified and fixed several issues:
- **AdminPayoutsPage + RefundsPage wired:** Both pages existed but had no routes or nav links. Added `/admin/viramente` (Viramente) and `/admin/rambursari` (Rambursari) to both App.tsx routing and AdminLayout nav
- **Orphaned files deleted:** `worker/CalendarPage.tsx` (superseded by SchedulePage), `worker/TodayPage.tsx` (unrouted), `ServicesPage.tsx` (route redirected to homepage) — plus their associated tests
- **React ErrorBoundary added:** `components/ErrorBoundary.tsx` class component wraps `AppRoutes` — prevents blank white screen on runtime render crashes; shows Romanian error UI with reload button
- **SEOHead on BookingPage:** Added `<SEOHead>` with title, description, and `noIndex` (booking is a transactional page, should not be indexed)

### Admin Subscription Detail Page ✅

Full admin subscription detail page at `/admin/abonamente/:id`:
- Subscription info, client/company/worker details
- Financial summary (per-session, monthly, commission)
- Booking history table
- Admin actions: pause, resume, force-cancel

---

## 12. Task Summary

### Priority Matrix

| Phase | Tasks | Status | Remaining |
|-------|-------|--------|-----------|
| **Phase 0** — Critical Bugs | 4 tasks | ✅ ALL DONE | — |
| **Phase 1** — Platform Corrections | 4 tasks | ✅ ALL N/A | — |
| **Phase 2** — Smart Booking | 4 tasks | ✅ ALL DONE | — |
| **Phase 3** — Admin Controls | 5 tasks | ✅ ALL DONE | — |
| **Phase 4** — Multi-Service | 3 tasks | ✅ ALL DONE | — |
| **Phase 5** — Company Mgmt | 3 tasks | ✅ ALL DONE | — |
| **Phase 6** — Client Polish | 3 tasks | ✅ ALL DONE | — |
| **Phase 7** — Admin Analytics | 4 tasks | ✅ ALL DONE | — |

**All phases complete. Platform is investor-demo ready.**

### Key Dependencies

```
Phase 0 (P0-3 worker rename) → Phase 4 (multi-service)  ✅ DONE
Phase 1 (P1-3 remove company pricing) → Phase 3 (P3-1 admin pricing)  ✅ N/A
Phase 4 (P4-1 service categories) → Phase 5 (P5-1 company service selection)  ✅ DONE
Phase 4 (P4-1 service categories) → Phase 6 (P6-1 service category selection in booking)  ✅ DONE
```

---

## Technical Notes

### Database Migration Strategy
All schema changes should be backward-compatible migrations with both up and down scripts. The worker rename (P0-3) is the largest migration and was done first to unblock multi-service work. Current latest migration: **000047** (review enhancements: rating categories, status column, review photos).

### Testing Requirements
- Every new feature needs unit tests (backend Go + frontend Vitest)
- Current coverage: ~480 tests (66 Go + 414 frontend) — all passing after Phase 7
- Latest migration: **000047** (review enhancements: rating categories, status, photos)
- Target: Maintain 100% pass rate on all existing tests after each phase

### Deployment
- Backend: Vercel serverless Go (entrypoint: `backend/api/index.go`)
- Frontend: Vercel (auto-deploy from `web/packages/client-web`)
- Database: Neon PostgreSQL (apply migrations before deploying code)

### Code Standards
- Romanian UI text throughout (primary language), English as secondary
- English code and comments
- Follow existing patterns (gqlgen resolvers, sqlc queries, React + Apollo hooks)
- No over-engineering — MVP mindset with clean architecture
