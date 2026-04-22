# Clone API Upgrade Prompt: Auth, JWT, Audit Logging, RLS, and Supabase Storage

Use this prompt in the older cloned API repository that still predates the current auth/session/security rollout.

## Goal

Upgrade the cloned API to match the current backend security and auth model implemented in the source repository.

The clone currently lacks some or all of these features:

- modern auth bootstrap and session lifecycle
- JWT and refresh-token session management
- privileged-user MFA support
- password reset token flows
- persistent audit logging
- user capability metadata and stricter role normalization
- Supabase-linked auth compatibility
- Supabase Storage integration for media uploads
- baseline Supabase/Postgres RLS policy support

Bring the clone to functional parity with the current implementation style and behavior of the source repo, while preserving its existing resource routes and business behavior unless a security upgrade requires a change.

## Primary Instruction

Treat the current repository as the reference implementation.

Before changing code in the clone:

1. Inspect the clone's current structure and identify the equivalent files for app bootstrap, auth, middleware, Prisma schema, SQL scripts, tests, docs, and env handling.
2. Compare them to the reference implementation in the source repo.
3. Port the current security/auth architecture into the clone in focused steps instead of partially copying isolated files.

Do not guess response shapes or route behavior from the older clone. Match the current backend contract and code patterns from the source repo.

## Features To Port

### 1. Auth foundation

Implement the current auth system with:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/sessions`
- `DELETE /api/v1/auth/sessions/:id`

Expected behavior:

- access tokens are JWT bearer tokens
- refresh tokens are stored server-side through persistent auth sessions
- refresh rotates tokens
- logout revokes the current session
- password changes and role changes revoke active sessions

### 2. MFA

Port privileged-role MFA support.

Implement:

- `POST /api/v1/auth/mfa/setup`
- `POST /api/v1/auth/mfa/enable`
- `POST /api/v1/auth/mfa/disable`

Current expectations:

- privileged roles in the current backend are `SYSTEM_ADMIN`, `DEPARTMENT_MANAGER`, `SUPERVISOR`, and `DISPATCHER`
- if the clone still uses legacy role names, map them into the current privileged-role intent before porting MFA and session-revocation behavior
- local MFA requires `MFA_ENCRYPTION_KEY`
- current backend also supports optional Supabase-backed TOTP mode when configured
- enabling or disabling MFA revokes active sessions

### 3. Password reset

Implement the password reset token flow:

- `POST /api/v1/auth/password-reset/request`
- `POST /api/v1/auth/password-reset/confirm`

Expected behavior:

- reset tokens are hashed in storage
- reset tokens expire and are one-time use
- successful reset revokes active sessions

### 4. Role and capability model

Bring the clone to the current role model:

- `SYSTEM_ADMIN`
- `DEPARTMENT_MANAGER`
- `SUPERVISOR`
- `DISPATCHER`
- `RESPONDER`
- `CITIZEN_REPORTER`
- `AUDITOR`

Port the capability metadata endpoint:

- `GET /api/v1/users/capabilities`

Current role metadata should include:

- label
- permissions list
- scope
- `canUpdateUser`
- `canDeleteUser`

Normalize old legacy role values into the new role set in schema bootstrap and test setup.

### 5. Audit logging

Add persistent audit logging for selected auth and mutation flows.

Implement:

- `GET /api/v1/audit-logs`
- `GET /api/v1/audit-logs/:id`

Expected behavior:

- audit logs persist action, resource, outcome, actor metadata, targetId, method, path, statusCode, requestId, and optional metadata
- auth failures and selected mutating failures should be captured when they reach application handling
- audit-read access is restricted to `SYSTEM_ADMIN` and `AUDITOR`
- audit logs must support list-query filtering and sorting like the current backend

### 6. Supabase auth compatibility

Port the compatibility-first Supabase integration:

- `SUPABASE_AUTH_ENABLED`
- `SUPABASE_JWT_ENABLED`
- `SUPABASE_TOTP_ENABLED`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_AUTH_AUTO_CONFIRM_EMAIL`
- `SUPABASE_PASSWORD_RESET_REDIRECT_URL`

Expected design:

- local app mode still works when Supabase auth is disabled
- Supabase email/password auth can be enabled while still issuing app JWT/session tokens
- Supabase JWT mode can be enabled optionally
- Supabase TOTP mode depends on Supabase JWT mode
- local app user records remain the source of role/profile data
- users link to Supabase Auth with `users.supabaseAuthUserId`

### 7. Supabase Storage

Implement Supabase Storage support in the clone for incident or citizen-reported media uploads.

Use the clone's existing incident/media structure as the target integration point. In the current backend contract, incidents already carry a `mediaUrl` field, so storage support should fit that shape instead of introducing an unrelated media subsystem unless the clone architecture truly requires one.

Required expectations:

- add a backend-owned media upload flow that stores files in Supabase Storage
- persist the resulting file URL or storage-backed public URL into the existing `mediaUrl` field or equivalent clone field
- validate file metadata and reject unsupported payloads clearly
- keep bucket access design explicit: either public-read with controlled upload, or private bucket with signed URL generation
- do not expose service-role behavior directly to untrusted clients
- document bucket names, env vars, and expected URL behavior

Recommended implementation shape:

- if the clone already has file-upload middleware or a media endpoint, adapt it to upload to Supabase Storage
- if it does not, add a focused upload endpoint such as a media upload route used before or during incident creation
- if the clone currently accepts direct `mediaUrl` strings only, preserve backward compatibility when practical, but prefer a first-party upload flow for new clients

Suggested environment/config additions:

- `SUPABASE_STORAGE_ENABLED`
- `SUPABASE_STORAGE_BUCKET_INCIDENTS`
- `SUPABASE_STORAGE_PUBLIC_URL_TTL_SECONDS` if signed URLs are used

Security expectations:

- uploads must require normal API auth and role checks consistent with incident creation permissions
- if a citizen reporter can attach media, keep that capability scoped to self-service reporting flows
- audit log upload and media-association actions where consistent with the current audit model

### 8. Database schema and SQL scripts

Bring the clone's Prisma schema and SQL scripts up to parity for at least these areas:

- `users.supabaseAuthUserId`
- `users.mfaEnabled`
- `users.mfaSecretEncrypted`
- `users.mfaEnabledAt`
- `auth_sessions`
- `password_reset_tokens`
- `audit_logs`
- incident location snapshot fields if the clone still uses an older incident location contract
- role check constraint aligned to the current role set

### 9. Baseline RLS support

Add the baseline RLS policy script equivalent to the current repo's policy file.

Important requirement:

- be explicit that the current schema may not yet support true department or region enforcement in SQL
- only enforce self-owned and role-based scopes that the schema can actually prove
- keep sensitive auth tables API-only or service-role only

## Files To Use As Reference In The Source Repo

Use these current files as the reference implementation to port from:

- `src/controllers/authController.ts`
- `src/controllers/usersController.ts`
- `src/controllers/auditLogsController.ts`
- `src/middleware/jwtAuth.ts`
- `src/middleware/auditLog.ts`
- `src/services/authSessionService.ts`
- `src/services/passwordResetService.ts`
- `src/services/supabaseAuthService.ts`
- `src/types/auth.ts`
- `src/utils/mfa.ts`
- `src/controllers/incidentsController.ts`
- `src/validators/bodyValidators.ts`
- `src/types/models.ts`
- `src/docs/openapi.ts`
- `src/routes/auth.ts`
- `src/routes/users.ts`
- `src/routes/auditLogs.ts`
- `prisma/schema.prisma`
- `prisma/add-auth-sessions.sql`
- `prisma/add-password-reset-tokens.sql`
- `prisma/add-audit-logs.sql`
- `prisma/add-user-mfa.sql`
- `prisma/add-supabase-auth.sql`
- `prisma/add-rls-policies.sql`
- `README.md`
- `docs/project-handoff.txt`

Also port and adapt the relevant test patterns from:

- `src/__tests__/auth-bootstrap.test.ts`
- `src/__tests__/security.test.ts`
- `src/__tests__/auditLogs.test.ts`
- `src/__tests__/users.test.ts`
- `src/__tests__/supabaseJwt.test.ts`
- `src/__tests__/setup.ts`

## Implementation Constraints

- Keep the clone's existing API resource structure intact unless a security change requires route guard changes.
- Prefer focused patches over broad rewrites.
- Preserve backward-compatible fallback behavior where the current backend does.
- Do not remove existing working resource behavior while adding auth/session/audit features.
- Update OpenAPI docs and README in the clone to match the new auth/session contract.
- Add or update env examples in the clone.
- Keep media upload behavior aligned with the clone's current incident contract and avoid introducing a second competing media model.

## Recommended Order Of Work

1. Update the Prisma schema and additive SQL scripts.
2. Add auth sessions, refresh rotation, and logout/session revocation support.
3. Add MFA storage and endpoints.
4. Add password reset token support.
5. Add audit logging schema, middleware, service, routes, and docs.
6. Normalize the role model and add `/users/capabilities`.
7. Add optional Supabase auth/JWT/TOTP compatibility.
8. Add Supabase Storage support for media uploads and wire it into incident flows.
9. Add baseline RLS SQL.
10. Update tests until the full suite passes.

## Acceptance Criteria

Do not stop at partial implementation. The clone should only be considered updated when all of these are true:

- auth bootstrap, refresh, logout, and session inventory routes work
- privileged-role MFA works in local mode and remains configurable for Supabase mode
- password reset token flow works
- audit logs persist and are queryable through protected routes
- capability metadata endpoint returns the current role/permission model
- the role constraint and seeded/test users use the new role set
- optional Supabase auth flags are wired without breaking local fallback mode
- Supabase Storage is wired into the clone's media flow and documented clearly
- baseline RLS SQL is present and documented with current schema limitations
- OpenAPI and README are updated
- the clone's tests pass, including auth/security/audit coverage

## Final Delivery Expectations

When the implementation is complete in the clone, provide:

1. a concise summary of what was changed
2. the list of modified files
3. any required environment variables
4. any SQL scripts that must be run in order
5. the exact test command(s) executed and whether they passed
6. how media upload works end to end, including bucket configuration and URL behavior

If the clone is missing equivalent files or structure, adapt the implementation to its architecture, but keep the current backend behavior as the target state.
