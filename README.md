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
```

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
- No authentication/authorization layer yet.
- No persistent database integration yet.

## Next Improvements

- Add database persistence (for example, PostgreSQL + Prisma)
- Add auth and role-based access control
- Add request rate limiting and API key support
- Add CI pipeline for lint/build/test