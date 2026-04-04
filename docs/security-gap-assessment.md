# Security Gap Assessment

This assessment reflects the current backend state after the Supabase auth and JWT work, Supabase TOTP MFA support, persistent audit logging, revocable server-side sessions, refresh-token rotation, password reset flows, Supabase Storage incident media uploads, multi-file incident media persistence, archive-by-default CRUD behavior, restore endpoints, archive-scope list browsing, centralized security alert forwarding, signed incident-media access support, stricter startup secret validation, admin governance reporting, and committed CI release-gate workflows.

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
- committed CI security gates now cover dependency review, secret scanning, static analysis, build verification, and deploy-time verification before production rollout

That means the API is no longer missing the basic auth, session, and baseline release-safety controls most internal CRUD backends lack. The biggest remaining gaps are now abuse-resistance tuning and rollout discipline, centralized monitoring, storage confidentiality choices, recovery governance, secrets governance, and disciplined remediation of dependency findings.

## Practical Rating

- Application-layer security maturity: about 7/10
- Operational security maturity: about 5.5/10
- Overall readiness for a government-facing production deployment: about 6/10 to 6.5/10

If all Supabase features are enabled and configured correctly, the identity posture improves further, but the overall rating still does not reach a high-assurance level because storage confidentiality, distributed abuse resistance, monitoring, recovery governance, and secrets governance remain open issues.

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
- CI workflows for dependency review, secret scanning, CodeQL static analysis, focused build-and-test verification, and deploy-time release gating.

## Latest Validation Snapshot

Current locally validated results:

- Focused security-sensitive suites passed: `featureSelection`, `health`, `startupEnv`, `auth-bootstrap`, `users`, `security`, and `incidents`.
- Locked production feature-profile build passed.
- Production dependency audit is currently clean for production dependencies.

## Remaining High-Priority Gaps

### 1. Shared-store rate limiting rollout and tuning

Current state:

- Rate limiting supports both in-memory and database-backed shared buckets.
- Production defaults now prefer the database-backed limiter, and production fails closed if the configured shared limiter store cannot be reached.
- Stricter scoped throttles already exist for login, refresh, password reset, MFA setup or enable or disable, and incident media upload.

Risk:

- The protection still depends on operators actually running the shared limiter mode in production and keeping the backing database healthy.
- The current implementation is still database-centric rather than Redis or another purpose-built low-latency limiter store.
- Threshold tuning can still be too weak or too aggressive if deployment-specific abuse patterns are not reviewed.

Recommendation:

- Keep shared-store rate limiting enabled in production and verify it during deployment review.
- Periodically tune scoped thresholds for login, refresh, MFA, password reset, and upload endpoints using real abuse and support signals.
- Consider moving to Redis or another dedicated limiter backend if database latency, contention, or operational isolation becomes a concern.

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
- There is still no production-grade delivery channel such as verified email or SMS.
- A repository-level operational recovery and break-glass procedure is now documented, but it still depends on operators following it correctly.

Risk:

- The recovery primitive exists, but production recovery is still incomplete without secure token delivery and stronger operator controls.

Recommendation:

- Add verified delivery for reset tokens.
- Add reset request throttling and monitoring rules tuned for abuse.
- Keep the documented privileged-account recovery process under change control and exercise it periodically.

### 5. Centralized monitoring and tamper-resistant security telemetry

Current state:

- Audit logs are persisted in the application database and exposed by admin API.
- Sentry can capture backend exceptions and traces when configured.
- The repository now includes an operational runbook for alert routing, triage, privileged recovery, and break-glass review.
- Webhook-based security alert forwarding already covers repeated login failures, repeated password reset requests, repeated refresh failures, password reset delivery failures, session-revocation churn, and privileged account changes.
- Production startup validation now rejects invalid or non-HTTPS alert and password-reset delivery webhook URLs.

Risk:

- This is useful for product visibility, but it is not equivalent to centralized monitoring or tamper-resistant alerting.
- Suspicious auth activity may still go unnoticed without downstream alerting.
- App-database audit logs alone are not enough for strong incident response or compliance review.

Recommendation:

- Forward logs to centralized monitoring or SIEM.
- Keep expanding tuned alert rules for suspicious MFA resets, unusual admin actions, and suspicious media upload patterns.
- Treat the runbook as an operational minimum, not as a substitute for external monitoring infrastructure.

### 6. Secrets and key management maturity

Current state:

- JWT secrets, MFA encryption secrets, database credentials, API keys, and Supabase service-role credentials are environment-variable based.
- Repository-level administrative expectations for secret classes, rotation cadence, branch protection, and release approval are now documented.
- Production webhook endpoints used for security alerting and password reset delivery are now validated to require absolute HTTPS URLs.

Risk:

- Environment variables alone do not provide strong evidence of rotation, access segregation, or secure operational handling.
- The `SUPABASE_SERVICE_ROLE_KEY` becomes especially sensitive once storage and admin-auth operations are enabled.

Recommendation:

- Move secrets into a managed vault or equivalent secret-management system.
- Define rotation cadence for JWT signing keys, MFA encryption secrets, API keys, database credentials, and Supabase service-role credentials.
- Treat the documented administration controls as a baseline and verify they are actually enforced in infrastructure and repository settings.

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
- A repository-level access governance baseline is now documented for role ownership, approval workflow, quarterly review, and joiner or mover or leaver handling.

Risk:

- Strong code-level RBAC can still drift operationally if the documented governance workflow is not actually enforced.

Recommendation:

- Enforce the documented role ownership and approval workflow through real operational process.
- Keep periodic privileged access reviews with evidence and remediation follow-through.

### 9. Supply-chain, CI, and deployment hardening follow-through

Current state:

- The repository now has committed workflows for dependency review, secret scanning, CodeQL analysis, and deploy-time verification.
- Focused build-and-test release gates are now documented in the repository.
- The current production dependency audit is clean after upgrading the vulnerable transitive dependency path.
- Branch protection and release-approval evidence still depend on GitHub repository settings and operator discipline outside this codebase.
- Repository-level branch-protection and release-approval expectations are now documented.

Risk:

- The release story is materially better than before, but weak branch-protection enforcement and missing external approval evidence can still undercut confidence during formal review.

Recommendation:

- Require branch protection for `main` and `develop` so the new workflows cannot be bypassed casually.
- Keep release evidence and remediation notes for audit and change approval.
- Periodically verify the documented administrative controls against live GitHub and deployment settings.

## Medium-Priority Gaps

### 1. Device identification quality

Current state:

- Session inventory now exposes user agent, IP metadata, expiry state, current-session status, and friendly browser or OS device labels.
- Privileged access review now includes the latest observed session device context for reviewer triage.
- Sessions still do not have trusted-device semantics or richer anomaly signals.
- A repository-level session governance baseline is now documented for device and session review procedures.

Recommendation:

- Surface the new session metadata clearly in operator dashboards and review evidence.
- Consider anomaly heuristics for new device, IP, or geo changes where appropriate.
- Keep periodic privileged-session review active and retain evidence of reviewer actions.

### 2. Enterprise identity integration

Current state:

- Authentication can now be local username/password, Supabase-backed credentials, or Supabase JWT-based.
- Repository guidance now documents when enterprise identity, federation, or conditional-access evaluation should be considered.

Recommendation:

- If this system moves into a stricter enterprise environment, evaluate SSO, federation, or IdP-backed conditional access for privileged users.

## What Should Be Built Next

If the goal is the next highest-value security work, the order should be:

1. Enforce MFA operationally for privileged roles and define recovery or break-glass procedures.
2. Replace public-media assumptions with a private-bucket or signed-URL evidence model for sensitive incident media.
3. Add production-grade password reset delivery and privileged account recovery controls.
4. Export audit and auth events to centralized monitoring or SIEM and continue expanding tuned alerting.
5. Formalize retention rules and keep privileged access review procedures under active operational use.
6. Enforce the documented secret-management, branch-protection, and release-approval controls around the new CI gates.

## Practical Readiness Summary

The API is materially stronger than a basic CRUD backend. It now has revocable sessions, rotating refresh tokens, privileged-role MFA, optional Supabase auth and JWT support, self-service session inventory and revocation, friendly session device metadata, password reset tokens, audit logging, shared-store or fail-closed rate limiting, upload validation, archive-by-default deletes, restore endpoints, stricter route protection, and committed CI release gates. The biggest remaining blockers are no longer missing auth primitives, missing CI evidence, or the previously identified production dependency issue. They are the operational controls around abuse-resistance tuning, centralized monitoring, storage confidentiality, recovery governance, and secrets handling.
