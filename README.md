# Go2Fix.ro

Romania's first home services marketplace — an investor-ready MVP that formalizes the informal services sector through compliance, trust, and technology. Starting with cleaning, expanding to all home services.

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
│       ├── graph/          # GraphQL schema (14 domains) + resolvers
│       ├── middleware/      # CORS, logging
│       ├── service/        # Business logic (9 services)
│       └── storage/        # File uploads
├── web/                    # Turborepo monorepo
│   └── packages/
│       ├── client-web/     # Client booking app (:3000)
│       └── shared/         # Shared GraphQL, types, utils
├── docker-compose.yml      # PostgreSQL 16
└── help_me_clean.pdf       # Full MVP spec (46 pages)
```

## Quick Start

### Prerequisites

- Go 1.24+
- Node.js 20+ / npm 11+
- PostgreSQL 16 (or Docker)
- Xcode 16+ (for iOS development)

### 1. Clone & Install

```bash
git clone https://github.com/CleanBuddy/help-me-clean.git
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

# Run migrations
cd backend
make migrate-up

# (Optional) Seed dev data
make seed
```

### 3. Generate Code

```bash
cd backend
make generate    # Generates gqlgen + sqlc code
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
make generate       # Generate sqlc + gqlgen code
make migrate-up     # Run migrations
make migrate-down   # Rollback migrations
make migrate-new NAME=desc  # Create new migration
make run            # Start server on :8080
make test           # Run tests
make seed           # Seed development data
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

The backend exposes 14 GraphQL schema domains:

| Domain | Description |
|--------|-------------|
| Auth | JWT + Google OAuth, token management |
| User | User profiles, roles |
| Booking | Full booking lifecycle |
| Company | Company registration, approval, management |
| Cleaner | Cleaner invitation, onboarding, management |
| Service | Service definitions, extras, pricing |
| Chat | Real-time messaging (client ↔ cleaner) |
| Review | Ratings and reviews |
| Payment | Stripe integration (mock for MVP) |
| Notification | Push notifications |
| Analytics | Platform metrics |
| Admin | Platform administration |
| Settings | Platform configuration |
| Client | Client-specific operations |

## Environment Variables

Each service has a `.env.example` — copy to `.env` and fill in values:

| File | Contents |
|------|----------|
| `backend/.env.example` | Server, database, auth (Google OAuth), Stripe, storage, CORS |
| `web/packages/client-web/.env.example` | GraphQL endpoint, Google client ID |

## Testing

```bash
# Backend
cd backend && make test

# Web
cd web && npm run test

```

## Documentation

- [CLAUDE.md](./CLAUDE.md) — Development guide, conventions, and agent assignments
- [help_me_clean.pdf](./help_me_clean.pdf) — Full MVP specification (46 pages)
- [INTERACTIVE_TEST_SCENARIOS.md](./INTERACTIVE_TEST_SCENARIOS.md) — Manual test scenarios

## License

Private — All rights reserved.
