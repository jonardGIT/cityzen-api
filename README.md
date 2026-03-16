# xypes-cirs-api

Citizen Incident Reporting System (CIRS) REST API built with TypeScript and Express.

## Overview

This project provides versioned REST endpoints for:

- Citizens
- Responders
- Statuses
- Categories
- Severities
- Locations
- Incidents
- Assignments

The API currently uses an in-memory data store and includes:

- Input validation with express-validator
- Centralized error handling and 404 handling
- Security and API middleware (helmet, cors, morgan)
- Jest + Supertest test coverage for all routes
- Swagger/OpenAPI docs in development

## Tech Stack

- Node.js
- TypeScript
- Express
- Jest + Supertest
- Swagger UI Express

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.development` and adjust values as needed.

Example variables:

```env
NODE_ENV=development
PORT=3000
API_BASE_PATH=/api/v1
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:5173
TRUST_PROXY=false
API_KEYS=local-dev-key,partner-key
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

Security and throttling variables:

- `API_KEYS`: optional comma-separated API keys. When set, all API routes except health/docs require `x-api-key`.
- `API_KEY`: optional single key fallback if you prefer one key instead of a list.
- `RATE_LIMIT_ENABLED`: `true`/`false`, default `true`.
- `RATE_LIMIT_WINDOW_MS`: rate-limit window duration in milliseconds, default `60000`.
- `RATE_LIMIT_MAX_REQUESTS`: max requests per client IP per window, default `100`.

### 3. Start development server

```bash
npm run dev
```

## Available Scripts

- `npm run dev` - start development server with nodemon + tsx
- `npm run build` - compile TypeScript to `dist`
- `npm start` - run compiled server from `dist/server.js`
- `npm test` - run Jest test suite
- `npm run test:watch` - run tests in watch mode
- `npm run test:coverage` - run tests with coverage report

## API Base Path

Default base path:

```text
/api/v1
```

Health endpoint:

```text
GET /api/v1/health
```

## Route Summary

Each resource exposes:

- `GET /` list all
- `GET /:id` get by id
- `POST /` create

Resources:

- `/api/v1/citizens`
- `/api/v1/responders`
- `/api/v1/statuses`
- `/api/v1/categories`
- `/api/v1/severities`
- `/api/v1/locations`
- `/api/v1/incidents`
- `/api/v1/assignments`

Notes:

- `incidents` and `assignments` include foreign key checks against related entities.
- Validation errors return HTTP 400 with a structured errors payload.

## Swagger Documentation

Swagger is available only when not running in production mode.

- OpenAPI JSON: `/api/v1/openapi.json`
- Swagger UI: `/api/v1/docs`

If `NODE_ENV=production`, these endpoints are not mounted.

## API Key Authentication

When `API_KEYS` or `API_KEY` is configured, include the key in request headers:

```text
x-api-key: your-api-key
```

Public endpoints that remain accessible without an API key:

- `/api/v1/health`
- `/api/v1/openapi.json`
- `/api/v1/docs`

Requests without a valid key return HTTP 401.

## Request Rate Limiting

Rate limiting is enabled by default and applies per client IP across API routes.

- Exceeding the configured request limit returns HTTP 429.
- Responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` (when limited).
- Health and docs endpoints are excluded from limiting.

## Testing

The test suite covers all route groups, including:

- success and not-found responses for `GET /:id`
- successful creation flows for `POST /`
- validation and bad-request scenarios
- docs and health checks

Run tests:

```bash
npm test
```

## Build and Run (Production)

```bash
npm run build
npm start
```

## Current Limitations

- Data is stored in memory and resets on server restart.
- No persistent database integration yet.

## Next Improvements

- Add database persistence (for example, PostgreSQL + Prisma)
- Add auth and role-based access control (scoped permissions)
- Add CI pipeline for lint/build/test