# CIRS API — Copilot Instructions

This is the CIRS API repository. It is the **source of truth** for the data model, authorization rules, and the `/api/v1` contract consumed by the CIRS Dashboard and MyTuguegarao mobile app.

## Stack

- Express 5, TypeScript, Node 18+
- Prisma ORM against PostgreSQL (or Supabase-backed Postgres)
- Jest + Supertest for integration tests (DB via `docker-compose.testdb.yml`, started with `npm run test:db:up`)
- API base path: `/api/v1`

## Repository layout

- `src/controllers/` — request handlers and CRUD exports
- `src/routes/` — Express routing and middleware composition
- `src/services/` — business logic and provider integration
- `src/middleware/` — auth, audit, rate limiting, error handling, request safety
- `src/utils/` — shared helpers (e.g. `listQueryConfig.ts`)
- `src/engine/` — generic CRUD factory (`crudControllerFactory.ts`, `routeFactory.ts`, `validatorFactory.ts`, `types.ts`)
- `src/__tests__/` — Jest + Supertest integration tests, with `setup.ts` and `helpers/`
- `src/types/auth.ts` — role definitions, `ROLE_PROFILES`, `canManageRole`, role group constants
- `src/featureSelection.ts` — runtime feature flags and provider mode resolution
- `prisma/` — `schema.prisma` plus hand-authored SQL migrations

## Architecture

- API is versioned under `/api/v1`, mounted from `src/app.ts`.
- Standard reference and operational resources should use the **CRUD factory** under `src/engine`. Do not hand-roll generic CRUD.
- **Incidents are not generic CRUD.** They include reporting, status progression, trust metadata, public case lookup, timeline exposure, jurisdiction logic, and other custom behavior. Treat incidents as a custom domain.
- **Archive pattern** uses `archivedAt` for soft delete. Preserve active-record filtering, restore safety, and parent-child integrity.
- Prisma models and SQL migration scripts must stay aligned. Schema changes touch shape, indexes, archive semantics, seed behavior, and rollout safety together.

## LGU-First Product Direction

Default to **Tuguegarao-first** rollout, then partner-LGU expansion. City and barangay operations come before national integration. Province-aware coordination only where escalation or shared services make sense. Avoid national-first abstractions that make local workflows harder to reason about.

When jurisdiction is modeled, prefer canonical city + barangay identifiers over freeform locality strings. Use Tuguegarao and comparable partner LGUs as the default planning context.

See [docs/tuguegarao-pilot-governance-baseline.md](../docs/tuguegarao-pilot-governance-baseline.md).

## Security and privacy

Default posture is **fail-closed**.

- Public endpoints must be privacy-safe. Expose only the minimum needed for case lookup, status visibility, or incident timelines.
- Never accept actor identity from request payloads, IDs, headers, or route params when JWT subject is the source of truth.
- Never leak raw JWTs, case tokens, or secrets into logs, error payloads, URLs, or debug output.
- Scope access by the narrowest valid jurisdiction (city, barangay, province, assigned-responder, citizen-self).
- Maintain strict boundaries between public, citizen, responder, dispatcher, administrator, and auditor access.
- Preserve audit logging for security-sensitive and state-changing operations.
- Treat public trust endpoints as an attack surface (redaction, token handling, rate limiting, enumeration resistance).

If an endpoint is ambiguous about who should see data, **return less or deny** until the boundary is explicit.

Privacy program references:

- [docs/privacy-management-program.md](../docs/privacy-management-program.md)
- [docs/privacy-impact-assessment-pilot.md](../docs/privacy-impact-assessment-pilot.md)
- [docs/privacy-incident-playbook.md](../docs/privacy-incident-playbook.md)
- [docs/lawful-basis-register.md](../docs/lawful-basis-register.md)
- [docs/data-processing-system-description.md](../docs/data-processing-system-description.md)
- [docs/access-review-template.md](../docs/access-review-template.md)
- [docs/retention-schedule-template.md](../docs/retention-schedule-template.md)

## Code conventions

- Keep changes additive and backward-compatible unless the task explicitly authorizes a breaking change.
- Use the CRUD factory for standard resources. Keep incidents in their custom architecture.
- Put reusable domain logic in services or utilities, not duplicated in route handlers.
- Reuse role groups and auth helpers from `src/types/auth.ts` and the auth middleware.
- Preserve the archive pattern through `archivedAt`, guard checks, and restore safety.
- Keep Prisma schema and SQL migration files aligned.
- Prefer explicit validation, scoping, and includes over broad or permissive defaults.

## Testing and validation

- Prefer targeted Jest + Supertest runs against the affected resource.
- Add or update integration tests in `src/__tests__/` for auth boundaries, public exposure, jurisdiction scoping, trust-layer behavior, and archive semantics.
- Verify both success and **denial** paths for security-sensitive behavior.
- For CRUD resources, validate list, create, update, delete or archive, and restore.
- For incidents and public trust endpoints, validate privacy-safe responses, token handling, status visibility, and non-disclosure of internal-only fields.
- Run build or type validation after non-trivial changes.

Test infra reference: [docs/api-setup-guide.md](../docs/api-setup-guide.md).

## Backward compatibility

- Avoid changing response shapes, required fields, enum semantics, or auth behavior unless necessary.
- Prefer additive fields and endpoints over mutating existing contracts.
- Preserve route semantics under `/api/v1`.
- Keep future client compatibility in mind, especially the dashboard (`/home/nhad/xypes/xypes-cirs-dashboard`) and mobile (`/home/nhad/xypes/MyTuguegarao`) — but do not distort backend decisions to pre-optimize for them.

## Deployment and runtime

Feature selection drives auth provider, token mode, MFA, media storage, and archive behavior at runtime. See:

- [docs/feature-profiles-guide.md](../docs/feature-profiles-guide.md)
- [docs/featureSelection.js](../docs/featureSelection.js)
- [docs/production-quick-checklist.md](../docs/production-quick-checklist.md)
- [docs/production-readiness-checklist.md](../docs/production-readiness-checklist.md)
- [docs/production-service-runbook.md](../docs/production-service-runbook.md)
- [docs/production-env-templates.md](../docs/production-env-templates.md)
- [docs/supabase-project-setup.md](../docs/supabase-project-setup.md)
- [docs/supabase-all-setup.md](../docs/supabase-all-setup.md)

## Cross-repo coordination

- Dashboard CRUD config at [docs/dashboard-crud-config.flat.json](../docs/dashboard-crud-config.flat.json) must stay aligned with backend route, method, resource, and permission expectations. Treat drift as a real bug.
- For multi-repo work, see the user-level `xypes-platform-orchestrator` agent. Do not cross repo boundaries inside backend changes — return cross-repo notes instead.

## Available agents

Local specialists in `.github/agents/`:

- `orchestrator` — multi-step coordinator
- `schema-architect` — Prisma + SQL design, archive-safe relations, jurisdiction modeling
- `rbac-engineer` — roles, scoping, MFA, public vs internal boundaries
- `crud-builder` — controllers, routes, validators, factory CRUD, incident-adjacent runtime
- `infra-engineer` — `featureSelection.ts`, providers, rate limiting, deployment, optional Redis/PostGIS/SSE
- `test-writer` — Jest + Supertest matrices, denial paths, public privacy
- `reviewer` — read-only OWASP, privacy, jurisdiction, rollout safety review
