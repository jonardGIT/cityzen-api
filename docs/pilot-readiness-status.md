# Pilot Readiness Status

Last reviewed: 2026-05-20

## Current Verdict

The CIRS API is pilot-capable for the core Tuguegarao-first workflow, but it is not yet fully release-proven.

In repository terms, the backend already exposes the main pilot service surface, has broad automated coverage, and publishes the dashboard contract from the API repo. The remaining gaps are mostly live-environment proof and external operating-governance evidence, not obvious missing core backend features. As of 2026-05-25, pre-production remote smoke reached the deployed environment, proved authenticated admin access when run with the deployed API key and a current MFA code, and then failed its post-logout verification because `GET /auth/me` returned `503` and `POST /auth/refresh` returned `400` after logout.

## Confirmed In The Repo

### Core service surface is implemented

The API currently mounts these route groups from `src/app.ts`:

- `citizens`
- `agencies`
- `responders`
- `statuses`
- `categories`
- `severities`
- `incidents`
- `cases`
- `assignments`
- `users`
- `audit-logs`
- `regions`
- `provinces`
- `cities-municipalities`
- `barangays`
- `incident-escalations`
- `mutual-aid-requests`
- `auth`
- `privacy-requests`
- `admin`
- `mobile`
- `mobile-content`

This is materially beyond a minimal CRUD backend and is sufficient for the intended city-first pilot boundary.

### Core pilot flow has direct automated coverage

`src/__tests__/e2eFlows.test.ts` exercises a realistic operational path covering reference data, citizen records, agencies, responders, incidents, assignments, status changes, and deletion guards.

### Contract ownership and drift checks exist

The dashboard contract is generated from this repo and checked with:

- `npm run docs:dashboard-config`
- `npm run docs:dashboard-config:check`

This remains the contract source of truth for the dashboard and mobile clients.

### Release-oriented checks already exist in code or workflow form

The repo already includes:

- `npm test`
- `npm run build`
- `npm run smoke:remote`
- CI and deploy workflow checks under `.github/workflows/`

## What Still Blocks A Stronger Readiness Claim

These items remain open unless they are proven in a real environment.

### Operational proof is still required

- Run a migration rehearsal against a restored production-like database snapshot using `docs/migration-rehearsal-restored-snapshot.md`.
- Run `npm run smoke:remote` against a real deployed environment and capture one clean fully passing record, including the post-logout checks, with the deployed API key and a current MFA code or a dedicated non-MFA smoke account.
- Verify post-deploy health, alerting, and a monitored watch window.
- Complete at least one backup, restore, and rollback drill.

### Some service surfaces still need stronger deploy-facing proof

The current repo now has direct in-repo HTTP coverage for these backend surfaces:

- geography CRUD route surface
- public case lookup privacy behavior
- privacy-request workflow
- privacy-incident admin workflow
- rate-limit threshold behavior

That closes the earlier repo-level proof gap for those routes. The remaining issue is deploy-facing and live-environment confidence, especially:

- remote smoke against a real deployment
- operational drills for migration, rollback, and restore
- post-deploy watch-window verification
- broader black-box checks for feature-gated media upload and access

### External governance and pilot-operations evidence is still missing

The most important non-code blockers are documented in `docs/privacy-external-blockers-report.md` and include:

- DPO and executive sign-off
- finalized processor and residency facts
- live privileged-access review evidence
- approved retention decisions
- published public privacy notice with real contact details

## Practical Pilot Readiness Summary

Use this wording unless the live environment evidence above has been completed:

> The API appears ready for a controlled Tuguegarao-first pilot from a code and contract perspective, but it should not be described as fully production-ready until live migration rehearsal, one clean fully passing remote smoke run, monitoring verification, watch-window checks, rollback drills, and external governance approvals are complete.

## Current Pre-Production Smoke Status

- `npm run build`: passed locally on the current release candidate workspace.
- `npm run docs:dashboard-config:check`: passed locally on the current release candidate workspace.
- `npm run smoke:remote`: partially proven against `https://x1.dev.xypes.com`.

What passed:

- health and public-content checks reached the deployed environment successfully
- the environment appears reachable and correctly mounted at `/api/v1`
- authenticated admin login succeeded with a current MFA code
- protected admin and audit routes succeeded when the deployed `x-api-key` was supplied

What is still missing:

- one clean fully passing smoke run through the post-logout checks
- a captured smoke record that shows `/auth/me` and `/auth/refresh` fail closed with the expected statuses after logout in the deployed environment

Current blocker:

- the latest remote smoke run failed its final post-logout checks even after admin login and protected admin routes passed
- `GET /auth/me` returned `503` instead of the expected revoked-session `401`
- `POST /auth/refresh` returned `400` instead of the expected invalid-refresh-token `401`
- this is no longer an MFA freshness problem; it is now a deployed post-logout auth-behavior mismatch that needs investigation

### Running smoke with the current pre-production env

For the current pilot workflow, the API smoke script may use the repo's current `.env` file when that file reflects the real pre-production environment.

Operational rule:

- use `.env` only when it is the intended pre-production configuration source
- export the required values into the shell before running `npm run smoke:remote`
- do not assume the script reads `.env` automatically unless the command explicitly loads it

Minimum values to provide to the script:

- `SMOKE_BASE_URL`
- `SMOKE_API_KEY` or the first value from `API_KEYS` when that matches the deployed API policy
- `SMOKE_ADMIN_EMAIL`
- `SMOKE_ADMIN_PASSWORD`
- `SMOKE_ADMIN_MFA_CODE` when the smoke account requires MFA

For the current pre-production environment, the intended API origin is `https://x1.dev.xypes.com`.

## Manual Pilot Checklist

Use this as the human signoff list alongside the automated smoke script.

Current startup ownership model for this checklist:

- Formal operating entity: Xypes Technologies
- Business owner and final business signoff: Dennis M. Tobias
- Technical owner, smoke-test executor, deploy operator, and rollback executor: Jonard M. Delos Santos

1. Confirm the deployed pre-production or pilot API URL is the intended environment.
2. Verify `GET /api/v1/health` succeeds from outside the cluster or host.
3. Verify privileged admin login works with the intended pilot account, including MFA when required.
4. Verify the deployed API key is supplied for protected non-auth routes during smoke.
5. Verify `GET /api/v1/auth/me` returns the expected authenticated user.
6. Verify `GET /api/v1/users/capabilities` returns the expected capability set for the pilot operator.
7. Verify key pilot endpoints respond for the real role mix: incidents, assignments, users, audit logs, and mobile incident reporting.
8. Verify logout revokes the current session in the deployed environment and that both `GET /api/v1/auth/me` and `POST /api/v1/auth/refresh` fail closed with the expected statuses afterward.
9. Confirm public and citizen-facing endpoints remain privacy-safe and do not expose internal-only fields.
10. Confirm seeded baseline reference data exists in the live environment, especially statuses, categories, severities, and locality references required by the pilot flows.
11. Verify API key, CORS, Supabase auth, password-reset delivery, and privacy-governance environment variables are loaded as intended.
12. Confirm logs and alerts are available for the watch window and that a named owner will review them.
13. Confirm backup, restore, and rollback procedures are documented and owned for the pilot window.
14. Record who performed the check, which account and role were used, what environment was tested, and any unresolved blockers.

For the migration-specific drill, use `docs/migration-rehearsal-restored-snapshot.md` as the release runbook and `/home/nhad/xypes/shared/ROLLBACK_RESTORE_RUNBOOK.md` for rollback or restore decisions.

Current assignment for pilot evidence:

- business signoff and pilot approval: Dennis M. Tobias
- technical validation, smoke completion, and rollback readiness evidence: Jonard M. Delos Santos

## Immediate Next Checks

1. Run `npm run docs:dashboard-config:check` on the release candidate.
2. Run `npm test` and `npm run build` on the release candidate.
3. Rehearse migrations on a restored staging snapshot using `docs/migration-rehearsal-restored-snapshot.md`.
4. Investigate the deployed post-logout mismatch where `/auth/me` returned `503` and `/auth/refresh` returned `400` after logout, then rerun `npm run smoke:remote` against staging or pre-production and capture the fully passing output.
5. Complete the external privacy and access-review evidence listed in `docs/privacy-external-blockers-report.md`.
