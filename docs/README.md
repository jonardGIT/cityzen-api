# Repository Guide

This is the detailed repository guide for the CIRS API. The root `README.md` stays intentionally minimal.

For pilot-stage privacy compliance documentation added for LGU registration and governance review, see:

- `docs/privacy-management-program.md`
- `docs/privacy-management-program.docx`
- `docs/privacy-management-program-memo.md`
- `docs/privacy-management-program-memo.docx`
- `docs/privacy-impact-assessment-pilot.md`
- `docs/privacy-impact-assessment-pilot.docx`
- `docs/privacy-impact-assessment-pilot-memo.md`
- `docs/privacy-impact-assessment-pilot-memo.docx`
- `docs/data-processing-system-description.md`
- `docs/data-processing-system-description.docx`
- `docs/data-processing-system-description-memo.md`
- `docs/data-processing-system-description-memo.docx`

## Overview

If you need a setup and deployment walkthrough, see `docs/api-setup-guide.md`.

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
- Privacy notice capture and version tracking for citizen onboarding
- Data-subject request intake and admin review workflows
- Admin privacy incident register for breach-response documentation
- Shared whitelist-based list query filtering, sorting, and pagination
- Swagger/OpenAPI docs in development
- Jest + Supertest test coverage

Current platform capabilities:

- Optional Supabase-backed email/password auth, optional Supabase JWT mode, and optional Supabase TOTP MFA, while preserving the API's local user/session model when those flags are disabled.
- Runtime and migration database connection split for Supabase deployments: pooled `DATABASE_URL` for the API, direct `DIRECT_URL` for Prisma schema and migration commands.
- Persistent audit logging for auth and privileged mutating flows, including citizen incident reporting and failure-path capture for operational review.
- Consent-backed privacy notice enforcement for `/api/v1/auth/register`, `/api/v1/auth/mobile/register`, and first-time `/api/v1/mobile/profile` creation when enabled.
- Authenticated self-service and admin review endpoints for data-subject requests under `/api/v1/privacy-requests` and `/api/v1/admin/privacy-requests`.
- Governance reporting and production fail-closed validation for breach-response readiness and data residency posture.
- Supabase Storage-backed incident media upload, including single-file and multi-file JSON/base64 upload support and ordered `mediaUrls` persistence on incidents.
- Archive-by-default CRUD behavior across core resources, restore endpoints, archive-aware auth guards, and shared list-query archive browsing through `includeArchived=true` and `archivedOnly=true`.

## Tech Stack

- Node.js
- TypeScript
- Express
- Prisma + @prisma/client
- PostgreSQL (Supabase)
- Jest + Supertest
- Swagger UI Express

Recommended infrastructure extensions for the current architecture:

- `Redis` or `Valkey` for lower-latency shared rate limiting, short-lived security counters, and future queue-backed workflows.
- `Grafana Loki`, `OpenSearch`, or a managed SIEM for centralized audit-log exports, security alert retention, and deploy-event correlation.
- `Sentry` for exception and trace visibility remains a good fit; keep it focused on app/runtime failures rather than long-term audit retention.
- `BullMQ` if you add Redis, or a managed queue equivalent, for async password-reset delivery, media-scan orchestration, and retriable background jobs.
- A managed secret store such as `AWS Secrets Manager`, `GCP Secret Manager`, `Azure Key Vault`, `HashiCorp Vault`, or `1Password Connect` for production runtime and deploy secrets.

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
- `src/data/store.ts`: legacy in-memory sample data kept for reference only; runtime now uses Prisma.

### prisma folder

- `prisma/schema.prisma`: single source of truth for data models and relations.
- `prisma/reset-prisma-schema.sql`: one-time database reset script.
- `prisma/add-privacy-notice-consent.sql`: additive privacy notice acceptance columns for existing databases.
- `prisma/add-data-subject-requests.sql`: additive migration for data-subject rights workflow storage.
- `prisma/add-privacy-incidents.sql`: additive migration for the privacy incident and breach register.
- `prisma/add-timestamps.sql`: additive migration script for existing databases.
- `prisma/seed-data.sql`: reusable seed script.

### Seeded account map

The default seed keeps the core fixture emails stable for automated tests, but the names and jurisdiction bindings are readable enough for operator review.

Default seeded operator accounts:

- `admin@xypes.local`: `NATIONAL_ADMIN`, global or unscoped
- `regional.director@xypes.local`: `REGIONAL_DIRECTOR`, Region II or Cagayan Valley
- `supervisor@xypes.local`: `PROVINCIAL_ADMIN`, Isabela province
- `ops.lead@xypes.local`: `CITY_ADMIN`, Ilagan City
- `content.editor@xypes.local`: `CITY_CONTENT_EDITOR`, Ilagan City
- `dispatcher@xypes.local`: `DISPATCHER`, Ilagan City
- `responder@xypes.local`: `RESPONDER`, Ilagan City
- `tuguegarao.city.admin@xypes.local`: `CITY_ADMIN`, Tuguegarao City
- `tuguegarao.content.editor@xypes.local`: `CITY_CONTENT_EDITOR`, Tuguegarao City
- `tuguegarao.dispatcher@xypes.local`: `DISPATCHER`, Tuguegarao City
- `tuguegarao.responder@xypes.local`: `RESPONDER`, Tuguegarao City
- `auditor@xypes.local`: `AUDITOR`, global read-only
- `analyst@xypes.local`: `CITIZEN_REPORTER`, citizen self-service sample account

Seeded geography currently includes:

- Region II or Cagayan Valley
- Isabela province
- Cagayan province
- Ilagan City
- Cauayan City
- Tuguegarao City
- Roxas municipality

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Set these variables in `.env.development` and `.env` when required by local tooling:

```env
NODE_ENV=development
PORT=3000
API_BASE_PATH=/api/v1
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3001
TRUST_PROXY=false
DATABASE_URL=postgresql://postgres:<db-password>@aws-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20
DIRECT_URL=postgresql://postgres:<db-password>@db.<project-ref>.supabase.co:5432/postgres
API_KEYS=<set-local-api-key>
RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORE=memory
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
PUBLIC_CASE_LOOKUP_RATE_LIMIT_ENABLED=true
PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS=600000
PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS=20
INCIDENT_CASE_TOKEN_TTL_DAYS=30
JWT_SECRET=<set-long-random-jwt-secret>
MFA_ENCRYPTION_KEY=<set-long-random-mfa-encryption-key>
SUPABASE_AUTH_ENABLED=false
SUPABASE_JWT_ENABLED=false
SUPABASE_TOTP_ENABLED=false
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=<public-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<set-supabase-service-role-key>
SUPABASE_AUTH_AUTO_CONFIRM_EMAIL=true
SUPABASE_PASSWORD_RESET_REDIRECT_URL=http://localhost:3001/reset-password
SUPABASE_STORAGE_ENABLED=false
SUPABASE_STORAGE_BUCKET=incident-media
SUPABASE_STORAGE_ACCESS_MODE=signed
SUPABASE_STORAGE_SCAN_WEBHOOK_URL=https://scanner.example.gov/hooks/supabase-storage
SUPABASE_STORAGE_SIGNED_URL_TTL_SECONDS=900
SUPABASE_STORAGE_MAX_UPLOAD_BYTES=10485760
SUPABASE_STORAGE_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,application/pdf
SUPABASE_STORAGE_ARCHIVE_ENABLED=true
SUPABASE_STORAGE_ARCHIVE_PREFIX=archive/incidents
ARCHIVE_RECORDS_ENABLED=true
JSON_BODY_LIMIT=12mb
SENTRY_DSN=https://<key>@o<org>.ingest.<region>.sentry.io/<project>
SENTRY_SEND_DEFAULT_PII=false
SENTRY_TRACES_SAMPLE_RATE=0.1
SECURITY_ALERT_WEBHOOK_URL=https://monitoring.example.gov/security-alerts
SECURITY_ALERT_LOGIN_FAILURE_THRESHOLD=5
SECURITY_ALERT_LOGIN_FAILURE_WINDOW_MS=900000
SECURITY_ALERT_PASSWORD_RESET_THRESHOLD=3
SECURITY_ALERT_PASSWORD_RESET_WINDOW_MS=3600000
```

For production setup, env ordering, feature profiles, and service-run guidance, use these docs instead of extending the root README:

- `docs/api-setup-guide.md`
- `docs/CIRS-Anonymous-Reporting-Policy-Brief.docx`
- `docs/lawful-basis-register.md`
- `docs/privacy-governance-operations-guide.md`
- `docs/production-quick-checklist.md`
- `docs/production-env-templates.md`
- `docs/production-service-runbook.md`
- `docs/production-readiness-checklist.md`

For the current dashboard integration model, assume the dashboard runs locally on `http://localhost:3001` and fronts browser auth through its own same-origin `/api/auth/*` proxy.

## Related Docs

- `docs/api-setup-guide.md`
- `docs/CIRS-Anonymous-Reporting-Policy-Brief.docx`
- `docs/data-processing-system-description.docx`
- `docs/data-processing-system-description-memo.md`
- `docs/data-processing-system-description-memo.docx`
- `docs/access-review-template.md`
- `docs/cirs-developer-site/index.html`
- `docs/feature-profiles-guide.md`
- `docs/data-processing-system-description.md`
- `docs/lawful-basis-register.md`
- `docs/privacy-impact-assessment-pilot-memo.md`
- `docs/privacy-impact-assessment-pilot-memo.docx`
- `docs/privacy-impact-assessment-pilot.docx`
- `docs/privacy-impact-assessment-pilot.md`
- `docs/privacy-incident-playbook.md`
- `docs/privacy-management-program-memo.md`
- `docs/privacy-management-program-memo.docx`
- `docs/privacy-management-program.docx`
- `docs/privacy-management-program.md`
- `docs/privacy-compliance-closeout-checklist.md`
- `docs/privacy-external-blockers-report.md`
- `docs/privacy-governance-operations-guide.md`
- `docs/privacy-governance-policy-draft.md`
- `docs/production-quick-checklist.md`
- `docs/production-env-templates.md`
- `docs/production-service-runbook.md`
- `docs/production-readiness-checklist.md`
- `docs/processor-register-template.md`
- `docs/public-privacy-notice-draft.md`
- `docs/record-of-processing-activities-template.md`
- `docs/retention-schedule-template.md`
- `docs/staff-privacy-training-outline.md`
- `docs/supabase-all-setup.md`
- `docs/tuguegarao-pilot-governance-baseline.md`
