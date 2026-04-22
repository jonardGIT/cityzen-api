# Backend Prompt: Password Reset Delivery And Account Recovery Hardening

Use this prompt when implementing the next backend security feature after the existing password reset token flow.

## Goal

Extend the current backend password reset and account recovery flow from local-development token exposure into a production-grade recovery workflow.

The backend already supports:

- `POST /api/v1/auth/password-reset/request`
- `POST /api/v1/auth/password-reset/confirm`
- one-time hashed password reset tokens
- session revocation after password reset
- audit logging for auth flows

The next feature is to make password reset delivery and recovery operationally safe for production.

## Source Of Truth To Read First

Before writing code, read these files:

- `src/controllers/authController.ts`
- `src/services/passwordResetService.ts`
- `src/services/authSessionService.ts`
- `src/middleware/auditLog.ts`
- `src/docs/openapi.ts`
- `README.md`
- `docs/security-gap-assessment.md`
- `prisma/schema.prisma`
- `prisma/add-password-reset-tokens.sql`
- `src/__tests__/auth-bootstrap.test.ts`
- `src/__tests__/setup.ts`

Do not replace the current reset-token flow with something incompatible. Build on the existing contract and preserve backward compatibility where practical.

## What Exists Today

Current behavior:

- `POST /auth/password-reset/request` accepts an email and always returns a generic acceptance message.
- In non-production environments, that endpoint may also return the reset token directly for local development/testing.
- `POST /auth/password-reset/confirm` accepts `token` and `password`, resets the password, and revokes all active sessions.
- Reset tokens are stored hashed in `password_reset_tokens`.
- Password reset is public and does not require login.
- Password policy is already enforced.

This is good for local testing, but it is not yet a complete production recovery system.

## Feature To Implement

Implement production-grade password reset delivery and account recovery hardening.

### Required backend outcomes

1. Password reset delivery abstraction

- Introduce a backend service abstraction for sending password reset messages.
- Support at least:
  - a development/local provider that can log or expose the reset token safely in non-production
  - a production-oriented provider interface that can be wired to real email delivery later
- Do not hardcode a third-party email vendor into controller logic.

2. Reset request handling

- Keep the response generic so account existence is not disclosed.
- Preserve the existing non-production developer experience where a reset token can still be surfaced for local testing.
- In production mode, do not return raw reset tokens in the API response.

3. Recovery abuse controls

- Add stronger protection around password reset request abuse.
- Use route-level and/or per-identity throttling appropriate for reset request flows.
- If you add a dedicated throttle policy, document why and where it applies.

4. Audit coverage

- Ensure reset request and reset confirm flows are fully auditable.
- Add useful metadata for recovery events without exposing secrets.
- Keep audit records safe for downstream monitoring.

5. Recovery policy for privileged users

- Add stricter behavior for `SUPER_ADMIN`, `ADMIN`, and `DISPATCHER` account recovery where appropriate.
- At minimum, document and implement safer backend rules than ordinary user recovery if the current product flow allows it.
- If you decide not to block privileged reset by default, explain the tradeoff in code comments only where necessary and document it.

6. OpenAPI and docs alignment

- Update `src/docs/openapi.ts` to describe the final behavior accurately.
- Update `README.md` if request/confirm behavior or environment requirements change.
- Keep the contract explicit about development vs production behavior.

7. Tests

- Add or update integration tests for:
  - generic response behavior
  - production-safe non-disclosure behavior
  - successful reset delivery flow in local/dev mode
  - password reset confirmation success
  - expired or reused token failure
  - session revocation after reset
  - any privileged-account-specific rule you add

## Technical Constraints

- Keep the existing auth/session/MFA model intact.
- Reuse current Prisma patterns and repository style.
- Prefer additive changes; do not break existing login, refresh, logout, MFA, or session endpoints.
- Keep secrets out of logs and API responses in production mode.
- Use focused services instead of bloating controller logic.
- Preserve strong TypeScript typing.
- If new database state is required, add additive SQL under `prisma/` and update `prisma/schema.prisma`.
- If a new env var is required, document it in `.env.example` and `README.md`.

## Suggested Design Direction

Use a small delivery service contract such as:

- `sendPasswordResetMessage({ email, resetToken, expiresAt, userId, role })`

Then provide:

- development implementation: safe local exposure/logging behavior
- production implementation: provider stub or real integration wrapper behind env-driven selection

Keep the auth controller unaware of delivery internals.

## Acceptance Criteria

- Production mode does not expose raw password reset tokens in API responses.
- Development/local mode still supports practical end-to-end testing.
- Reset delivery is abstracted behind a service, not embedded in controllers.
- Recovery events are auditable.
- Abuse controls for reset requests are stronger than generic baseline handling.
- Existing auth session revocation after reset still works.
- OpenAPI, README, and tests all match final behavior.

## Output Requested From The Backend AI

1. Proposed design summary
2. Database changes if any
3. Service and controller changes
4. Environment/config additions
5. OpenAPI and README updates
6. Test coverage added
7. Any tradeoffs or deferred items
