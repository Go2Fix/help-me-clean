# Go2Fix.ro - AI Development Guide

## Project Overview

**Go2Fix.ro** is Romania's first home services marketplace MVP. Starting with cleaning, expanding to all home services.

- **Purpose:** Production launch — heading to live release
- **Core Value:** Formalize Romania's informal services sector through compliance
- **Architecture:** Go monolith backend + React web platform (client, company, admin) + iOS native app
- **Domains:** go2fix.ro (web), api.go2fix.ro (API), dev.go2fix.ro (staging), dev.api.go2fix.ro (staging API)

## Technology Stack

| Component | Technology | Port/Notes |
|-----------|-----------|------------|
| Backend | Go 1.24+, gqlgen, sqlc, PostgreSQL (Neon) | :8080 |
| Web Platform | React + TypeScript + Shadcn/ui | :3000 |
| Client iOS | SwiftUI native + Apollo iOS | - |

---

## Agent Assignments

Use specialized agents for different parts of the codebase:

### Backend Development
- **Agent:** `voltagent-lang:golang-pro`
- **Use for:** All `backend/` directory work
- **Responsibilities:** GraphQL resolvers, business logic, database queries, auth, WebSocket

### Web Platform
- **Agent:** `voltagent-lang:typescript-pro`
- **Use for:** All `web/` directory work
- **Responsibilities:** React components, Apollo Client, Shadcn/ui integration, TailwindCSS, routing (/, /firma, /admin)

### iOS Native App
- **Agent:** `voltagent-lang:swift-expert`
- **Use for:** All `ios/` directory work
- **Responsibilities:** SwiftUI views, Apollo iOS, Liquid Glass design, native iOS features

### Database & Migrations
- **Agent:** `voltagent-lang:golang-pro` or `voltagent-lang:sql-pro`
- **Use for:** SQL migrations, sqlc queries
- **Responsibilities:** Schema design, query optimization, indexes

---

## Code Conventions

### General Rules

1. **Language:** Code and comments in English, UI strings in Romanian (primary) + English
2. **Formatting:** Use language-native formatters (gofmt, prettier, swift-format)
3. **Naming:**
   - Go: PascalCase for exports, camelCase for internal
   - TypeScript/JavaScript: camelCase for variables/functions, PascalCase for components/classes
   - Swift: camelCase for properties/methods, PascalCase for types
4. **Error Handling:** Always handle errors explicitly, never silently ignore
5. **Type Safety:** Leverage type systems (Go generics, TypeScript strict mode, Swift strong typing)

### Backend (Go)

- Use `context.Context` everywhere for cancellation
- Return `error` explicitly, never panic in production code
- Use `sqlc` for all database queries (type-safe)
- Follow [Effective Go](https://go.dev/doc/effective_go)
- Keep packages focused and cohesive
- Package structure: `internal/<domain>/<file>.go`

### Web (React + TypeScript)

- **Always** use Shadcn/ui components, never custom CSS files
- TailwindCSS for all styling
- Functional components with TypeScript interfaces
- Use Apollo Client hooks for data fetching
- Keep components small and focused (< 200 lines)
- Component structure: `src/features/<domain>/<Component>.tsx`

### iOS (SwiftUI)

- Use iOS 16+ Liquid Glass material effects
- SwiftUI declarative syntax
- Apollo GraphQL iOS for data fetching
- Follow Apple Human Interface Guidelines
- View structure: `Features/<Domain>/<View>.swift`

---

## Design System

### Colors

| Name | Hex | Tailwind | Use |
|------|-----|----------|-----|
| Primary | #2563EB | blue-600 | Trust, reliability, CTAs |
| Secondary | #10B981 | emerald-500 | Freshness, success states |
| Accent | #F59E0B | amber-500 | Ratings, highlights |
| Danger | #EF4444 | red-500 | Errors, cancellations |
| Background | #FAFBFC | - | Clean, bright base |
| Text Primary | #111827 | gray-900 | Main text |
| Text Secondary | #6B7280 | gray-500 | Supporting text |

### Typography

- **Web:** Inter font family
- **iOS:** SF Pro (system default)

### Spacing & Radius

- Base spacing: 4px scale → [4, 8, 12, 16, 20, 24, 32, 48, 64]
- Use Tailwind classes: `p-4`, `m-8`, `gap-6`
- Standard border radius: `12px` (rounded-xl)

---

## GraphQL Schema Guidelines

**Location:** `backend/internal/graph/schema/`

- Types: PascalCase (`Booking`, `User`)
- Fields: camelCase (`firstName`, `scheduledDate`)
- Mutations: verb + noun (`createBooking`, `assignCleaner`)
- Queries: noun or get + noun (`booking`, `myBookings`)
- Split schemas by domain (one file per domain)

---

## Database Conventions

**Location:** `backend/internal/db/`

### Migrations
- Format: `NNNNNN_description.up.sql` / `.down.sql`
- Always include both up and down
- Use parameterized queries ($1, $2)

### sqlc Queries
- Location: `backend/internal/db/queries/<domain>.sql`
- One file per domain/table
- Use descriptive names with return types (`:one`, `:many`, `:exec`)

---

## Development Commands

### Backend
```bash
cd backend
make install       # Install dependencies
make generate      # Generate sqlc + gqlgen code
make migrate-up    # Run migrations
make run           # Start server on :8080
make test          # Run tests
```

### Web
```bash
cd web
npm install
npm run dev              # Web platform (:3000)
npm run build            # Build production
npm run lint             # ESLint
npm run type-check       # TypeScript check
```

### Database
```bash
docker-compose up -d postgres   # Start PostgreSQL
cd backend && make migrate-up   # Apply migrations
```

---

## Git Workflow

### Commit Messages

Format: `<type>(<scope>): <subject>`

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`

Examples:
```
feat(booking): add guest booking flow
fix(auth): handle expired JWT tokens
refactor(db): migrate to sqlc from raw SQL
```

---

## Environment Variables

Each service has a `.env.example` file. Copy to `.env` and fill in values:

- `backend/.env.example` - Server, DB, auth, Stripe, storage
- `web/packages/client-web/.env.example` - GraphQL endpoint, Google client ID

---

## MVP Scope

**IN SCOPE:**
- Guest booking flow (no auth required)
- Google OAuth authentication
- Company application & approval
- Cleaner invitation & management
- Job lifecycle (create → assign → start → complete → review)
- Real-time chat (client ↔ cleaner)
- Push notifications (basic)
- Admin dashboard with basic stats

**OUT OF SCOPE (Post-MVP):**
- E-factura integration
- ANAF API company verification
- Advanced matching algorithm
- In-app maps
- Rich analytics/reporting
- Multi-payment methods
- Automated invoicing
- Additional service categories (plumbing, electrical, etc.)

---

## Final Notes

1. **Always check existing code** before creating new files
2. **Follow the monorepo structure** exactly as specified
3. **Use the assigned voltagent** for each technology domain
4. **Test locally** before marking tasks complete
5. **Ask for clarification** if requirements are ambiguous
6. **Keep it simple** - ship working code, avoid over-engineering

Polished design and smooth UX are paramount — this is heading to live users.
