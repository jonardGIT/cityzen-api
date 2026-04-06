# Data Protection And Governance

This document defines the backend's operational data-governance baseline for production-style deployments. It is intended to complement role-based access control, audit logging, archive-by-default delete behavior, and incident-media confidentiality controls.

## Data Classification

- `citizen-records`: `restricted-pii`
  Handling: Citizen identity and contact information must remain role-scoped and any disclosure workflow should be auditable.
- `incident-records`: `restricted-operational`
  Handling: Incident descriptions, location snapshots, and response context must remain limited to operational roles and auditors.
- `incident-media`: `restricted-evidence`
  Handling: Uploaded evidence can contain sensitive imagery or documents. Signed/private access is required for production-style sensitive deployments.
- `audit-logs`: `confidential-security`
  Handling: Security telemetry should be retained for investigations and exported only through privileged administrative workflows.

## Field-Level Handling Expectations

- Citizen contact information, identity details, and free-text incident narratives should be treated as need-to-know data even for internal operational use.
- Passwords, raw password-reset tokens, API keys, JWT signing material, MFA secrets, and Supabase service-role credentials must never be copied into tickets, chat threads, screenshots, or audit-log metadata.
- Audit evidence shared outside the privileged review workflow should mask direct citizen identifiers unless full disclosure is operationally required and separately approved.
- Signed incident-media URLs should be treated as temporary evidence links rather than durable public references and should not be reused in uncontrolled channels.
- Test fixtures and exported debugging payloads should prefer synthetic addresses, names, contact values, and media references.

## Retention Schedule

The backend surfaces the active operational schedule through `GET /api/v1/admin/security/data-governance` and accepts environment overrides for each retention window.

- `auth-sessions`: default `30` days
  Purge authority: `SYSTEM_ADMIN`
- `password-reset-tokens`: default `7` days
  Purge authority: `SYSTEM_ADMIN`
- `audit-logs`: default `365` days
  Purge authority: `SYSTEM_ADMIN`
- `incident-media`: default `365` days
  Purge authority: `SYSTEM_ADMIN`
- `incident-records`: default `1825` days
  Purge authority: `SYSTEM_ADMIN`
- `citizen-records`: default `1825` days
  Purge authority: `SYSTEM_ADMIN`

These defaults are operational baselines, not a substitute for jurisdiction-specific records policy. Production operators should align them with legal and agency retention requirements.

## Purge, Hold, And Disclosure Authority

- Retention changes should be approved by the operational owner responsible for records governance, not only by the deploying engineer.
- Manual purge operations for restricted data should require documented authorization and an auditable change record.
- Legal hold placement should take precedence over ordinary retention expiry and should be traceable to a named approver.
- Data exports for investigations, disclosure requests, or regulator review should be limited to the minimum fields necessary for the purpose of the request.
- Any exception that requires broader disclosure of citizen or incident data should be recorded with requester, approver, purpose, and release date.

## Legal Hold

- When `DATA_LEGAL_HOLD_ENABLED=true`, automated purge workflows must be suspended for affected records.
- `DATA_LEGAL_HOLD_CONTACT` should identify the operational owner responsible for approving hold placement and release.
- Release from legal hold should require documented administrative approval.

## Operational Review Minimum

- Review retention overrides at least quarterly and after any regulatory or policy change.
- Confirm that audit-log exports, incident evidence sharing, and support workflows are not leaking full restricted fields by default.
- Treat this document as the repository baseline for records handling, not as a substitute for agency legal review or formal privacy impact assessment.

## Encryption Expectations

- TLS is required for all external traffic and trusted reverse-proxy hops.
- Managed database encryption at rest is required for production deployments, including snapshots and backups.
- Incident media stored in Supabase should use signed/private access in production-style deployments.
