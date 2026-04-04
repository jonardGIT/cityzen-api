# Data Protection And Governance

This document defines the backend's operational data-governance baseline for production-style deployments. It is intended to complement role-based access control, audit logging, archive-by-default delete behavior, and incident-media confidentiality controls.

## Data Classification

- `citizen-records`: `restricted-pii`
  Handling: Citizen identity and contact information must remain role-scoped and any disclosure workflow should be auditable.
- `incident-records`: `restricted-operational`
  Handling: Incident descriptions, location snapshots, and response context must remain limited to operational roles and auditors.
- `incident-media`: `restricted-evidence`
  Handling: Uploaded evidence can contain sensitive imagery or documents. Signed/private access is preferred for sensitive deployments.
- `audit-logs`: `confidential-security`
  Handling: Security telemetry should be retained for investigations and exported only through privileged administrative workflows.

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

## Legal Hold

- When `DATA_LEGAL_HOLD_ENABLED=true`, automated purge workflows must be suspended for affected records.
- `DATA_LEGAL_HOLD_CONTACT` should identify the operational owner responsible for approving hold placement and release.
- Release from legal hold should require documented administrative approval.

## Encryption Expectations

- TLS is required for all external traffic and trusted reverse-proxy hops.
- Managed database encryption at rest is required for production deployments, including snapshots and backups.
- Incident media stored in Supabase should use signed/private access for sensitive deployments whenever feasible.