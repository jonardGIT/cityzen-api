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

Current platform capabilities:

- Optional Supabase-backed email/password auth, optional Supabase JWT mode, and optional Supabase TOTP MFA, while preserving the API's local user/session model when those flags are disabled.
- Runtime and migration database connection split for Supabase deployments: pooled `DATABASE_URL` for the API, direct `DIRECT_URL` for Prisma schema and migration commands.
- Persistent audit logging for auth and privileged mutating flows, including citizen incident reporting and failure-path capture for operational review.
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

### Seeded account map

The default seed keeps the core fixture emails stable for automated tests, but the names and jurisdiction bindings are now readable enough for operator review.

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

- `prisma/elgu-admin.schema.prisma`, `prisma/elgu-admin-reset-schema.sql`, `prisma/elgu-admin-seed-data.sql`: legacy scaffolding for a separate eLGU mobile-admin domain.
  - These files are not wired to the current API routes, controllers, or runtime startup.
  - Treat them as archived reference material unless that separate domain is revived intentionally.

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
DATABASE_URL=postgresql://postgres:<password>@aws-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20
DIRECT_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
API_KEYS=local-dev-key
RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORE=memory
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
PUBLIC_CASE_LOOKUP_RATE_LIMIT_ENABLED=true
PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS=600000
PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS=20
INCIDENT_CASE_TOKEN_TTL_DAYS=30
JWT_SECRET=replace-with-a-long-random-secret
MFA_ENCRYPTION_KEY=replace-with-a-separate-long-random-secret
SUPABASE_AUTH_ENABLED=false
SUPABASE_JWT_ENABLED=false
SUPABASE_TOTP_ENABLED=false
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=<public-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_AUTH_AUTO_CONFIRM_EMAIL=true
SUPABASE_PASSWORD_RESET_REDIRECT_URL=http://localhost:5173/reset-password
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

Important variables:

- `JWT_SECRET`: required. Use a long random secret and rotate it if exposure is suspected.
- `MFA_ENCRYPTION_KEY`: required if you enable MFA. Use a separate long random secret for encrypting stored TOTP seeds.
- In production, the backend now rejects placeholder or test values for `JWT_SECRET`, `API_KEYS`, `MFA_ENCRYPTION_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, and it requires secrets to meet minimum length checks before startup completes.
- `SENTRY_DSN`: optional but required to send backend errors and traces to Sentry.
- `SENTRY_SEND_DEFAULT_PII`: optional. Set to `true` only if you intentionally want request headers and user IP data sent to Sentry.
- `SENTRY_TRACES_SAMPLE_RATE`: optional decimal from `0` to `1` for performance tracing volume.
- `SECURITY_ALERT_WEBHOOK_URL`: optional centralized security-alert sink. When set, the backend forwards selected high-risk audit events and threshold-based auth abuse alerts to this webhook.
- `SECURITY_ALERT_WEBHOOK_URL` must be an absolute `https://` URL in production.
- `SECURITY_ALERT_LOGIN_FAILURE_THRESHOLD`, `SECURITY_ALERT_LOGIN_FAILURE_WINDOW_MS`: optional threshold controls for repeated failed-login alerts. Defaults to 5 failures in 15 minutes.
- `SECURITY_ALERT_PASSWORD_RESET_THRESHOLD`, `SECURITY_ALERT_PASSWORD_RESET_WINDOW_MS`: optional threshold controls for repeated password-reset request alerts. Defaults to 3 requests in 1 hour.
- `DATABASE_URL`: PostgreSQL runtime connection for Prisma. If you use the Supabase transaction pooler, include `?pgbouncer=true&connection_limit=1&pool_timeout=20`.
- `DIRECT_URL`: direct PostgreSQL connection for Prisma migrations and schema commands.
- `SUPABASE_AUTH_ENABLED`: set to `true` to validate email/password credentials against Supabase Auth while the API continues issuing its own JWT/session tokens.
- `SUPABASE_JWT_ENABLED`: optional. Set to `true` to accept and return Supabase access tokens for protected API routes. Requires `SUPABASE_AUTH_ENABLED=true`.
- `SUPABASE_TOTP_ENABLED`: optional. Set to `true` to back privileged-user TOTP enrollment and verification with Supabase MFA instead of the local encrypted secret store. Requires `SUPABASE_JWT_ENABLED=true`.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: required based on the selected production feature profile. `SUPABASE_SERVICE_ROLE_KEY` is required for any Supabase-backed auth or media storage selection, `SUPABASE_URL` is also required for Supabase media storage selections, and `SUPABASE_ANON_KEY` remains required only for Supabase auth, JWT, or TOTP selections.
- `SUPABASE_AUTH_AUTO_CONFIRM_EMAIL`: optional. Defaults to `true` so backend-created users can sign in immediately; set to `false` if you require email confirmation.
- `SUPABASE_PASSWORD_RESET_REDIRECT_URL`: optional frontend reset route used by Supabase password recovery emails if you later call the hosted reset flow.
- `SUPABASE_STORAGE_ENABLED`: optional. Set to `true` to enable `POST /incidents/media/upload` backed by Supabase Storage.
- `SUPABASE_STORAGE_BUCKET`: required when `SUPABASE_STORAGE_ENABLED=true`.
- `SUPABASE_STORAGE_ACCESS_MODE`: optional. Defaults to `public`. Set this to `signed` for production Supabase media storage so the backend can store stable managed media references and return short-lived access URLs while the backing bucket stays private. Production startup fails closed when `FEATURE_MEDIA_STORAGE=supabase-storage` and this value is not `signed`.
- `SUPABASE_STORAGE_SCAN_WEBHOOK_URL`: required in production when `FEATURE_MEDIA_STORAGE=supabase-storage`. Configure an absolute `https://` webhook URL for the media-scan service the API calls after storing incident media in Supabase Storage.
- `SUPABASE_STORAGE_SIGNED_URL_TTL_SECONDS`: optional signed-access lifetime in seconds when `SUPABASE_STORAGE_ACCESS_MODE=signed`. Defaults to `900`.
- `SUPABASE_STORAGE_MAX_UPLOAD_BYTES`: optional max upload size in bytes. Defaults to `10485760` (10 MB).
- `SUPABASE_STORAGE_ALLOWED_MIME_TYPES`: optional comma-separated allowlist for incident media uploads.
- `SUPABASE_STORAGE_ARCHIVE_ENABLED`: optional. Defaults to `true`. When enabled, Supabase-managed incident media that gets replaced or deleted is copied under an archive prefix before the original object is removed.
- `SUPABASE_STORAGE_ARCHIVE_PREFIX`: optional archive path prefix inside the same bucket. Defaults to `archive/incidents`.
- `ARCHIVE_RECORDS_ENABLED`: optional. Defaults to `true`. When enabled, CRUD delete endpoints archive records by setting `archivedAt` and normal reads exclude archived rows. Set it to `false` to fall back to hard deletes and include archived rows in normal queries.
- `JSON_BODY_LIMIT`: optional Express JSON parser size limit. Increase this if your base64 upload payloads are larger than the default.
- `API_KEYS`: comma-separated allowed API keys.
- `API_KEY`: optional single-key fallback if `API_KEYS` is not set.
- `RATE_LIMIT_ENABLED`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`: request throttling controls.
- `PUBLIC_CASE_LOOKUP_RATE_LIMIT_ENABLED`: public case-lookup limiter switch for the trust-layer endpoint. Keep this enabled for any deployment that exposes `/api/v1/cases/:caseToken`. In production, startup now fails closed if this is explicitly set to `false`.
- `PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS`, `PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS`: public case-lookup throttle for trust-layer reads. In production, explicit overrides are recommended and the current partner-LGU baseline remains `600000` ms and `20` requests when these variables are omitted. Startup still rejects explicit values outside `60000` to `3600000` ms and `1` to `30` requests.
- `INCIDENT_CASE_TOKEN_TTL_DAYS`: public case-token lifetime. In production, an explicit override is recommended and omission falls back to the current partner-LGU baseline of `30` days. Startup still rejects explicit values outside `1` to `30` days.
- `RATE_LIMIT_STORE`: optional rate-limit backend. Use `database` for shared counters across multiple API instances. Defaults to `database` in production and `memory` elsewhere. In production, the API now fails closed with `503` responses if the shared limiter store is unavailable.
- `AUTH_LOGIN_RATE_LIMIT_WINDOW_MS`, `AUTH_LOGIN_RATE_LIMIT_MAX_REQUESTS`: optional tighter login throttle. Defaults to 60 seconds and 5 attempts per client-plus-email.
- `AUTH_REFRESH_RATE_LIMIT_WINDOW_MS`, `AUTH_REFRESH_RATE_LIMIT_MAX_REQUESTS`: optional tighter refresh throttle. Defaults to 60 seconds and 10 attempts per client.
- `AUTH_PASSWORD_RESET_REQUEST_RATE_LIMIT_WINDOW_MS`, `AUTH_PASSWORD_RESET_REQUEST_RATE_LIMIT_MAX_REQUESTS`: optional tighter password reset request throttle. Defaults to 1 hour and 5 attempts per client-plus-email.
- `AUTH_PASSWORD_RESET_CONFIRM_RATE_LIMIT_WINDOW_MS`, `AUTH_PASSWORD_RESET_CONFIRM_RATE_LIMIT_MAX_REQUESTS`: optional tighter password reset confirmation throttle. Defaults to 15 minutes and 10 attempts per client.
- `PASSWORD_RESET_DELIVERY_WEBHOOK_URL`: required in production. Configure an absolute `https://` webhook URL that receives password reset delivery payloads so the backend can keep raw reset tokens out of production API responses.
- `PASSWORD_RESET_DELIVERY_WEBHOOK_URL` is part of the fail-closed production env contract; startup rejects production rollouts where it is missing or not `https://`.
- `AUTH_MFA_SETUP_RATE_LIMIT_WINDOW_MS`, `AUTH_MFA_SETUP_RATE_LIMIT_MAX_REQUESTS`: optional tighter MFA setup throttle. Defaults to 10 minutes and 5 attempts per authenticated user.
- `AUTH_MFA_ENABLE_RATE_LIMIT_WINDOW_MS`, `AUTH_MFA_ENABLE_RATE_LIMIT_MAX_REQUESTS`: optional tighter MFA enable throttle. Defaults to 10 minutes and 10 attempts per authenticated user.
- `AUTH_MFA_DISABLE_RATE_LIMIT_WINDOW_MS`, `AUTH_MFA_DISABLE_RATE_LIMIT_MAX_REQUESTS`: optional tighter MFA disable throttle. Defaults to 10 minutes and 10 attempts per authenticated user.
- `INCIDENT_MEDIA_UPLOAD_RATE_LIMIT_WINDOW_MS`, `INCIDENT_MEDIA_UPLOAD_RATE_LIMIT_MAX_REQUESTS`: optional tighter incident media upload throttle. Defaults to 10 minutes and 10 attempts per authenticated user.
- `ADMIN_ACCESS_REVIEW_STALE_DAYS`: optional privileged access-review threshold. Defaults to `90` days and controls when privileged accounts are flagged as stale in `GET /api/v1/admin/users/access-review`.
- `DATA_RETENTION_AUTH_SESSIONS_DAYS`, `DATA_RETENTION_PASSWORD_RESET_DAYS`, `DATA_RETENTION_AUDIT_LOG_DAYS`, `DATA_RETENTION_INCIDENT_MEDIA_DAYS`, `DATA_RETENTION_INCIDENT_RECORDS_DAYS`, `DATA_RETENTION_CITIZEN_RECORDS_DAYS`: optional retention schedule inputs surfaced through `GET /api/v1/admin/security/data-governance` for operational review. Defaults are 30, 7, 365, 365, 1825, and 1825 days respectively.
- `DATA_LEGAL_HOLD_ENABLED`, `DATA_LEGAL_HOLD_CONTACT`: optional legal-hold posture fields surfaced through the governance summary endpoint and [docs/data-protection-governance.md](/home/nhad/xypes/xypes-cirs-api/docs/data-protection-governance.md).
- Centralized monitoring, alert triage, privileged-account recovery, and break-glass expectations are documented in [docs/security-operations-runbook.md](/home/nhad/xypes/xypes-cirs-api/docs/security-operations-runbook.md).
- Secret-handling, branch-protection, and release-approval expectations are documented in [docs/security-administration-controls.md](/home/nhad/xypes/xypes-cirs-api/docs/security-administration-controls.md).
- Role ownership, privileged access approval, periodic review, and joiner or mover or leaver expectations are documented in [docs/security-access-governance.md](/home/nhad/xypes/xypes-cirs-api/docs/security-access-governance.md).
- Device and session review expectations, session inventory usage, and identity-integration guidance are documented in [docs/security-session-governance.md](/home/nhad/xypes/xypes-cirs-api/docs/security-session-governance.md).

Incident media confidentiality behavior:

- `POST /incidents/media/upload` always returns reusable `mediaUrls` values for persistence on incident records.
- When `SUPABASE_STORAGE_ACCESS_MODE=public`, those `mediaUrls` are public bucket URLs and `accessUrls` mirrors them.
- When `SUPABASE_STORAGE_ACCESS_MODE=signed`, those `mediaUrls` become stable `supabase://bucket/object-path` references and the response includes short-lived `accessUrls` plus per-file `accessUrl` values for immediate preview.
- Incident read responses resolve managed media references back into signed access URLs automatically, while update requests can still accept previously returned signed URLs or public URLs and normalize them back to the managed reference format.

Production feature-profile variables:

- `FEATURE_AUTH_PROVIDER`: required for `npm run build:production`. Choose `local` or `supabase`.
- `FEATURE_TOKEN_MODE`: required for `npm run build:production`. Choose `app-jwt` or `supabase-jwt`.
- `FEATURE_MFA_MODE`: required for `npm run build:production`. Choose `disabled`, `local-totp`, or `supabase-totp`.
- `FEATURE_MEDIA_STORAGE`: required for `npm run build:production`. Choose `disabled` or `supabase-storage`.
- `FEATURE_RECORD_DELETION`: required for `npm run build:production`. Choose `hard-delete` or `archive`.
- `FEATURE_PROFILE_NAME`: optional human-readable name embedded into the production build profile.

Feature-selection constraints:

- `FEATURE_TOKEN_MODE=supabase-jwt` requires `FEATURE_AUTH_PROVIDER=supabase`.
- `FEATURE_MFA_MODE=supabase-totp` requires `FEATURE_TOKEN_MODE=supabase-jwt`.
- `FEATURE_MFA_MODE=disabled` is not valid for production rollouts; production startup now fails closed if MFA is disabled.
- `FEATURE_MEDIA_STORAGE=supabase-storage` should be paired with signed/private media access and a configured media-scan webhook in production.

`npm run build:production` requires one explicit selection per feature group and locks those selections into the production build. Unselected feature routes and behaviors are not mounted in the running production app, and the generated OpenAPI document hides those disabled routes as well. This is a fail-closed production profile, not a tree-shaking or code-stripping build.

When `SUPABASE_JWT_ENABLED=true`, the backend verifies Supabase bearer tokens on protected routes and returns Supabase access/refresh tokens from login and refresh endpoints. The legacy session-management endpoints `/auth/sessions` and `/auth/sessions/:id` remain available only in app-JWT mode because Supabase does not expose arbitrary session listing/revocation in the same shape.

When `SUPABASE_TOTP_ENABLED=true`, privileged-role MFA uses Supabase Auth's TOTP flow. In that mode:

- `POST /auth/login` still accepts `mfaCode`, but the code is verified against Supabase TOTP factors and the returned token bundle is upgraded to `aal2`.
- `POST /auth/mfa/setup`, `POST /auth/mfa/enable`, and `POST /auth/mfa/disable` require the caller's current Supabase `refreshToken` in the request body so the backend can perform session-scoped MFA operations against Supabase.
- Protected routes reject privileged users who only have an `aal1` Supabase session after first-factor sign-in.

When `NODE_ENV=production`, privileged roles (`NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`, `CITY_CONTENT_EDITOR`, `DISPATCHER`, `AUDITOR`) are now treated as MFA-required operationally:

- If the selected production feature profile disables MFA entirely, privileged login fails closed with a `503` configuration error.
- If MFA is enabled in the build but the privileged account is not enrolled yet, login still succeeds but returns `mfaEnrollmentRequired=true` and the resulting session is limited to MFA enrollment routes until setup is completed.
- Admin operators can review current privileged MFA compliance through `GET /api/v1/admin/users/mfa-compliance`.
- Admin operators can review privileged account posture through `GET /api/v1/admin/users/access-review`, which highlights stale privileged accounts, missing MFA enrollment, and recent session activity for periodic access reviews.
- Admin operators and auditors can review the configured retention schedule, classification guidance, encryption expectations, and legal-hold posture through `GET /api/v1/admin/security/data-governance`.

Password reset recovery behavior:

- `POST /auth/password-reset/request` always returns a generic acceptance response.
- In non-production environments, the backend still returns `resetToken` and `resetExpiresAt` in the API response for local end-to-end testing.
- In production, raw reset tokens are never returned in the API response. The backend sends the generic password-reset delivery payload to `PASSWORD_RESET_DELIVERY_WEBHOOK_URL`, which must be configured for a valid production rollout.
- In production, privileged roles (`NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`, `CITY_CONTENT_EDITOR`, `DISPATCHER`, `AUDITOR`) are blocked from public self-service password reset and require an admin-assisted recovery workflow.
- Password reset request and confirm events remain auditable, and audit metadata records the delivery mode and privileged-recovery policy outcome without storing the reset token itself.

Centralized security alerting:

- When `SECURITY_ALERT_WEBHOOK_URL` is configured, the backend forwards selected high-risk audit events to that webhook after the audit log is persisted.
- Current alert rules cover repeated failed logins, repeated password reset requests, repeated blocked privileged recovery attempts, repeated failed password reset confirmations, repeated refresh failures, repeated session revocations, repeated MFA setup resets, repeated incident media upload attempts, and repeated incident media access requests.
- Current alert rules also cover privileged MFA disable events, successful password reset completions, privileged user creation, user role changes, admin-triggered password resets, user archive/delete events, user restoration events, and burst privileged user-management activity.
- Alert forwarding is additive: requests do not fail if the monitoring webhook is unavailable, but the backend logs the alert-delivery failure locally.

Security notes:

- Keep `.env`, `.env.development`, and any real connection strings out of source control. This repository ignores them, but leaked values should still be rotated.
- Do not hardcode the Sentry DSN in source files. Keep it in environment configuration so it can be rotated safely.
- `.env.test` is intentionally sanitized for safe sharing and does not guarantee a reachable database in every environment.
- For production, set `TRUST_PROXY=true` only when the app is behind a trusted reverse proxy or load balancer.
- Sentry is initialized from the runtime server bootstrap, captures unhandled `5xx` request errors, and stays disabled when `SENTRY_DSN` is unset or `NODE_ENV=test`.

### 3. Initialize database schema and seed data (Supabase SQL Editor)

Run in this order:

1. `prisma/reset-prisma-schema.sql` (one-time reset)
2. `prisma/seed-data.sql` (sample records)

If your database already exists and you do not want a full reset, use the additive SQL scripts that match the features you need instead of the reset script.

If you are adopting the incident coordinate/address snapshot contract on an existing database, also run:

1. `prisma/add-incident-location-snapshot.sql`

If you are enabling multi-file incident media on an existing database, also run:

1. `prisma/add-incident-media.sql`

If you are enabling archive-by-default deletes and active-only reads on an existing database, also run:

1. `prisma/add-archived-at.sql`

If you are enabling auth sessions, password reset, shared rate limiting, or MFA on an older database, also run the additive scripts that match the runtime features you are turning on:

1. `prisma/add-auth-sessions.sql`
2. `prisma/add-password-reset-tokens.sql`
3. `prisma/add-rate-limit-buckets.sql`
4. `prisma/add-user-mfa.sql`

Legacy note:

- The `prisma/elgu-admin*` files are not part of the current API bootstrap or route surface. Do not apply them unless you are intentionally reviving that separate domain.

If you are enabling persistent audit logging on an existing database, also run:

1. `prisma/add-audit-logs.sql`

If you are enabling revocable server-side auth sessions on an existing database, also run:

1. `prisma/add-auth-sessions.sql`

If you are enabling privileged-role MFA on an existing database, also run:

1. `prisma/add-user-mfa.sql`

If you are enabling shared database-backed rate limiting on an existing database, also run:

1. `prisma/add-rate-limit-buckets.sql`

If you are enabling Supabase-managed email/password auth on an existing database, also run:

1. `prisma/add-supabase-auth.sql`

If you are rolling out the narrower city communications publisher role on an existing database, also run:

1. `prisma/add-city-content-editor-role.sql`

If you still rely on the legacy hierarchy conversion script, note that `prisma/migrate-roles.sql` now includes `CITY_CONTENT_EDITOR` in the rebuilt `users_role_check` constraint, but existing databases that already ran an older copy still need the additive patch above.

### 4. Start development server

```bash
npm run dev
```

### Production feature build

Example:

```bash
FEATURE_PROFILE_NAME=gov-prod \
FEATURE_AUTH_PROVIDER=supabase \
FEATURE_TOKEN_MODE=supabase-jwt \
FEATURE_MFA_MODE=supabase-totp \
FEATURE_MEDIA_STORAGE=supabase-storage \
FEATURE_RECORD_DELETION=archive \
npm run build:production
```

Invalid combinations fail the build. Example: `FEATURE_TOKEN_MODE=supabase-jwt` is rejected unless `FEATURE_AUTH_PROVIDER=supabase` is also selected.

### Quick profile reference

| Profile                    | Auth       | Tokens         | MFA             | Use case                         |
| -------------------------- | ---------- | -------------- | --------------- | -------------------------------- |
| `development-local`        | `local`    | `app-jwt`      | `local-totp`    | Day-to-day development           |
| `development-supabase`     | `supabase` | `supabase-jwt` | `supabase-totp` | Testing Supabase integration     |
| `production-supabase-auth` | `supabase` | `supabase-jwt` | `supabase-totp` | Production without media storage |
| `production-supabase-full` | `supabase` | `supabase-jwt` | `supabase-totp` | Production with media storage    |

See [docs/feature-profiles-guide.md](docs/feature-profiles-guide.md) for detailed profile documentation including switching profiles and troubleshooting.

### Supabase setup

For creating and configuring a Supabase project from scratch (dashboard setup, email auth, MFA, SMTP, storage buckets), see [docs/supabase-project-setup.md](docs/supabase-project-setup.md).

For the complete production deployment checklist with all Supabase features, see [docs/supabase-all-setup.md](docs/supabase-all-setup.md).

## Available Scripts

- `npm run dev`: start development server with nodemon + tsx
- `npm run build`: compile TypeScript into `dist`
- `npm start`: run compiled server from `dist/server.js`
- `npm run supabase:backfill-seed -- --password=Password123!`: create the sample seeded users in Supabase Auth and link the local `users.supabaseAuthUserId` values before enabling `SUPABASE_AUTH_ENABLED=true`
- `npm test`: run Jest test suite
- `npm run test:watch`: run tests in watch mode
- `npm run test:coverage`: run tests with coverage report

If you are migrating existing seeded users to Supabase Auth, run the additive SQL first, set the Supabase env vars, and then backfill the seeded auth users before enabling `SUPABASE_AUTH_ENABLED=true`:

```bash
npm run supabase:backfill-seed -- --password=Password123!
```

That script targets the sample users from `prisma/seed-data.sql` by default and stores the returned Supabase auth IDs in the local `users` table. It cannot recover unknown existing passwords from bcrypt hashes, so for non-seeded users you must supply the password you want assigned in Supabase and optionally restrict the run with `--emails=a@example.com,b@example.com`.

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
- `POST /api/v1/auth/password-reset/request`
- `POST /api/v1/auth/password-reset/confirm`
- `POST /api/v1/auth/mfa/setup`
- `POST /api/v1/auth/mfa/enable`
- `POST /api/v1/auth/mfa/disable`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/sessions`
- `POST /api/v1/auth/logout`
- `DELETE /api/v1/auth/sessions/:id`
- `GET /api/v1/users/capabilities`
- `POST /api/v1/citizens/link-me`
- `POST /api/v1/incidents/media/upload`
- `POST /api/v1/incidents/report`
- `GET /api/v1/admin/users` (admin roles only)
- `GET /api/v1/admin/users/mfa-compliance` (national admin only)
- `GET /api/v1/admin/users/access-review` (national admin only)
- `GET /api/v1/admin/security/data-governance` (LGU admin roles and auditor)
- `GET /api/v1/audit-logs` and `GET /api/v1/audit-logs/:id` (admin roles only)

Notes:

- Read/write method availability varies by resource. Most CRUD resources support `GET`, `POST`, `PATCH`, and `DELETE`, while auth and special-purpose routes expose narrower operations.
- Core CRUD list and get endpoints exclude archived rows by default so archived records do not mix with active records.
- Archived CRUD resources can be restored with `POST /api/v1/<resource>/:id/restore` when `ARCHIVE_RECORDS_ENABLED=true`.
- `incidents` and `assignments` validate foreign key references before insert.
- `POST /api/v1/incidents/media/upload` accepts either a single JSON file payload or a `files` array, uploads each file to Supabase Storage, and returns `mediaUrls` you can place into `mediaUrls` on incident create/update requests.
- CRUD `DELETE` endpoints now archive records by setting `archivedAt` instead of permanently removing them.
- Restore endpoints return `409` when archive mode is disabled or the archived record still depends on other archived parent records.
- When incident media is replaced, Supabase-hosted files are archived under the configured archive prefix by default instead of being left in place.
- When an incident itself is archived, its media objects remain in place so the incident can be restored later.
- Validation failures return HTTP 422.
- Role requirements differ by route and are documented in OpenAPI.

## List Query Contract

All list endpoints support shared query parameters:

- `page`, `pageSize`
- `search`
- `sortBy`, `sortOrder`
- `includeArchived`, `archivedOnly`
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

Archive scope flags:

- `includeArchived=true` returns active and archived rows together for archive-enabled resources.
- `archivedOnly=true` returns only archived rows for archive-enabled resources.
- `includeArchived=true` and `archivedOnly=true` together are rejected with `422`.

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
- Dashboard AI prompt for the current role/capability model: `docs/dashboard-role-capability-update-prompt.md`

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
  - `POST /api/v1/auth/password-reset/request`
  - `POST /api/v1/auth/password-reset/confirm`
  - `POST /api/v1/auth/refresh`
- Session endpoints:
  - `GET /api/v1/auth/me` with `Authorization: Bearer <token>`
  - `GET /api/v1/auth/sessions` with `Authorization: Bearer <token>`
  - `POST /api/v1/auth/logout` with `Authorization: Bearer <token>`
  - `DELETE /api/v1/auth/sessions/:id` with `Authorization: Bearer <token>`
- Privileged-role MFA management endpoints:
  - `POST /api/v1/auth/mfa/setup`
  - `POST /api/v1/auth/mfa/enable`
  - `POST /api/v1/auth/mfa/disable`
- Successful login, registration, and refresh responses include `sessionId`, `expiresAt`, and `refreshExpiresAt` for the active server-side auth session.
- Login and registration now also return a `refreshToken`; `POST /api/v1/auth/refresh` rotates that token and returns a replacement pair.
- `POST /api/v1/auth/password-reset/request` always returns a generic acceptance response. Outside production, it also returns a temporary reset token for local development/testing flows until email delivery is added.
- `POST /api/v1/auth/password-reset/confirm` accepts the one-time reset token plus a new password, updates the password, and revokes all active sessions for that user.
- JWTs are now backed by persistent `auth_sessions` rows and are revoked immediately on logout.
- Refresh tokens are one-time rotation tokens bound to the same server-side auth session.
- `GET /api/v1/auth/sessions` returns the caller's session inventory for account security UI, including `isCurrent`, expiry timestamps, revocation state, user agent, and IP address metadata.
- `DELETE /api/v1/auth/sessions/:id` revokes one owned session by id and is intended for targeted sign-out from other devices.
- `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`, `CITY_CONTENT_EDITOR`, `DISPATCHER`, and `AUDITOR` accounts can enable TOTP MFA. Once enabled, login requires `mfaCode` in addition to email and password.
- Enabling or disabling MFA revokes all active sessions for that user.
- Password changes and role changes revoke all active sessions for the affected user.
- Archived users are excluded from login, token resolution, MFA operations, and password reset flows.
- Elevated JWT routes include:
  - `GET /api/v1/admin/users`, `GET /api/v1/admin/users/mfa-compliance`, and `GET /api/v1/admin/users/access-review` for `NATIONAL_ADMIN`
  - `GET /api/v1/admin/security/data-governance` for LGU admin roles and `AUDITOR`
  - `GET /api/v1/audit-logs` and `GET /api/v1/audit-logs/:id` for `NATIONAL_ADMIN` and `AUDITOR`
  - citizen create/list/get/update/delete for admin roles
  - user CRUD for admin roles
  - agency/responder/status/category/severity writes for admin roles
- `GET /api/v1/users/capabilities` is available to any authenticated user and returns role metadata, permissions, scope, and convenience booleans.
- Incident access uses JWT for all list/get/write operations:
  - `CITIZEN_REPORTER` can use `/api/v1/incidents/report`
  - `CITIZEN_REPORTER` incident list/get is scoped by backend logic to that user's own incidents
  - `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`, `DISPATCHER`, and `RESPONDER` can access broader incident operations based on route requirements
- `POST /api/v1/citizens/link-me` requires a `CITIZEN_REPORTER` JWT and links the citizen profile to the authenticated email.

Password policy:

- Passwords must be at least 12 characters and include uppercase, lowercase, number, and special character.

Seeded development logins:

- `admin@xypes.local` / `Password123!` (role: `NATIONAL_ADMIN`)
- `regional.director@xypes.local` / `Password123!` (role: `REGIONAL_DIRECTOR`)
- `supervisor@xypes.local` / `Password123!` (role: `PROVINCIAL_ADMIN`)
- `ops.lead@xypes.local` / `Password123!` (role: `CITY_ADMIN`)
- `content.editor@xypes.local` / `Password123!` (role: `CITY_CONTENT_EDITOR`)
- `dispatcher@xypes.local` / `Password123!` (role: `DISPATCHER`)
- `responder@xypes.local` / `Password123!` (role: `RESPONDER`)
- `analyst@xypes.local` / `Password123!` (role: `CITIZEN_REPORTER`)
- `auditor@xypes.local` / `Password123!` (role: `AUDITOR`)
- `roxas.municipal.admin@xypes.local` / `Password123!` (role: `CITY_ADMIN`, jurisdiction: Roxas, Isabela)
- `roxas.content.editor@xypes.local` / `Password123!` (role: `CITY_CONTENT_EDITOR`, jurisdiction: Roxas, Isabela)
- `roxas.dispatcher@xypes.local` / `Password123!` (role: `DISPATCHER`, jurisdiction: Roxas, Isabela)
- `roxas.responder@xypes.local` / `Password123!` (role: `RESPONDER`, jurisdiction: Roxas, Isabela)

Seeded mobile content baseline:

- `tuguegarao-summer-water-advisory` is a published `home` advisory for the public mobile feed.
- `mytuguegarao-digital-permit-week` is a published `news` item for city-service communications.
- `cagayan-river-watch-alerts` is a published `alerts` item for urgent public updates.
- `barangay-cleanup-campaign-preview` is an unpublished draft that gives `CITY_CONTENT_EDITOR` and `CITY_ADMIN` a safe approval workflow example.

Seeded locality baseline:

- Region II `Cagayan Valley` is available in the default seed set.
- Province `Isabela` is seeded under Region II.
- `Roxas` is seeded under Isabela using PSGC code `023126000` and type `MUNICIPALITY`.
- `regional.director@xypes.local` is scoped to Region II, `supervisor@xypes.local` is scoped to Isabela, and the Roxas municipal staff accounts are scoped to the Roxas municipality record.

Role values:

- `NATIONAL_ADMIN`
- `REGIONAL_DIRECTOR`
- `PROVINCIAL_ADMIN`
- `CITY_ADMIN`
- `CITY_CONTENT_EDITOR`
- `DISPATCHER`
- `RESPONDER`
- `CITIZEN_REPORTER`
- `AUDITOR`

## Access Matrix

The table below summarizes the current route protection model. When `API_KEYS` or `API_KEY` is configured, assume `x-api-key` is also required for every versioned route except the explicit public bypasses under `/health`, `/openapi.json`, `/docs`, and `/auth/*`.

| Route Group                                                                                                                                         | Read Access                                                                                                             | Write Access                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/password-reset/request`, `/api/v1/auth/password-reset/confirm` | Public                                                                                                                  | Public                                                                                                                 |
| `/api/v1/auth/me`, `/api/v1/auth/sessions`, `/api/v1/auth/logout`                                                                                   | Any authenticated JWT user                                                                                              | Current session only                                                                                                   |
| `/api/v1/auth/sessions/:id`                                                                                                                         | N/A                                                                                                                     | Any authenticated JWT user, limited to own session                                                                     |
| `/api/v1/auth/mfa/setup`, `/api/v1/auth/mfa/enable`, `/api/v1/auth/mfa/disable`                                                                     | `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`, `CITY_CONTENT_EDITOR`, `DISPATCHER`, `AUDITOR` | Current session only                                                                                                   |
| `/api/v1/citizens`                                                                                                                                  | `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`                                                 | `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`                                                |
| `/api/v1/citizens/link-me`                                                                                                                          | N/A                                                                                                                     | `CITIZEN_REPORTER`                                                                                                     |
| `/api/v1/agencies`                                                                                                                                  | `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`, `DISPATCHER`                                   | `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`                                                |
| `/api/v1/responders`                                                                                                                                | `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`, `DISPATCHER`                                   | `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`                                                |
| `/api/v1/statuses`                                                                                                                                  | Any authenticated JWT user                                                                                              | `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`                                                |
| `/api/v1/categories`                                                                                                                                | Any authenticated JWT user                                                                                              | `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`                                                |
| `/api/v1/severities`                                                                                                                                | Any authenticated JWT user                                                                                              | `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`                                                |
| `/api/v1/incidents`                                                                                                                                 | Any authenticated JWT user. `CITIZEN_REPORTER` is scoped to own incidents only.                                         | `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`, `DISPATCHER`, `RESPONDER`                     |
| `/api/v1/incidents/media/upload`                                                                                                                    | N/A                                                                                                                     | `CITIZEN_REPORTER`, `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`, `DISPATCHER`, `RESPONDER` |
| `/api/v1/incidents/report`                                                                                                                          | N/A                                                                                                                     | `CITIZEN_REPORTER`                                                                                                     |
| `/api/v1/assignments`                                                                                                                               | `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`, `DISPATCHER`                                   | `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`, `DISPATCHER`                                  |
| `/api/v1/users`                                                                                                                                     | `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`                                                 | `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`                                                |
| `/api/v1/users/capabilities`                                                                                                                        | Any authenticated JWT user                                                                                              | N/A                                                                                                                    |
| `/api/v1/admin/users`                                                                                                                               | `NATIONAL_ADMIN`                                                                                                        | N/A                                                                                                                    |
| `/api/v1/admin/users/mfa-compliance`, `/api/v1/admin/users/access-review`                                                                           | `NATIONAL_ADMIN`                                                                                                        | N/A                                                                                                                    |
| `/api/v1/admin/security/data-governance`                                                                                                            | `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`, `AUDITOR`                                      | Read-only                                                                                                              |
| `/api/v1/audit-logs`                                                                                                                                | `NATIONAL_ADMIN`, `AUDITOR`                                                                                             | Read-only                                                                                                              |

Notes:

- API key middleware and JWT middleware are layered. Passing one does not satisfy the other when both are required.
- `CITIZEN_REPORTER` users can bootstrap citizen/mobile flows through registration, `link-me`, and `incidents/report`, but cannot access admin-managed resources.
- Archive restore routes reuse the same write-role gates as their parent resources.
- Archive-scope list flags are only meaningful for archive-enabled resources; audit logs remain normal read-only records and are not archived.
- `API_KEY` and `API_KEYS` are merged by the middleware. If both are set, values from both sources remain valid.

## Audit Logging

Persistent audit logging is enabled through the API layer and stored in the `audit_logs` table.

- Audit log read routes:
  - `GET /api/v1/audit-logs`
  - `GET /api/v1/audit-logs/:id`
- Audit log reads require both a valid API key when configured and a JWT for `NATIONAL_ADMIN` or `AUDITOR`.
- The backend records selected auth and mutation events, including:
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/password-reset/request`
  - `POST /api/v1/auth/password-reset/confirm`
  - `POST /api/v1/auth/mfa/setup`
  - `POST /api/v1/auth/mfa/enable`
  - `POST /api/v1/auth/mfa/disable`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
  - `DELETE /api/v1/auth/sessions/:id`
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

`npm test` invokes `scripts/runJestWithTestDb.js`, which first checks the `.env.test` `DATABASE_URL` and then auto-starts the bundled local test database when the target is the default local harness and it is not reachable yet.

Coverage includes route behavior, validation, security middleware, and health/docs endpoints.

For a local test database that matches CI, use the bundled Postgres container workflow:

```bash
npm run test:db:up
npm run test:db:reset
npm run test:db:seed
npm test
```

This uses the bundled PostgreSQL 16 test database on `localhost:55432` with the same local defaults used by `.env.test`:

- database: `xypes_test`
- username: `postgres`
- password: `postgres`

When `npm test` runs locally, the wrapper first tries the configured `.env.test` database. If that target is the bundled local harness on `localhost:55432` and it is not reachable yet, the wrapper starts the local test DB automatically before invoking Jest. It prefers `docker compose` through `scripts/runTestDbCompose.sh` and falls back to `embedded-postgres` when compose is unavailable.

By default the bundled local container is exposed on `localhost:55432` so it does not conflict with an existing PostgreSQL instance on `5432`. CI still injects its own database on `5432` through environment variables, so the automated workflows are unchanged.

When you are done:

```bash
npm run test:db:down
```

Notes:

- This is the recommended setup for local development and Jest runs.
- Do not point local tests at the droplet or production database.
- If you want a different local port, set `TEST_DB_PORT=<port>` before `npm run test:db:up` and update `.env.test` or your shell overrides to match.
- The npm scripts support both `docker compose` and the older `docker-compose` binary.
- `npm run test:local` is the explicit reset-and-seed path: it brings the container up, resets the test schema, seeds it, and then runs Jest.

If `.env.test` points to a local placeholder database, provide a reachable `DATABASE_URL` and `JWT_SECRET` at command time, for example:

```bash
DATABASE_URL=postgresql://postgres:<password>@localhost:55432/xypes_test JWT_SECRET=<test-secret> npm test
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
