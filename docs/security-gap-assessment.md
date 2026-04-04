# Security Gap Assessment

This assessment reflects the current backend state after the Supabase auth and JWT work, Supabase TOTP MFA support, persistent audit logging, revocable server-side sessions, refresh-token rotation, password reset flows, Supabase Storage incident media uploads, multi-file incident media persistence, archive-by-default CRUD behavior, restore endpoints, and archive-scope list browsing.

## Current Security Posture

The API now has a credible application-layer security baseline and is materially stronger than a typical CRUD backend:

- startup fails closed if `JWT_SECRET` is missing
- protected versioned routes can require API keys
- JWT access is backed by persistent server-side `auth_sessions`
- refresh tokens are rotated and bound to the same server-side session
- sessions can be revoked on logout and on sensitive account changes
- authenticated users can list and revoke their own sessions
- optional Supabase Auth can be used for email/password verification while preserving the app's local session model
- optional Supabase JWT mode can be used for protected route auth
- privileged roles can enroll in TOTP MFA, including Supabase-backed MFA mode
- one-time password reset tokens support self-service password recovery
- selected auth and mutating actions are persisted to audit logs
- role-based access rules are enforced across admin and incident flows
- incident media uploads enforce MIME and size validation
- archive-by-default deletes reduce destructive data loss and keep normal reads scoped to active records
- archive-aware auth checks prevent archived users from authenticating or continuing active session flows
- baseline request throttling exists through rate limiting

That means the API is no longer missing the basic auth, session, and operational safety controls most internal CRUD backends lack. The biggest remaining gaps are now distributed abuse resistance, centralized monitoring, storage confidentiality choices, secrets governance, and formal operational controls.

## Practical Rating

- Application-layer security maturity: about 7/10
- Operational security maturity: about 4.5/10
- Overall readiness for a government-facing production deployment: about 5.5/10 to 6/10

If all Supabase features are enabled and configured correctly, the identity posture improves further, but the overall rating still does not reach a high-assurance level because storage confidentiality, rate limiting, monitoring, and secrets governance remain open issues.

## Implemented Controls

- Required `JWT_SECRET` at startup.
- API key enforcement for protected versioned routes, with explicit public bypasses only.
- Helmet, CORS restrictions, request body limits, centralized error handling, and request logging.
- JWT authentication with role-based authorization.
- Persistent `auth_sessions` records backing bearer tokens.
- Immediate session revocation on logout.
- Forced session revocation when a user's password or role changes.
- Refresh-token rotation bound to server-side auth sessions.
- Self-service session inventory through `GET /auth/sessions`.
- Targeted session revocation through `DELETE /auth/sessions/:id`.
- Local and optional Supabase-backed email/password authentication.
- Optional Supabase JWT verification for protected routes.
- TOTP MFA for privileged roles, including optional Supabase MFA mode.
- Public password reset request and confirm endpoints backed by one-time hashed reset tokens.
- Session revocation after successful password reset.
- Archived users excluded from login, token resolution, MFA operations, and password reset flows.
- Persistent audit logging for selected auth and mutating operations.
- Shared list-query validation with whitelist-based sort and filter fields.
- Supabase Storage incident media upload with size and MIME validation.
- Multi-file incident media persistence through ordered `mediaUrls`.
- Archive-by-default CRUD semantics, restore endpoints, and archived-list browsing support.
- OpenAPI and README documentation aligned to the current contract.

## Remaining High-Priority Gaps

### 1. Centralized, durable rate limiting

Current state:

- Rate limiting is still in-memory and per-process.

Risk:

- Limits reset on restart and do not coordinate across multiple instances.
- Brute-force and abuse resistance degrades in horizontally scaled deployments.
- Login, refresh, MFA, password reset, and media upload abuse controls are weaker than they look in a single-node test environment.

Recommendation:

- Move rate limiting to Redis or another shared store.
- Apply stricter policies to login, refresh, MFA, password reset, and upload endpoints.

### 2. MFA rollout enforcement and recovery operations

Current state:

- Privileged-role TOTP MFA is implemented and available.
- MFA still depends on correct deployment configuration: `MFA_ENCRYPTION_KEY` must be set and the live database must include the MFA columns.
- MFA is available for privileged users but not yet enforced by deployment policy.
- There is still no documented break-glass or lost-device recovery process for privileged users.

Risk:

- Security value depends on operators actually enabling MFA for privileged accounts.
- Lost-device scenarios can still create operational lockout risk or encourage insecure manual workarounds.

Recommendation:

- Make MFA mandatory for privileged roles in production.
- Add documented break-glass recovery procedures with strong audit requirements.
- Add reporting for privileged users with MFA disabled.

### 3. Incident media confidentiality and evidence handling

Current state:

- Supabase Storage upload is implemented.
- The current documentation expects a public bucket because incidents persist returned `mediaUrl` values directly.
- Storage uploads validate MIME type and size, and replaced files can be archived.

Risk:

- A public bucket can be unacceptable for sensitive government incident evidence, citizen-uploaded files, or documents containing PII.
- There is no malware scanning, signed URL policy, content moderation, or private-bucket retrieval layer.

Recommendation:

- Move sensitive media to private buckets with signed URLs or backend-gated retrieval.
- Add malware scanning or file quarantine for uploaded evidence.
- Define classification rules for what can be publicly retrievable versus restricted.

### 4. Password reset delivery and account recovery maturity

Current state:

- The backend supports one-time password reset tokens and password reset confirmation.
- Reset completion revokes active sessions.
- Non-production environments can expose reset tokens for local testing.
- There is still no production-grade delivery channel such as verified email, SMS, or admin-assisted recovery workflow.

Risk:

- The recovery primitive exists, but production recovery is incomplete without secure token delivery and stronger operator controls.

Recommendation:

- Add verified delivery for reset tokens.
- Add reset request throttling and monitoring rules tuned for abuse.
- Define higher-assurance recovery policy for privileged accounts.

### 5. Centralized monitoring and tamper-resistant security telemetry

Current state:

- Audit logs are persisted in the application database and exposed by admin API.
- Sentry can capture backend exceptions and traces when configured.

Risk:

- This is useful for product visibility, but it is not equivalent to centralized monitoring or tamper-resistant alerting.
- Suspicious auth activity may still go unnoticed without downstream alerting.
- App-database audit logs alone are not enough for strong incident response or compliance review.

Recommendation:

- Forward logs to centralized monitoring or SIEM.
- Alert on repeated auth failures, session churn anomalies, privilege changes, suspicious MFA resets, suspicious password reset activity, unusual admin actions, and suspicious media upload patterns.

### 6. Secrets and key management maturity

Current state:

- JWT secrets, MFA encryption secrets, database credentials, API keys, and Supabase service-role credentials are environment-variable based.

Risk:

- Environment variables alone do not provide strong evidence of rotation, access segregation, or secure operational handling.
- The `SUPABASE_SERVICE_ROLE_KEY` becomes especially sensitive once storage and admin-auth operations are enabled.

Recommendation:

- Move secrets into a managed vault or equivalent secret-management system.
- Define rotation cadence for JWT signing keys, MFA encryption secrets, API keys, database credentials, and Supabase service-role credentials.

### 7. Data protection and privacy governance

Current state:

- Role rules protect access to citizen and incident data.
- Archive-by-default deletes reduce accidental destructive loss.
- This repository still does not document field-level masking, retention schedules, purge authority, legal hold handling, or encryption posture beyond transport and managed-database assumptions.

Risk:

- Government-facing systems usually require explicit PII handling controls, retention rules, and disclosure procedures.
- Archiving is not the same thing as a formal records-management policy.

Recommendation:

- Document data classification and handling expectations.
- Define retention and purge rules for citizens, incidents, sessions, password reset records, media objects, and audit logs.
- Confirm encryption at rest and TLS requirements in deployment documentation.

### 8. Formal authorization governance and access review

Current state:

- RBAC is enforced in code and route middleware.
- There is no documented operational process for access review, role approval, or joiner/mover/leaver handling.

Risk:

- Strong code-level RBAC can still drift operationally if role assignment and review are informal.

Recommendation:

- Document role ownership and approval workflow.
- Add periodic access review procedures for privileged accounts.

### 9. Supply-chain, CI, and deployment hardening evidence

Current state:

- The repository has integration tests and route/security coverage.
- There is no committed evidence here for dependency scanning, SAST, container hardening, or release-gate security checks.

Risk:

- Actual security may be better than the repository alone shows, but there is limited auditable evidence for formal review.

Recommendation:

- Add dependency scanning, code scanning, secret scanning, and release-time hardening checks to CI.
- Keep evidence artifacts for remediation and release approvals.

## Medium-Priority Gaps

### 1. Device identification quality

Current state:

- Session inventory exists and exposes `userAgent`, IP metadata, expiry state, and current-session status.
- Sessions do not yet have friendly device names, trusted-device semantics, or richer anomaly signals.

Recommendation:

- Add better device labeling and clearer dashboard presentation.
- Consider anomaly heuristics for new device, IP, or geo changes where appropriate.

### 2. Enterprise identity integration

Current state:

- Authentication can now be local username/password, Supabase-backed credentials, or Supabase JWT-based.

Recommendation:

- If this system moves into a stricter enterprise environment, evaluate SSO, federation, or IdP-backed conditional access for privileged users.

## What Should Be Built Next

If the goal is the next highest-value security work, the order should be:

1. Move rate limiting to a shared durable store and tighten auth and upload-specific limits.
2. Enforce MFA operationally for privileged roles and define recovery or break-glass procedures.
3. Replace public-media assumptions with a private-bucket or signed-URL evidence model for sensitive incident media.
4. Add production-grade password reset delivery and privileged account recovery controls.
5. Export audit and auth events to centralized monitoring with alerts.
6. Formalize secrets management, retention rules, and privileged access review procedures.

## Practical Readiness Summary

The API is materially stronger than a basic CRUD backend. It now has revocable sessions, rotating refresh tokens, privileged-role MFA, optional Supabase auth and JWT support, self-service session inventory and revocation, password reset tokens, audit logging, upload validation, archive-by-default deletes, restore endpoints, and stricter route protection. The biggest remaining blockers are no longer missing auth primitives. They are the operational controls around distributed abuse resistance, centralized monitoring, storage confidentiality, recovery governance, secrets handling, and formal deployment readiness.
