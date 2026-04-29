# Production Readiness Checklist

This checklist is for deciding whether the API is safe to release, observable in production, and likely to fail in bounded, diagnosable ways instead of silently or catastrophically.

## Release Gate

Ship only when all of these are true:

1. `npm test` passes on the intended release commit.
2. `npm run build` passes on the intended release commit.
3. `npm run docs:dashboard-config:check` passes so the emitted dashboard contract is not stale.
4. Real schema migration rehearsal has been run on a restored production-like database snapshot.
5. A black-box smoke run against a running environment passes.
6. Post-deploy health and smoke checks pass before the deployment is called complete.
7. Sentry, logs, and alerts are wired and watched for a fixed post-release window.

## What Is Already Covered In This Repo

- CI verifies source tests, Prisma schema validation, generated dashboard-contract drift, production dependency audit, secret scanning, and CodeQL via [security-checks.yml](/home/nhad/xypes/xypes-cirs-api/.github/workflows/security-checks.yml) and [codeql-analysis.yml](/home/nhad/xypes/xypes-cirs-api/.github/workflows/codeql-analysis.yml).
- Deploy verification already blocks release if the generated dashboard docs drift or the bundled runtime is syntactically invalid via [deploy.yml](/home/nhad/xypes/xypes-cirs-api/.github/workflows/deploy.yml).
- Integration coverage is already strong for auth, incidents, users, agencies, responders, assignments, audit logs, mobile flows, RBAC, and several security-sensitive regressions under [src/**tests**](/home/nhad/xypes/xypes-cirs-api/src/__tests__).

## What You Still Need Before Calling It Production Ready

### 1. Black-Box Environment Verification

Use the remote smoke script in [scripts/smokeRemote.ts](/home/nhad/xypes/xypes-cirs-api/scripts/smokeRemote.ts) against a running deployment, not the in-process app.

Run:

```bash
SMOKE_BASE_URL=https://api.example.gov \
SMOKE_API_KEY=your-api-key \
SMOKE_ADMIN_EMAIL=admin@example.gov \
SMOKE_ADMIN_PASSWORD='your-password' \
npm run smoke:remote
```

Optional environment variables:

- `SMOKE_CITIZEN_EMAIL`
- `SMOKE_CITIZEN_PASSWORD`
- `SMOKE_CASE_TOKEN`
- `SMOKE_API_BASE_PATH`

The script verifies:

- health
- public mobile content
- optional public case lookup
- admin login
- `GET /auth/me`
- `GET /users/capabilities`
- `GET /users`
- admin reports
- audit-log listing
- session inventory when enabled
- refresh-token rotation when enabled
- logout and post-logout token rejection
- optional citizen mobile profile and incident list checks

### 2. Migration Rehearsal

Before every real release:

1. Restore a recent production-like database snapshot into staging.
2. Apply the exact release migrations and SQL patches.
3. Boot the built server artifact, not the dev server.
4. Run the remote smoke script against that staging environment.
5. Confirm rollback instructions still work if the app or migrations fail.

Do not treat Jest table bootstrap coverage as proof that the real migration path is safe.

### 3. Post-Deploy Verification

Add or enforce these operational checks after deployment:

1. `GET /api/v1/health`
2. Remote smoke run against the deployed environment
3. Alert and log review during a fixed watch window
4. Rollback if the health or smoke checks fail

The current deploy workflow restarts the app, but it does not yet prove the deployed instance is healthy from the outside.

### 4. Load, Soak, and Failure Testing

Add staged verification for:

- login burst and refresh-token rotation
- filtered incident reads
- assignment list and mutation paths
- audit-log listing
- public case lookup rate limiting
- optional media upload and media access when storage is enabled

Also test failure modes explicitly:

- database unavailable or slow
- Supabase unavailable
- password-reset webhook failure
- revoked or expired refresh tokens
- missing or invalid API key
- missing required production env vars
- rate-limit saturation

The target is fail-closed behavior with diagnosable logs and expected 4xx or 5xx responses.

### 5. Backups, Restore, and Rollback

You need a repeatable operational drill that proves:

- backups can be restored
- the restored app boots
- core reads and writes still work
- audit logs remain readable
- rollback can be executed quickly under pressure

## Current Highest-Risk Test Gaps

These are the highest-value additions based on the current route surface and test suite.

### Critical

- Geography CRUD endpoints have no direct endpoint tests: `/regions`, `/provinces`, `/cities-municipalities`, `/barangays`.
- Real migration rehearsal is not the same thing as the current Jest bootstrap in [src/**tests**/setup.ts](/home/nhad/xypes/xypes-cirs-api/src/__tests__/setup.ts).

### Medium-High

- Public case lookup does not have a dedicated `cases` test file; most coverage is indirect through incidents tests.
- Feature-gated incident media upload and managed media access need direct end-to-end coverage when that profile is enabled.
- Auditor-specific incident read surfaces deserve stronger direct coverage, especially list and detail reads.

### Medium

- Session invalidation after destructive user actions should be asserted as a black-box behavior, not just assumed from auth-session internals.
- Rate-limit threshold behavior needs more direct end-to-end checks for 429 responses and abuse boundaries.
- API-key edge cases and bypass-path regressions should be exercised directly in a deploy-facing smoke path.

## Recommended Next Additions

1. Add a dedicated geography integration suite.
2. Add a dedicated public case lookup suite.
3. Add a feature-gated media-upload integration suite.
4. Wire remote smoke into staging or post-deploy automation.
5. Add a written rollback and restore runbook.

## Minimum Confidence Standard

If you want a practical rule, do not call the API production ready until all of these are true on the release commit:

1. CI passes.
2. Staging migration rehearsal passes.
3. Remote smoke against staging passes.
4. Post-deploy smoke passes.
5. Observability is live and watched.
6. Backups and rollback have been drilled at least once.
