# Tuguegarao-First Governance Baseline Sample

This document is a sample filled baseline for a Tuguegarao-first or partner-LGU pilot deployment of CIRS.

It is not a final adopted record. It is a concrete working example that shows how the compliance templates in this repository can be completed for a realistic pilot rollout.

## 1. Sample Deployment Context

- Operating authority: Tuguegarao City pilot deployment or comparable partner LGU
- Environment name: `CIRS Production`
- Primary operational scope: Tuguegarao City with city-level operational roles and province-aware coordination where required
- Review cadence:
  1. weekly monitoring of privacy requests and privacy incidents
  2. monthly privileged-access review
  3. quarterly processor and retention review
  4. annual policy and notice review

## 2. Sample Role Governance Baseline

The pilot should start with the narrowest role set needed for real operations.

Suggested live role baseline:

1. one city admin accountable for system oversight
2. one backup city admin for continuity only
3. a small dispatcher group limited to current active operations staff
4. responder accounts limited to current field users
5. one auditor or compliance reviewer where justified
6. no regional or national roles unless the deployment genuinely requires them

## 3. Sample Processor Baseline

For a Supabase-backed deployment with operational monitoring, the initial processor review should explicitly check:

1. hosting and runtime provider
2. database and direct database connection hosts
3. Supabase authentication if enabled
4. Supabase storage if incident media is enabled
5. monitoring platform such as Sentry if used
6. password-reset or escalation webhook destination

Sample processor posture notes:

1. if local auth is used, mark external auth provider as not applicable
2. if storage is disabled, mark media storage provider as not enabled in production
3. if a cross-border vendor is used, ensure the transfer references in the environment and processor register match the signed documentation

## 4. Sample Retention Starting Positions

These are sample starting positions only and still require DPO and records-management approval.

1. incident reports and linked attachments: keep according to the LGU-approved incident and accountability schedule
2. audit logs: keep according to the approved security and accountability schedule, with export if longer retention is required
3. privacy requests and privacy incidents: retain for the full governance and complaint-review period defined by the DPO
4. session and password-reset records: retain only for proportionate security-review periods unless linked to an investigation

## 5. Sample First 60-Day Governance Actions

1. approve the public privacy notice and lawful basis register
2. complete the processor register using actual vendors
3. finalize the retention schedule with DPO and records-office approval
4. perform the first privileged-access review after live account issuance
5. run one privacy-request tabletop exercise and one privacy-incident tabletop exercise
6. record the first governance sign-off pack

## 6. Sample Evidence Pack

For a pilot deployment, keep a clearly labeled folder or controlled repository location containing:

1. signed privacy governance policy draft or adopted policy
2. public privacy notice version
3. lawful basis register
4. processor register
5. retention schedule
6. access review records
7. training attendance records
8. privacy request records
9. privacy incident records

## 7. Pilot Contract Boundary

The pilot contract boundary is published from this repository as the source of truth for both the CIRS Dashboard and the MyTuguegarao mobile client. It is generated from `src/docs/dashboardCrudContract.ts` into `docs/dashboard-crud-config.json` and `docs/dashboard-crud-config.flat.json` via `npm run docs:dashboard-config`, and verified by `npm run docs:dashboard-config:check`.

The pilot boundary is declared in the contract as:

- `pilot.scope`: `tuguegarao-first`
- `pilot.partnerLguExpansion`: `planned`
- `pilot.governanceBaselineDoc`: `docs/tuguegarao-pilot-governance-baseline.md` (this file)

### Canonical citizen surface (mobile-citizen)

The `/mobile/*` namespace is the canonical entry surface for citizen mobile clients in the pilot. The contract publishes these under `mobileCitizenSurface.routes`:

1. `GET  /api/v1/mobile/content` (public)
2. `GET  /api/v1/mobile/profile`
3. `PATCH /api/v1/mobile/profile`
4. `GET  /api/v1/mobile/incidents`
5. `GET  /api/v1/mobile/incidents/{id}`
6. `GET  /api/v1/mobile/incidents/{id}/timeline`
7. `POST /api/v1/mobile/incidents/report`

Mobile auth bootstrap canonical paths:

- `POST /api/v1/auth/mobile/register`
- `POST /api/v1/auth/mobile/login`
- `POST /api/v1/auth/refresh`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout` (shared with dashboard)

### Compatibility-only aliases

The following routes remain functional for backward compatibility (dashboard self-link flows and pre-mobile clients) but are flagged `compatibility-only` in the contract under `mobileCitizenSurface.compatibilityRoutes`. New mobile clients should NOT prefer them:

- `POST /api/v1/citizens/link-me`  (superseded by `PATCH /api/v1/mobile/profile`)
- `POST /api/v1/incidents/report`  (superseded by `POST /api/v1/mobile/incidents/report`)
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login` (canonical for dashboard; compatibility for mobile)

### Backend authority

All authorization, jurisdiction scoping, citizen-self scoping, trust-layer rules, and privacy redactions are enforced server-side regardless of which surface a client uses. The contract's canonical-vs-compatibility classification is a client-preference signal only; it does not relax any backend boundary.

