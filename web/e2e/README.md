# E2E Tests - Go2Fix.ro

Consolidated end-to-end tests for the unified web platform.

## Structure

```
e2e/
├── playwright.config.ts   # Main config with 3 projects
├── tests/
│   ├── client/           # Client-facing tests (/)
│   │   ├── auth.spec.ts
│   │   ├── booking-flow.spec.ts
│   │   ├── bookings.spec.ts
│   │   ├── navigation.spec.ts
│   │   ├── profile.spec.ts
│   │   ├── services.spec.ts
│   │   └── helpers.ts
│   ├── company/          # Company dashboard tests (/firma)
│   │   ├── auth.spec.ts
│   │   ├── dashboard.spec.ts
│   │   ├── navigation.spec.ts
│   │   ├── orders.spec.ts
│   │   ├── settings.spec.ts
│   │   ├── team.spec.ts
│   │   └── helpers.ts
│   └── admin/            # Admin panel tests (/admin)
│       ├── auth.spec.ts
│       ├── bookings.spec.ts
│       ├── companies.spec.ts
│       ├── dashboard.spec.ts
│       ├── navigation.spec.ts
│       ├── settings.spec.ts
│       ├── users.spec.ts
│       └── helpers.ts
└── README.md
```

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run specific project
npx playwright test --project=client
npx playwright test --project=company
npx playwright test --project=admin

# Run specific test file
npx playwright test tests/client/auth.spec.ts
npx playwright test tests/company/orders.spec.ts
npx playwright test tests/admin/users.spec.ts

# Run with UI
npx playwright test --ui

# View last report
npx playwright show-report
```

## Base URLs

- **Client:** `http://localhost:3000`
- **Company:** `http://localhost:3000/firma`
- **Admin:** `http://localhost:3000/admin`

All tests run against the unified web platform at `:3000` with role-specific routes.

## Web Server

The config automatically starts the dev server before running tests:
```bash
cd .. && npm run dev
```

Server starts at `http://localhost:3000` and serves all three interfaces.
