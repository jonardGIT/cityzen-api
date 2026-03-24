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
- Locations
- Incidents
- Assignments
- Users

Core features:

- Prisma-based PostgreSQL persistence
- Input validation with express-validator
- Centralized 404 and error handling
- API key protection and request rate limiting
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
- `src/controllers/`: request handlers per resource (list/get/create) using Prisma queries.
- `src/routes/`: Express routers mapping URLs to controller functions.
- `src/lib/prisma.ts`: shared Prisma client instance used by controllers.
- `src/middleware/`: custom middleware for API key auth, rate limits, 404, and centralized errors.
- `src/docs/openapi.ts`: OpenAPI document definition used by Swagger UI.
- `src/validators/`: body validation chains for incoming payloads.
- `src/utils/`: helper utilities (e.g., route parameter parsing, async wrappers).
- `src/types/`: TypeScript interfaces and model typings.
- `src/__tests__/`: integration tests for routes and middleware behavior.
- `src/data/store.ts`: legacy in-memory sample data (kept for reference only; runtime now uses Prisma).

### prisma folder

- `prisma/schema.prisma`: single source of truth for data models and relations.
	- Defines models: `User`, `Citizen`, `Agency`, `Responder`, `Status`, `Category`, `Severity`, `Location`, `CitizenIncident`, `Assignment`.
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
```

Important variables:

- `DATABASE_URL`: PostgreSQL connection for Prisma.
- `API_KEYS`: comma-separated allowed API keys.
- `API_KEY`: optional single-key fallback if `API_KEYS` is not set.
- `RATE_LIMIT_ENABLED`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`: request throttling controls.

### 3. Initialize database schema and seed data (Supabase SQL Editor)

Run in this order:

1. `prisma/reset-prisma-schema.sql` (one-time reset)
2. `prisma/seed-data.sql` (sample records)

If your database already exists and you do not want a full reset, run `prisma/add-timestamps.sql` instead of the reset script.

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

Each resource supports:

- `GET /` list all
- `GET /:id` get one by ID
- `POST /` create

Resources:

- `/api/v1/citizens`
- `/api/v1/agencies`
- `/api/v1/responders`
- `/api/v1/statuses`
- `/api/v1/categories`
- `/api/v1/severities`
- `/api/v1/locations`
- `/api/v1/incidents`
- `/api/v1/assignments`
- `/api/v1/users`

Auth and admin routes:

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/admin/users` (admin roles only)

Notes:

- `incidents` and `assignments` validate foreign key references before insert.
- Validation failures return HTTP 422.
- Selected write endpoints require JWT bearer auth with role checks.

## Swagger Documentation

Enabled only when `NODE_ENV` is not `production`.

- OpenAPI JSON: `/api/v1/openapi.json`
- Swagger UI: `/api/v1/docs`

## API Key Authentication

When `API_KEYS` or `API_KEY` is configured, include this header:

`x-api-key: your-api-key`

Public paths (no key required):

- `/api/v1/health`
- `/api/v1/openapi.json`
- `/api/v1/docs`

Invalid or missing key returns HTTP 401.

## JWT Auth and Roles

JWT auth is used for role-aware dashboard access.

- Login endpoint: `POST /api/v1/auth/login`
- Current user endpoint: `GET /api/v1/auth/me` with `Authorization: Bearer <token>`
- Admin example endpoint: `GET /api/v1/admin/users` (requires `SUPER_ADMIN` or `ADMIN`)

Seeded development login:

- `admin@xypes.local` / `Password123!` (role: `SUPER_ADMIN`)

Role values:

- `SUPER_ADMIN`
- `ADMIN`
- `DISPATCHER`
- `RESPONDER`
- `VIEWER`

## Request Rate Limiting

Rate limiting is enabled by default per client IP on versioned API routes.

- Exceeded limit returns HTTP 429.
- Response headers include `X-RateLimit-*` and `Retry-After`.
- Health/docs endpoints are excluded.

## Testing

Run:

```bash
npm test
```

Coverage includes route behavior, validation, security middleware, and health/docs endpoints.

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
	- Include `x-api-key` matching `API_KEYS` or `API_KEY`.

- API returns 429:
	- Reduce request rate or tune `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`.