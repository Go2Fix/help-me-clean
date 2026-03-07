# Go2Fix.ro

Romania's first home services marketplace — heading to live release. Formalizes the informal services sector through compliance, trust, and technology. Starting with cleaning, expanding to all home services.

## Domain Structure

| Purpose | URL |
|---------|-----|
| Website | go2fix.ro |
| Dev website | dev.go2fix.ro |
| API | api.go2fix.ro |
| Dev API | dev.api.go2fix.ro |

## Architecture

| Component | Technology | Port |
|-----------|-----------|------|
| Backend | Go 1.24, gqlgen, sqlc, PostgreSQL 16 | :8080 |
| Client Web | React 19, Vite 6, Shadcn/ui, TailwindCSS v4 | :3000 |
| Client iOS | SwiftUI, Apollo iOS, Liquid Glass (iOS 16+) | Xcode |

All frontends communicate with the backend via **GraphQL** (Apollo Client).

## Project Structure

```
help-me-clean/
├── backend/                # Go monolith
│   ├── cmd/server/         # Entry point
│   └── internal/
│       ├── auth/           # JWT + Google OAuth
│       ├── db/             # Migrations, sqlc queries, seeds
│       ├── graph/          # GraphQL schema (24 domains) + resolvers
│       ├── middleware/      # CORS, logging
│       ├── service/        # Business logic (9 services)
│       └── storage/        # File uploads
├── web/                    # Turborepo monorepo
│   └── packages/
│       ├── client-web/     # Client booking app (:3000)
│       └── shared/         # Shared GraphQL, types, utils
└── docker-compose.yml      # PostgreSQL 16
```

## Quick Start

### Prerequisites

- Go 1.24+
- Node.js 20+ / npm 11+
- PostgreSQL 16 (or Docker)
- Xcode 16+ (for iOS development)

### 1. Clone & Install

```bash
git clone https://github.com/Go2Fix/help-me-clean.git
cd help-me-clean

# Backend
cd backend
make install
cp .env.example .env
# Edit .env with your credentials

# Web
cd ../web
npm install

```

### 2. Database Setup

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Run migrations (applies to both DATABASE_URL and DATABASE_URL_2)
cd backend
make migrate-up
```

### 3. Generate Code

```bash
cd backend
make generate    # Generates gqlgen code (run sqlc separately if schema changed)
```

### 4. Start Development

```bash
# Terminal 1: Backend
cd backend
make run

# Terminal 2: Web
cd web
npm run dev

```

### 5. Access Apps

- **GraphQL Playground:** http://localhost:8080/graphql
- **Client Web:** http://localhost:3000

## Development Commands

### Backend

```bash
cd backend
make install        # Install dependencies + tools
make generate       # Generate gqlgen code (run sqlc separately if schema changed)
make migrate-up     # Run migrations on BOTH databases (DATABASE_URL + DATABASE_URL_2)
make migrate-down   # Rollback migrations
make migrate-new NAME=desc  # Create new migration
make run            # Start server on :8080
make test           # Run tests
make clean          # Clean generated files
```

### Web

```bash
cd web
npm run dev          # Start client-web dev server
npm run build        # Build all packages
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm run test         # Run tests
```

## GraphQL Domains

The backend exposes 24 GraphQL schema domains:

| Domain | Description |
|--------|-------------|
| Auth | JWT + Google OAuth, token management |
| User | User profiles, roles, preferred language |
| Booking | Full booking lifecycle (create → assign → complete) |
| Company | Company registration, approval, documents, management |
| Worker | Worker invitation, onboarding, documents, management |
| Service | Service definitions, extras, pricing |
| Client | Client-specific operations and profiles |
| Review | Ratings and reviews |
| Payment | Stripe Connect integration |
| Subscription | Company subscription plans (Stripe) |
| Invoice | Invoice generation (Keez.ro) |
| Notification | Push notifications and in-app alerts |
| Analytics | Platform metrics and stats |
| Admin | Platform administration, review queue |
| Settings | Platform configuration (KV store) |
| Waitlist | Pre-release waitlist lead capture |
| Promo | Promo codes and discounts |
| Dispute | Booking dispute workflow |
| CategoryRequest | Company category access requests |
| Personality | Worker personality assessment |
| Recurring | Recurring booking schedules |
| Referral | Referral program |
| Location | Location data (counties, cities) |
| Audit | Audit log for admin actions |

## Environment Variables

Each service has a `.env.example` — copy to `.env` and fill in values:

| File | Contents |
|------|----------|
| `backend/.env.example` | Server, database, auth (Google OAuth), Stripe, storage, CORS |
| `web/packages/client-web/.env.example` | GraphQL endpoint, Google client ID |

## Testing

```bash
# Backend (~111 tests)
cd backend && make test

# Web (~427 tests across 44 files)
cd web && npm run test
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) — Development guide, conventions, and agent assignments

## License

Private — All rights reserved.
