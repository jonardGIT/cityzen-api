# xypes-cirs-api

Citizen Incident Reporting System (CIRS) API for incident intake, operational routing, response coordination, and administrative management.

## What This App Does

The API powers a local-government-focused incident reporting platform. It supports citizen-submitted reports, internal operations workflows, assignment handling, reference data management, and authenticated administrative actions.

Primary functional areas include:

- authentication and access control
- incident reporting and lifecycle management
- assignment and responder coordination
- audit-aware administrative operations
- geography and reference-data resources
- citizen and mobile-facing API support

## Stack

- Node.js
- TypeScript
- Express
- Prisma
- PostgreSQL
- Jest and Supertest

## Repository Layout

- `src/` application code, routes, controllers, services, middleware, and tests
- `prisma/` schema and database migration assets used in local development
- `scripts/` utility scripts for local workflows and testing
- `docs/` limited public-safe documentation and dashboard configuration artifacts

## Notes

This repository README is intentionally limited to a public-safe overview.

Detailed setup steps, environment contracts, operational runbooks, audit material, Postman collections, and internal implementation guides are maintained as local-only documentation on this machine and are not intended to remain in tracked repository content.
