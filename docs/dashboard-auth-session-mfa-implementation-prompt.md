# Dashboard Prompt: Option 2 Account Security, Sessions, and MFA

Use this prompt when updating the dashboard authentication and account security experience to match the current backend implementation.

Use `docs/dashboard-current-feature-prompt.md` as the governing prompt when feature-gating or OpenAPI/config reconciliation questions arise. This document is only for the auth/session/MFA slice.

## Backend Preconditions

Assume these backend prerequisites are part of the current rollout state:

- MFA database columns from `prisma/add-user-mfa.sql` are now present in the target database.
- Auth session persistence and refresh rotation already exist in the backend.
- Session inventory endpoints exist only when the active feature selection uses `tokenMode=app-jwt`.
- MFA endpoints exist only when the active feature selection uses `mfaMode=local-totp` or `mfaMode=supabase-totp`.
- The target backend environment still requires `MFA_ENCRYPTION_KEY` to be set for `POST /auth/mfa/setup` to succeed.

If the dashboard receives a `503` from MFA setup, treat it as a backend configuration issue and show an operator-facing error instead of a generic failure state.

## Primary Instruction

Read the backend OpenAPI contract first and treat it as the source of truth before changing UI, request payloads, route guards, or client-side types.

Required references:

- `src/docs/openapi.ts`
- `GET /api/v1/openapi.json` when the API is running locally
- `README.md` sections covering auth, access matrix, and audit logging

Do not guess request or response shapes from older frontend code. Align the dashboard strictly to the backend contract.

Do not invent backend routes that are not present in active OpenAPI. In particular, this backend does not currently expose a Supabase auth webhook receiver such as `/api/auth/webhook`, and it does not provide a backend endpoint for browsing Supabase webhook event history.

## Backend Auth Model To Match

The dashboard must support all of the following backend behaviors:

- Login returns `token`, `refreshToken`, `tokenType`, `sessionId`, `expiresAt`, `refreshExpiresAt`, and `user`
- Refresh uses `POST /api/v1/auth/refresh` with `refreshToken` and returns a replacement access token plus replacement refresh token
- Logout uses `POST /api/v1/auth/logout` and revokes the current server-side session
- Session inventory uses `GET /api/v1/auth/sessions` only when `tokenMode=app-jwt`
- Targeted session revocation uses `DELETE /api/v1/auth/sessions/:id` only when `tokenMode=app-jwt`
- Privileged roles `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`, `CITY_CONTENT_EDITOR`, `DISPATCHER`, and `AUDITOR` can use MFA setup, enable, and disable endpoints when MFA is enabled in the active feature selection
- `POST /api/v1/auth/mfa/setup`, `POST /api/v1/auth/mfa/enable`, and `POST /api/v1/auth/mfa/disable` are optional endpoints gated by the current `mfaMode`
- `POST /api/v1/auth/mfa/setup` may return `503` when the backend environment is missing `MFA_ENCRYPTION_KEY` or MFA storage is not fully available
- Once MFA is enabled for a privileged account, login requires `mfaCode`
- Enabling or disabling MFA revokes all active sessions for that user
- Password changes or role changes may revoke all active sessions, so the UI must tolerate forced sign-out
- Public password reset uses `POST /api/v1/auth/password-reset/request` and `POST /api/v1/auth/password-reset/confirm`
- Supabase email-confirmation and recovery redirects should be handled as dashboard routes, not as new backend API routes

## Feature Gate Rules

Honor the current feature-aware contract.

- Session inventory UI is available only when the backend exposes `/auth/sessions` and `/auth/sessions/{id}` for `tokenMode=app-jwt`.
- MFA management UI is available only when the backend exposes `/auth/mfa/setup`, `/auth/mfa/enable`, and `/auth/mfa/disable` for an enabled MFA mode.
- If a feature-gated auth endpoint is absent from the active OpenAPI document, treat that as intentional for the current deployment.

## Required Dashboard UX Changes

Implement or update these dashboard flows:

1. Login flow
   - Support the standard email and password form.
   - If login indicates MFA is required, show a second-step MFA code entry state instead of treating it as a generic failure.
   - Retry login with `mfaCode` included.

2. Token lifecycle
   - Store and rotate `refreshToken` correctly.
   - Replace both tokens after every successful refresh.
   - If refresh fails, clear local auth state and redirect to login.
   - In Supabase TOTP mode, preserve the current `refreshToken` so it can be sent to `/auth/mfa/setup`, `/auth/mfa/enable`, and `/auth/mfa/disable`.

3. Account security screen
   - Add a dedicated "Sessions" or "Device Sessions" section only when session inventory is active for the current deployment.
   - Load current sessions from `GET /auth/sessions` only when that endpoint is present in active OpenAPI.
   - Show enough metadata to help users identify sessions: current-session indicator, last used time, access expiry, refresh expiry, revocation status, user agent, IP address.
   - Provide a revoke action for non-current sessions via `DELETE /auth/sessions/:id`.
   - After revocation, refresh the session list immediately.

4. MFA management screen
   - Only show MFA controls for privileged roles.
   - Only show MFA controls when MFA endpoints are active in the current deployment.
   - Support setup flow that shows the shared secret and otpauth URL or QR representation.
   - In Supabase TOTP mode, send `refreshToken` in the request body for setup, enable, and disable actions.
   - Show a clear backend-configuration error when setup returns `503`; do not present it as an invalid user action.
   - Support enable flow requiring a current TOTP code.
   - Support disable flow requiring a current TOTP code.
   - After enable or disable succeeds, expect the current session to be invalidated and require the user to authenticate again.

5. Supabase redirect pages
   - Frontend-only pages such as `/auth/callback`, `/auth/confirm-email`, `/auth/error`, and a Supabase recovery page are valid dashboard concerns.
   - Keep them separate from the API contract. They should consume Supabase redirect state and then route users into the existing backend-backed auth experience.
   - Do not treat those pages as evidence that matching backend routes or webhook receivers must exist.

6. Route guards and permission UX
   - Preserve existing role-aware dashboard navigation.
   - Do not expose MFA management UI to non-privileged roles.
   - Do not expose MFA management UI to non-privileged roles, but do include `CITY_CONTENT_EDITOR` and `AUDITOR` in the privileged set when MFA is active.
   - Do not expose session inventory UI when `tokenMode` is not `app-jwt`.
   - Handle `401` as session/auth failure and `403` as permission failure.

## UI Expectations

The account security area should feel intentional rather than bolted on.

- Create a dedicated account security page or tab, not a loose collection of modal actions.
- Present session rows as recognizable devices or browsers, with current session clearly labeled.
- Use explicit warning copy for revoke, disable MFA, and forced re-authentication moments.
- Surface backend timestamps in a readable local format.
- Make empty states and revoked-session states clear.
- Support responsive layout for both desktop and tablet widths.

## Data And Type Alignment Rules

- Generate or hand-align frontend auth types from the current OpenAPI schema.
- Do not assume `user` only contains legacy fields; it now includes MFA state fields.
- Do not hardcode old auth response shapes.
- Keep API client methods isolated so refresh rotation and session revocation behavior stays consistent.
- Do not hardcode optional auth endpoints as always available; derive them from active OpenAPI and the feature-aware dashboard config.
- Do not hardcode old privileged-role labels such as `SYSTEM_ADMIN`, `DEPARTMENT_MANAGER`, or `SUPERVISOR`; normalize legacy aliases to the live LGU-first role set before permission checks.
- Do not assume a webhook administration or webhook-event API exists unless it appears in active OpenAPI.

## Acceptance Checklist

- Login works for accounts with and without MFA.
- Refresh rotation replaces both access and refresh tokens.
- Session list renders correctly from live backend data when session inventory is enabled.
- Revoking another session removes or updates it in UI without a full reload when session inventory is enabled.
- MFA setup handles both success and backend-unavailable `503` states correctly when MFA is enabled.
- MFA setup, enable, and disable flows match backend validation and forced re-auth behavior when MFA is enabled.
- All auth-related request and response types were checked against OpenAPI before implementation.
