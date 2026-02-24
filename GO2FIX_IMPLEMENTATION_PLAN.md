# Go2Fix.ro — Implementation Plan

**Date:** 2026-02-23
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
11. [Task Summary](#11-task-summary)

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

## 2. Phase 0 — Critical Bugs & Technical Debt (COMPLETED)

> ~~Fix immediately. These are production-impacting bugs.~~ ALL DONE

### P0-2: HMC- Prefix → G2F- Prefix (COMPLETED)

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

**Effort:** 4-6 hours (large but straightforward rename)

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

**Effort:** 3-4 hours

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

**Effort:** 1 hour

---

## 3. Phase 1 — Core Platform Corrections

> Remove/modify features that don't align with business model.
---

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

## 4. Phase 2 — Smart Booking Features

> Key differentiators for the platform.

### P2-1: Smart Time Suggestion During Booking

**Problem:** When no workers are available for selected time, booking just fails. Should suggest alternatives.

**Implementation:**
- [ ] Backend: Create `suggestAlternativeSlots` query
  - Input: service type, date, preferred time range, location/zone
  - Logic: Find nearest available slots from all qualified workers in the area
  - Return: Up to 3 alternative time slots with availability
- [ ] Frontend: When "no availability" is returned during booking:
  - Show friendly message: "Ne pare rau, nu avem disponibilitate pentru intervalul ales"
  - Display suggested alternatives: "Ce parere ai daca venim in intervalul X-Y?"
  - Each suggestion is clickable → selects that slot
  - "Alege alt interval" button to try different date
- [ ] Admin: Dashboard shows demand heatmap (which time slots are most requested but unavailable) — helps with capacity planning

**Effort:** 6-8 hours

---

### P2-2: Booking Reschedule with Configurable Rules

**Problem:** No reschedule/cancel flow with appropriate fee/refund logic.

**Implementation:**

**Backend — Cancellation policy engine:**
- [ ] Create `cancellation_policies` table:
  ```
  id, name, hours_before_start, action (FULL_REFUND | PARTIAL_REFUND | FEE | NO_REFUND),
  refund_percentage, fee_amount_cents, is_active, created_at, updated_at
  ```
- [ ] Default policies (admin-configurable):
  - 48+ hours before: Full refund (100%)
  - 24-48 hours before: Partial refund (50%)
  - Less than 24 hours: No refund
  - Reschedule within 24h: Charge reschedule fee
- [ ] Create `rescheduleBooking` mutation:
  - Calculate applicable policy based on time until scheduled start
  - Apply refund or charge fee via Stripe
  - Generate appropriate invoice/credit note
  - Move booking to new date/time (check worker availability)
- [ ] Create `cancelBooking` mutation (client-initiated):
  - Same policy engine
  - Process refund if applicable
  - Free up worker's schedule slot

**Frontend — Client flow:**
- [ ] Add "Reprogrameaza" and "Anuleaza" buttons on booking detail page
- [ ] Reschedule: Show calendar with available slots + policy info ("Reprogramarea in mai putin de 24h implica o taxa de X lei")
- [ ] Cancel: Show refund info based on policy ("Vei primi o rambursare de X% din valoarea rezervarii")
- [ ] Confirmation step before processing

**Frontend — Admin configuration:**
- [ ] New "Politici anulare" section in admin settings
- [ ] CRUD for cancellation policies
- [ ] Preview: Show what happens at each time threshold

**Effort:** 8-10 hours

---

### P2-3: Recurring Booking Discounts

**Problem:** Recurring bookings are the most valuable clients but get no incentive.

**Implementation:**

**Backend:**
- [ ] Create `recurring_discounts` table:
  ```
  id, frequency (WEEKLY | BIWEEKLY | MONTHLY), discount_percentage,
  min_bookings_for_discount, is_active, created_at, updated_at
  ```
- [ ] Default discounts (admin-configurable):
  - Weekly: 15% discount
  - Bi-weekly: 10% discount
  - Monthly: 5% discount
- [ ] Apply discount during booking price calculation
- [ ] Show discount on invoice line items
- [ ] Track recurring booking loyalty (number of completed recurring bookings)

**Frontend — Booking flow:**
- [ ] When selecting recurring: Show discount badge ("Economisesti 15% cu curatenia saptamanala!")
- [ ] Price breakdown shows original price, discount, final price
- [ ] Highlight recurring option as "Recomandat" in booking flow

**Frontend — Admin:**
- [ ] "Discount-uri recurente" section in admin settings
- [ ] Edit discount percentages per frequency
- [ ] Toggle discounts on/off
- [ ] Report: Revenue impact of discounts

**Effort:** 5-6 hours

---

### P2-4: Request Same Worker for Recurring

**Problem:** No way to request the same worker for recurring bookings.

**Implementation:**
- [ ] Add `preferred_worker_id` field to recurring bookings
- [ ] During recurring booking setup: "Doresti acelasi lucrator de fiecare data?" toggle
- [ ] Scheduling engine: Try to assign preferred worker first, fall back to any available
- [ ] If preferred worker unavailable: Notify admin (not client — per no-notifications rule, admin sees in dashboard)
- [ ] Client can request worker change from booking detail page ("Solicita alt lucrator")

**Effort:** 3-4 hours

---

## 5. Phase 3 — Admin Control Center

> Centralize all platform configuration in admin dashboard.

### P3-1: Unified Pricing Management

**Implementation:**
- [ ] Create `service_pricing` table:
  ```
  id, service_type_id, city/region, base_price_cents, price_per_hour_cents,
  price_per_sqm_cents, min_price_cents, is_active, created_at, updated_at
  ```
- [ ] Admin page: "Preturi servicii" — set prices per service type per region
- [ ] Support different pricing models per service type:
  - Per hour (cleaning)
  - Per unit/job (plumbing fix)
  - Per sqm (painting)
- [ ] Price history log for audit trail

**Effort:** 4-5 hours

---

### P3-2: Cancellation Policy Management

(Covered in P2-2 above — admin UI for cancellation/refund rules)

---

### P3-3: Recurring Discount Management

(Covered in P2-3 above — admin UI for discount configuration)

---

### P3-4: Commission Rate Configuration

**Implementation:**
- [ ] Move commission rate from hardcoded to admin-configurable
- [ ] Support per-service-type commission rates
- [ ] Support per-company override rates (for special partnerships)
- [ ] Admin UI: "Comisioane" settings page

**Effort:** 2-3 hours

---

### P3-5: Platform Settings Consolidation

**Implementation:**
- [ ] Consolidate all platform settings into a single admin "Setari platforma" page:
  - Platform mode (pre-release / live)
  - VAT rate (default 19%, configurable)
  - Default commission rate
  - Cancellation policies
  - Recurring discounts
  - Supported cities/regions
  - Service categories (enable/disable)
- [ ] Settings stored in `platform_settings` KV table (already exists)
- [ ] Cache settings in memory with TTL refresh

**Effort:** 3-4 hours

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

**Effort:** 4-5 hours

---

### P5-3: Company Dashboard — Reviews (Read-Only)

**Implementation:**
- [ ] Companies see all reviews for their workers
- [ ] Aggregate rating per worker, per service type
- [ ] NO reply/interact functionality (all goes through admin)
- [ ] Flag review option → sends to admin for review

**Effort:** 2-3 hours

---

## 8. Phase 6 — Client Experience Polish

### P6-1: Booking Flow UX Improvements

- [ ] Progress indicator (step 1/4, 2/4, etc.)
- [ ] Service category selection as first step
- [ ] Address autocomplete for Romanian addresses
- [ ] Clear price breakdown before confirmation
- [ ] Guest booking flow preserved (no auth required to book)

**Effort:** 3-4 hours

---

### P6-2: Client Dashboard Enhancements

- [ ] Better booking status tracking (timeline view)
- [ ] Easy access to reschedule/cancel with policy info
- [ ] Recurring booking management (pause, resume, change frequency)
- [ ] "Contact support" prominent button
- [ ] Payment history with download invoice option

**Effort:** 3-4 hours

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

## 11. Task Summary

### Priority Matrix

| Phase | Tasks | Est. Hours | Priority |
|-------|-------|-----------|----------|
| **Phase 0** — Critical Bugs | 5 tasks | 10-12h | DO FIRST |
| **Phase 1** — Platform Corrections | 5 tasks | 9-13h | DO FIRST |
| **Phase 2** — Smart Booking | 4 tasks | 22-28h | HIGH |
| **Phase 3** — Admin Controls | 5 tasks | 13-17h | HIGH |
| **Phase 4** — Multi-Service | 3 tasks | 17-22h | MEDIUM |
| **Phase 5** — Company Mgmt | 3 tasks | 9-12h | MEDIUM |
| **Phase 6** — Client Polish | 3 tasks | 9-12h | MEDIUM |
| **Phase 7** — Admin Analytics | 4 tasks | 12-16h | LOW |

**Total estimated effort: ~105-137 hours**

### Recommended Execution Order

```
Week 1:  Phase 0 (bugs) + Phase 1 (corrections)     → Foundation clean
Week 2:  Phase 2 (smart booking)                      → Key differentiators
Week 3:  Phase 3 (admin controls) + Phase 4 start     → Admin power
Week 4:  Phase 4 (multi-service) + Phase 5             → Scalability
Week 5:  Phase 6 (client polish) + Phase 7             → Polish & analytics
```

### Key Dependencies

```
Phase 0 (P0-3 worker rename) → Phase 4 (multi-service)
Phase 1 (P1-3 remove company pricing) → Phase 3 (P3-1 admin pricing)
Phase 4 (P4-1 service categories) → Phase 5 (P5-1 company service selection)
Phase 4 (P4-1 service categories) → Phase 2 (P2-1 smart time suggestion)
```

---

## Technical Notes

### Database Migration Strategy
All schema changes should be backward-compatible migrations with both up and down scripts. The worker rename (P0-3) is the largest migration and should be done first to unblock multi-service work.

### Testing Requirements
- Every new feature needs unit tests (backend Go + frontend Vitest)
- Current coverage: ~628 tests (66 Go + 397+ frontend)
- Target: Maintain 100% pass rate on all existing tests after each phase

### Deployment
- Backend: Vercel serverless Go (entrypoint: `backend/api/index.go`)
- Frontend: Vercel (auto-deploy from `web/packages/client-web`)
- Database: Neon PostgreSQL (apply migrations before deploying code)

### Code Standards
- Romanian UI text throughout (primary language)
- English code and comments
- Follow existing patterns (gqlgen resolvers, sqlc queries, React + Apollo hooks)
- No over-engineering — MVP mindset with clean architecture
