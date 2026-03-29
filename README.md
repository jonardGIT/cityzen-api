# xypes-cirs-api

Citizen Incident Reporting System (CIRS) REST API built with TypeScript, Express, Prisma, and PostgreSQL (Supabase).

## Overview

This API provides versioned endpoints for:

- Citizens
- Agencies
- Responders
- Statuses
- Categories
- Severities
- Incidents
- Assignments
- Users

Core features:

- Prisma-based PostgreSQL persistence
- Input validation with express-validator
- Centralized 404 and error handling
- API key protection, JWT auth, and role-based access control
- Persistent server-side audit logging for auth and selected mutating operations
- Shared whitelist-based list query filtering, sorting, and pagination
- Swagger/OpenAPI docs in development
- Jest + Supertest test coverage

## Tech Stack

- Node.js
- TypeScript
- Express
- Prisma + @prisma/client
- PostgreSQL (Supabase)
- Jest + Supertest
- Swagger UI Express

## Project Structure

### src folder

- `src/server.ts`: process entrypoint that starts the HTTP server.
- `src/app.ts`: Express app bootstrap, middleware wiring, route registration, docs mounting.
- `src/controllers/`: request handlers per resource and admin/auth/audit endpoints using Prisma queries.
- `src/routes/`: Express routers mapping URLs to controller functions.
- `src/lib/prisma.ts`: shared Prisma client instance used by controllers.
- `src/middleware/`: custom middleware for API key auth, JWT auth, audit logging, rate limits, 404, and centralized errors.
- `src/docs/openapi.ts`: OpenAPI document definition used by Swagger UI.
- `src/validators/`: body validation chains for incoming payloads.
- `src/utils/`: helper utilities (e.g., route parameter parsing, async wrappers).
- `src/types/`: TypeScript interfaces and model typings.
- `src/__tests__/`: integration tests for routes and middleware behavior.
- `src/data/store.ts`: legacy in-memory sample data (kept for reference only; runtime now uses Prisma).

### prisma folder

- `prisma/schema.prisma`: single source of truth for data models and relations.
  - Defines models: `User`, `Citizen`, `Agency`, `Responder`, `Status`, `Category`, `Severity`, `CitizenIncident`, `Assignment`, `AuditLog`.
  - Uses `@@map(...)` for mapped table names used in PostgreSQL.

- `prisma/reset-prisma-schema.sql`: one-time database reset script.
  - Drops legacy/current tables.
  - Recreates all tables exactly matching Prisma expectations.
  - Includes `createdAt` and `updatedAt` lifecycle timestamps on every table.
  - Use this when you want a clean baseline schema in Supabase.

- `prisma/add-timestamps.sql`: additive migration script for existing databases.
  - Adds `createdAt` and `updatedAt` columns to all mapped tables.
  - Creates update triggers so `updatedAt` changes automatically for SQL-level updates.

- `prisma/seed-data.sql`: reusable seed script.
  - Truncates data and resets identities.
  - Inserts realistic sample data.
  - Provides at least 10 rows for core domain tables and a smaller user set.

- `prisma/elgu-admin.schema.prisma`: separate Prisma schema scaffold for the eLGU mobile admin domain.
  - Uses `ELGU_DATABASE_URL` for a dedicated database.
  - Defines models for mobile users, dashboard admins, news posts, and mobile app content.

- `prisma/elgu-admin-reset-schema.sql`: reset script for the separate eLGU admin database.
  - Drops and recreates the eLGU admin tables and enums.

- `prisma/elgu-admin-seed-data.sql`: initial seed script for the eLGU admin database.
  - Seeds admin roles, admin users, mobile users, news posts, and app content items.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Set these variables in `.env.development` (and `.env` if needed by tooling):

```env
NODE_ENV=development
PORT=3000
API_BASE_PATH=/api/v1
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:5173
TRUST_PROXY=false
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres
API_KEYS=local-dev-key
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
JWT_SECRET=replace-with-a-long-random-secret
```

Important variables:

- `JWT_SECRET`: required. Use a long random secret and rotate it if exposure is suspected.
- `DATABASE_URL`: PostgreSQL connection for Prisma.
- `API_KEYS`: comma-separated allowed API keys.
- `API_KEY`: optional single-key fallback if `API_KEYS` is not set.
- `RATE_LIMIT_ENABLED`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`: request throttling controls.

Security notes:

- Keep `.env`, `.env.development`, and any real connection strings out of source control. This repository ignores them, but leaked values should still be rotated.
- `.env.test` is intentionally sanitized for safe sharing and does not guarantee a reachable database in every environment.
- For production, set `TRUST_PROXY=true` only when the app is behind a trusted reverse proxy or load balancer.

### 3. Initialize database schema and seed data (Supabase SQL Editor)

Run in this order:

1. `prisma/reset-prisma-schema.sql` (one-time reset)
2. `prisma/seed-data.sql` (sample records)

If your database already exists and you do not want a full reset, use the additive SQL scripts that match the features you need instead of the reset script.

If you are adopting the incident coordinate/address snapshot contract on an existing database, also run:

1. `prisma/add-incident-location-snapshot.sql`

If you are enabling persistent audit logging on an existing database, also run:

1. `prisma/add-audit-logs.sql`

### 4. Start development server

```bash
npm run dev
```

## Available Scripts

- `npm run dev`: start development server with nodemon + tsx
- `npm run build`: compile TypeScript into `dist`
- `npm start`: run compiled server from `dist/server.js`
- `npm test`: run Jest test suite
- `npm run test:watch`: run tests in watch mode
- `npm run test:coverage`: run tests with coverage report

## API Base Path

Default base path: `/api/v1`

Health check: `GET /api/v1/health`

## Route Summary

Resources:

- `/api/v1/citizens`
- `/api/v1/agencies`
- `/api/v1/responders`
- `/api/v1/statuses`
- `/api/v1/categories`
- `/api/v1/severities`
- `/api/v1/incidents`
- `/api/v1/assignments`
- `/api/v1/users`
- `/api/v1/audit-logs`

Auth and admin routes:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/citizens/link-me`
- `POST /api/v1/incidents/report`
- `GET /api/v1/admin/users` (admin roles only)
- `GET /api/v1/audit-logs` and `GET /api/v1/audit-logs/:id` (admin roles only)

Notes:

- Read/write method availability varies by resource. Most CRUD resources support `GET`, `POST`, `PATCH`, and `DELETE`, while auth and special-purpose routes expose narrower operations.
- `incidents` and `assignments` validate foreign key references before insert.
- Validation failures return HTTP 422.
- Role requirements differ by route and are documented in OpenAPI.

## List Query Contract

All list endpoints support shared query parameters:

- `page`, `pageSize`
- `search`
- `sortBy`, `sortOrder`
- `createdFrom`, `createdTo`, `updatedFrom`, `updatedTo`
- `filters` (JSON string)

`filters` format:

```json
[
  { "field": "name", "operator": "contains", "value": "juan" },
  {
    "field": "createdAt",
    "operator": "between",
    "value": ["2026-01-01T00:00:00.000Z", "2026-01-31T23:59:59.999Z"]
  }
]
```

Supported operators:

- `equals`
- `contains`
- `in`
- `gt`
- `gte`
- `lt`
- `lte`
- `between`

Fields are whitelist-based per resource. Unsupported sort/filter fields or invalid operators/types return `422` with structured `errors` details.

Dashboard integration notes:

- If the dashboard needs a new sortable/filterable field, add it to the backend resource whitelist first.
- Keep `422` error paths stable for query validation so controls can map errors directly:
  - `filters[i].field`
  - `filters[i].operator`
  - `filters[i].value`
  - `sortBy`
  - `sortOrder`
- If backend introduces a new operator, update dashboard operator mapping in `CrudTable.tsx` before exposing that operator in UI.
- Incident create/update/report now require coordinate/address snapshot fields on the incident payload itself.
- `locationId` and the standalone `/locations` resource have been removed from the backend contract.

## Swagger Documentation

Enabled only when `NODE_ENV` is not `production`.

- OpenAPI JSON: `/api/v1/openapi.json`
- Swagger UI: `/api/v1/docs`

Separate eLGU admin scaffold:

- `src/docs/elguAdminOpenapi.ts`: OpenAPI scaffold for a future dedicated eLGU admin API.
- Suggested base path: `/api/elgu/v1`
- Includes scaffolded resources for mobile auth, mobile users, dashboard admins, news, and app content.

## API Key Authentication

When `API_KEYS` or `API_KEY` is configured, all versioned API routes require this header unless the path is explicitly bypassed:

`x-api-key: your-api-key`

Public paths (no key required):

- `/api/v1/health`
- `/api/v1/openapi.json`
- `/api/v1/docs`
- `/api/v1/auth/*`

Invalid or missing key returns HTTP 401.

## JWT Auth and Roles

JWT auth is used for human users and role-aware dashboard/mobile access.

- Public JWT bootstrap endpoints:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
- Current user endpoint: `GET /api/v1/auth/me` with `Authorization: Bearer <token>`
- Admin-only JWT routes include:
  - `GET /api/v1/admin/users`
  - `GET /api/v1/audit-logs`
  - `GET /api/v1/audit-logs/:id`
  - citizen create/list/get/update/delete
  - user CRUD and capabilities
  - agency/responder/status/category/severity writes
- Incident access uses JWT for all list/get/write operations:
  - `VIEWER` can use `/api/v1/incidents/report`
  - `VIEWER` incident list/get is scoped by backend logic to that user's own incidents
  - `SUPER_ADMIN`, `ADMIN`, `DISPATCHER`, and `RESPONDER` can create/update/delete incidents
- `POST /api/v1/citizens/link-me` requires a `VIEWER` JWT and links the citizen profile to the authenticated email.

Password policy:

- Passwords must be at least 12 characters and include uppercase, lowercase, number, and special character.

Seeded development login:

- `admin@xypes.local` / `Password123!` (role: `SUPER_ADMIN`)

Role values:

- `SUPER_ADMIN`
- `ADMIN`
- `DISPATCHER`
- `RESPONDER`
- `VIEWER`

## Audit Logging

Persistent audit logging is enabled through the API layer and stored in the `audit_logs` table.

- Audit log read routes:
  - `GET /api/v1/audit-logs`
  - `GET /api/v1/audit-logs/:id`
- Audit log reads require both a valid API key when configured and an admin JWT.
- The backend records selected auth and mutation events, including:
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/register`
  - `POST /api/v1/citizens/link-me`
  - `POST /api/v1/incidents/report`
  - create/update/delete operations for core managed resources
- Audit responses include `requestId`, actor context, outcome, target identifiers, and sanitized metadata.

## Request Rate Limiting

Rate limiting is enabled by default per client IP on versioned API routes.

- Exceeded limit returns HTTP 429.
- Response headers include `X-RateLimit-*` and `Retry-After`.
- Auth endpoints are included in rate limiting.
- Health/docs endpoints are excluded.

## Testing

Run:

```bash
npm test
```

Coverage includes route behavior, validation, security middleware, and health/docs endpoints.

If `.env.test` points to a local placeholder database, provide a reachable `DATABASE_URL` and `JWT_SECRET` at command time, for example:

```bash
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres JWT_SECRET=<test-secret> npm test
```

## Build and Run (Production)

```bash
npm run build
npm start
```

## Notes

- Prisma client generation is required after schema changes:

```bash
npx prisma generate
```

- If direct PostgreSQL port access is restricted on your network, run schema/seed SQL in Supabase SQL Editor.

## Troubleshooting

- Prisma cannot find `DATABASE_URL`:
  - Ensure `.env` exists for Prisma CLI and contains `DATABASE_URL`.
  - App runtime may use `.env.development`; Prisma CLI reads `.env` by default.

- `P1001: Can't reach database server`:
  - Verify Supabase project is active.
  - Confirm host/port and password in `DATABASE_URL`.
  - If your network blocks direct DB access, execute `prisma/reset-prisma-schema.sql` and `prisma/seed-data.sql` in Supabase SQL Editor.

- SQL seed errors like missing relation/column:
  - Run `prisma/reset-prisma-schema.sql` first.
  - Then run `prisma/seed-data.sql`.

- API returns 401:
  - For non-auth routes, include `x-api-key` matching `API_KEYS` or `API_KEY`.
  - For JWT-protected routes, also include `Authorization: Bearer <token>`.

- API returns 429:
  - Reduce request rate or tune `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`.
