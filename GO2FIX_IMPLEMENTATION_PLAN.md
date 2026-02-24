# Go2Fix.ro — Implementation Plan

**Date:** 2026-02-23 (last updated: 2026-02-24)
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

### P2-4: Request Same Worker for Recurring — PARTIALLY DONE

**Problem:** No way to request the same worker for recurring bookings.

**What exists:**
- [x] `preferred_worker_id` field exists in DB (`recurring_booking_groups` table, migration 000032)
- [x] `preferredWorkerId` field in GraphQL schema (`booking.graphql` + `subscription.graphql`)
- [x] Subscription matching engine (`subscription_matching.go`) scores worker consistency

**Effort:** 2-3 hours (backend schema ready, mostly frontend + scheduling logic)

---

## 5. Phase 3 — Admin Control Center

> Centralize all platform configuration in admin dashboard.

### P3-1: Unified Pricing Management — REDESIGNED

**Original plan:** Create a separate `service_pricing` table with per-region pricing.

**What was built instead:** Pricing is managed through `service_definitions` table with a full CRUD admin UI in the **"Servicii"** tab of admin SettingsPage. Each service definition has:
- `base_price_per_hour`, `min_hours`, `max_hours`
- Size-based multipliers, room pricing
- Included items configuration
- Active/inactive toggle

**Remaining:**
- [ ] Per-region/city pricing tiers (currently uniform pricing nationwide)
- [ ] Per-sqm pricing model for non-cleaning services
- [ ] Price history audit log

**Effort:** 3-4 hours (for regional pricing tiers)

---

### P3-2: Cancellation Policy Management ✅ COMPLETED

Fully covered in P2-2 above. Admin UI for all 4 policy keys exists in SettingsPage → "Anulare / Reprogramare" group.

---

### P3-3: Recurring Discount Management ✅ COMPLETED

Fully covered in P2-3 above. Admin UI for discount percentages per frequency exists in SettingsPage → "Reduceri abonamente" tab.

---

### P3-4: Commission Rate Configuration — PARTIALLY DONE

**What exists:**
- [x] Global `platform_commission_pct` in `platform_settings` KV table (default 25%)
- [x] Admin UI: Editable in SettingsPage → "Business" group
- [x] Commission applied to Stripe Connect payments via `application_fee_percent`
- [x] Commission invoices auto-generated for subscriptions

**What's missing:**
- [ ] Per-service-type commission rates
- [ ] Per-company override rates (for special partnerships)

**Effort:** 2-3 hours

---

### P3-5: Platform Settings Consolidation — MOSTLY DONE

**What exists:** Admin SettingsPage has 6 tabs covering most settings:

| Tab | Contents | Status |
|-----|----------|--------|
| **Setari Generale** | Commission %, booking hours, hourly rate, auto-cancel, approval, cancel/reschedule policies, contact info, legal URLs | ✅ Done |
| **Servicii** | Full CRUD for service definitions (pricing, duration, included items) | ✅ Done |
| **Extra-uri** | Full CRUD for service extras (price, duration, allow-multiple) | ✅ Done |
| **Orase** | City + city area management with activate/deactivate | ✅ Done |
| **Reduceri abonamente** | Discount % per recurrence type (weekly/biweekly/monthly) | ✅ Done |
| **Platforma** | Pre-release/live mode toggle + waitlist lead stats | ✅ Done |

**What's missing:**
- [ ] VAT rate configuration (hardcoded at 21%)
- [ ] Settings cache with TTL refresh (currently reads from DB each time)

**Effort:** 1-2 hours

---

## 6. Phase 4 — Multi-Service Readiness

> Architectural changes to support services beyond cleaning.

### P4-1: Service Categories System

**Problem:** Currently hardcoded for cleaning (rooms, bathrooms, sqm). Must support any service.

**Implementation:**
- [ ] Create `service_categories` table:
  ```
  id, name, slug, description, icon, pricing_model (HOURLY | PER_UNIT | PER_SQM | FIXED),
  is_active, sort_order, created_at
  ```
- [ ] Create `service_types` table:
  ```
  id, category_id, name, slug, description,
  base_duration_minutes, pricing_fields (JSONB — defines what inputs are needed),
  is_active, sort_order
  ```
- [ ] Seed initial data:
  - Category: "Curatenie" → Types: "Curatenie generala", "Curatenie dupa renovare", "Curatenie birouri"
  - Ready for: "Instalatii", "Electrician", "Zugravit", etc.
- [ ] Update booking flow to be category-aware
- [ ] Update pricing engine to use category pricing model

**Effort:** 8-10 hours

---

### P4-2: Dynamic Booking Form

**Problem:** Booking form has hardcoded cleaning fields (rooms, bathrooms, sqm).

**Implementation:**
- [ ] Booking form reads `pricing_fields` from service type
- [ ] Render dynamic form fields based on service type:
  - Cleaning: rooms, bathrooms, sqm, extras (oven, fridge, etc.)
  - Plumbing: issue description, photo upload, urgency level
  - Painting: sqm, number of rooms, ceiling (yes/no)
- [ ] Price calculation adapts to service type pricing model
- [ ] Validation rules per service type

**Effort:** 6-8 hours

---

### P4-3: Worker Skill/Service Assignment

**Problem:** All workers are "cleaners." Need workers assigned to specific services.

**Implementation:**
- [ ] Create `worker_services` junction table:
  ```
  worker_id, service_type_id, is_primary, years_experience, created_at
  ```
- [ ] Company dashboard: Assign workers to services they can perform
- [ ] Scheduling engine: Only assign workers qualified for the booked service
- [ ] Worker profile (internal): Shows all services they perform

**Effort:** 3-4 hours

---

## 7. Phase 5 — Company & Worker Management

### P5-1: Company Service Selection

**Problem:** Companies can't select which services they provide.

**Implementation:**
- [ ] Create `company_services` junction table:
  ```
  company_id, service_type_id, is_active, created_at
  ```
- [ ] Company onboarding: Select services during registration
- [ ] Company dashboard: Manage active services
- [ ] Admin approval: Admin reviews and approves company for each service type
- [ ] Platform matching: Only route bookings to companies that provide that service

**Effort:** 3-4 hours

---

### P5-2: Worker Schedule Management Improvements

**Implementation:**
- [ ] Weekly view with drag-to-set availability
- [ ] Block time off (holidays, sick days)
- [ ] Auto-detect scheduling conflicts
- [ ] Company admin view: See all workers' schedules at once
- [ ] Admin view: See all workers across all companies

**Note:** Basic schedule page exists at `/worker/program` and `/firma/program`. Improvements are about UX polish and advanced features.

**Effort:** 4-5 hours

---

### P5-3: Company Dashboard — Reviews (Read-Only)

**Implementation:**
- [ ] Companies see all reviews for their workers (no `/firma/recenzii` page exists yet)
- [ ] Aggregate rating per worker, per service type
- [ ] NO reply/interact functionality (all goes through admin)
- [ ] Flag review option → sends to admin for review

**Note:** Admin reviews page exists at `/admin/recenzii`. Company-facing reviews page needs to be built.

**Effort:** 2-3 hours

---

## 8. Phase 6 — Client Experience Polish

### P6-1: Booking Flow UX Improvements — PARTIALLY DONE

- [x] Progress indicator (step 1/N with icons and labels) — `StepIndicator` component in BookingPage
- [x] Clear price breakdown before confirmation (summary step + subscription pricing preview)
- [x] Guest booking flow preserved (no auth required to book)
- [ ] Service category selection as first step (depends on P4-1)
- [ ] Address autocomplete for Romanian addresses

**Effort:** 2-3 hours (remaining items)

---

### P6-2: Client Dashboard Enhancements — PARTIALLY DONE

- [x] Recurring booking management (pause, resume, cancel, change frequency) — subscription detail page
- [x] Easy access to reschedule/cancel with policy info — booking detail page with `RescheduleModal`
- [ ] Better booking status tracking (timeline view)
- [ ] "Contact support" prominent button
- [ ] Payment history with download invoice option

**Effort:** 2-3 hours (remaining items)

---

### P6-3: Review System Improvements

- [ ] Rating categories: Punctualitate, Calitate, Comunicare, Raport calitate-pret
- [ ] Photo upload with review (before/after)
- [ ] Review moderation by admin before publishing
- [ ] Service-specific review prompts

**Effort:** 3-4 hours

---

## 9. Phase 7 — Admin Dashboard Enhancements

### P7-1: Demand & Capacity Analytics

- [ ] Heat map: Most requested time slots vs available capacity
- [ ] Per-city booking demand trends
- [ ] Unserved demand (bookings abandoned due to no availability)
- [ ] Worker utilization rate per company

**Effort:** 4-5 hours

---

### P7-2: Financial Reports Enhancement

- [ ] Monthly P&L report (revenue, commission, payouts, refunds)
- [ ] Per-company revenue breakdown
- [ ] Per-service-type revenue breakdown
- [ ] Export to PDF/CSV
- [ ] Tax report for ANAF compliance

**Effort:** 3-4 hours

---

### P7-3: Company Performance Dashboard

- [ ] Company scorecard: Rating, completion rate, punctuality, cancellation rate
- [ ] Flag underperforming companies
- [ ] Company comparison view
- [ ] Auto-pause company if rating drops below threshold (configurable)

**Effort:** 3-4 hours

---

### P7-4: Booking Management Improvements

- [ ] Bulk actions (assign, cancel, reschedule)
- [ ] Advanced filters (date range, status, company, service type, city)
- [ ] Export booking data
- [ ] Booking timeline audit log

**Effort:** 2-3 hours

---

## 10. Phase 8 — Future (Deferred)

These items are explicitly deferred and should NOT be worked on now:

| Item | Reason |
|------|--------|
| **Notifications (email, push, in-app)** | Separate big task — will be its own project |
| **E-factura ANAF direct integration** | Using Factureaza.ro as intermediary for now |
| **ANAF company verification API** | Manual verification by admin sufficient for MVP |
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
| **Phase 2** — Smart Booking | 4 tasks | 3/4 done | P2-4 UI (2-3h) |
| **Phase 3** — Admin Controls | 5 tasks | 3/5 done | P3-1 partial (3-4h), P3-4 partial (2-3h), P3-5 near-done (1-2h) |
| **Phase 4** — Multi-Service | 3 tasks | NOT STARTED | 17-22h |
| **Phase 5** — Company Mgmt | 3 tasks | NOT STARTED | 9-12h |
| **Phase 6** — Client Polish | 3 tasks | 2/3 partially done | ~7-10h remaining |
| **Phase 7** — Admin Analytics | 4 tasks | NOT STARTED | 12-16h |

**Completed:** ~60-70% of Phase 0-3 (core platform). ~20% of Phase 4-7.

**Remaining estimated effort: ~55-75 hours**

### Recommended Next Steps

```
1. P2-4: Preferred worker UI toggle in booking flow        (2-3h)
2. P3-5: VAT config + settings cache                       (1-2h)
3. P3-4: Per-company commission overrides                   (2-3h)
4. P6-2: Remaining client dashboard items                   (2-3h)
5. Phase 4: Multi-service architecture (biggest remaining)  (17-22h)
```

### Key Dependencies

```
Phase 0 (P0-3 worker rename) → Phase 4 (multi-service)  ✅ DONE
Phase 1 (P1-3 remove company pricing) → Phase 3 (P3-1 admin pricing)  ✅ N/A
Phase 4 (P4-1 service categories) → Phase 5 (P5-1 company service selection)
Phase 4 (P4-1 service categories) → Phase 6 (P6-1 service category selection in booking)
```

---

## Technical Notes

### Database Migration Strategy
All schema changes should be backward-compatible migrations with both up and down scripts. The worker rename (P0-3) is the largest migration and was done first to unblock multi-service work. Current latest migration: **000035**.

### Testing Requirements
- Every new feature needs unit tests (backend Go + frontend Vitest)
- Current coverage: ~628 tests (66 Go + 397+ frontend)
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
