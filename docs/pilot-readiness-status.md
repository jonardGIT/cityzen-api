# Pilot Readiness Status

Last reviewed: 2026-05-10

## Current Verdict

The CIRS API is pilot-capable for the core Tuguegarao-first workflow, but it is not yet fully release-proven.

In repository terms, the backend already exposes the main pilot service surface, has broad automated coverage, and publishes the dashboard contract from the API repo. The remaining gaps are mostly live-environment proof and external operating-governance evidence, not obvious missing core backend features.

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

- Run a migration rehearsal against a restored production-like database snapshot.
- Run `npm run smoke:remote` against a real deployed environment.
- Verify post-deploy health, alerting, and a monitored watch window.
- Complete at least one backup, restore, and rollback drill.

### Some service surfaces still need stronger deploy-facing proof

The current repo is strong on source-level coverage, but these areas still deserve explicit black-box or deploy-facing validation:

- geography CRUD routes
- public case lookup
- feature-gated media upload and access
- privacy-request and privacy-incident admin surfaces
- rate-limit threshold behavior

### External governance and pilot-operations evidence is still missing

The most important non-code blockers are documented in `docs/privacy-external-blockers-report.md` and include:

- DPO and executive sign-off
- finalized processor and residency facts
- live privileged-access review evidence
- approved retention decisions
- published public privacy notice with real contact details

## Practical Pilot Readiness Summary

Use this wording unless the live environment evidence above has been completed:

> The API appears ready for a controlled Tuguegarao-first pilot from a code and contract perspective, but it should not be described as fully production-ready until live migration rehearsal, remote smoke, monitoring verification, rollback drills, and external governance approvals are complete.

## Immediate Next Checks

1. Run `npm run docs:dashboard-config:check` on the release candidate.
2. Run `npm test` and `npm run build` on the release candidate.
3. Rehearse migrations on a restored staging snapshot.
4. Run `npm run smoke:remote` against staging or pre-production.
5. Complete the external privacy and access-review evidence listed in `docs/privacy-external-blockers-report.md`.
