# Security Operations Runbook

This runbook defines the minimum operational process for centralized security monitoring, alert triage, and privileged-account recovery for this API. It complements the existing technical controls in the application and CI workflows.

## Scope

This runbook applies to:

- authentication failures and session abuse
- password reset request abuse and privileged-account recovery
- privileged-role MFA enrollment or disablement events
- role changes, account archival or restoration, and other privileged admin actions
- suspicious incident media upload behavior
- production deployment verification failures and release-gate exceptions

## Monitoring Inputs

Use these repository-supported telemetry sources as the minimum signal set:

- application audit logs exposed by the admin API and stored in the database
- backend exception and trace events sent through Sentry when `SENTRY_DSN` is configured
- threshold-based webhook alerts sent through `SECURITY_ALERT_WEBHOOK_URL`
- CI and deployment workflow history from `Security Checks`, `CodeQL Analysis`, and `Deploy to Droplet`

Recommended downstream destinations:

- a centralized log or SIEM platform for retention and tamper resistance
- an on-call paging or ticketing system for actionable high-severity alerts
- a case-management or incident tracker for privileged-account recovery approvals

## Minimum Alert Rules

At minimum, the monitoring sink should alert on:

- repeated failed logins crossing `SECURITY_ALERT_LOGIN_FAILURE_THRESHOLD`
- repeated password reset requests crossing `SECURITY_ALERT_PASSWORD_RESET_THRESHOLD`
- MFA setup, enable, or disable events for privileged roles
- role changes involving privileged roles
- privileged-user archival, restoration, creation, or password reset activity
- repeated incident media upload failures or abnormal upload bursts
- any production deploy `verify` failure on `main`
- any emergency release-gate bypass or out-of-band hotfix

## Triage Expectations

Severity guidance:

- `Critical`: suspected account takeover, privileged MFA disablement without approval, release-gate bypass, or confirmed sensitive-data exposure
- `High`: repeated privileged login failures, suspicious password reset bursts, unexplained role changes, or abnormal media-upload activity
- `Medium`: repeated failed logins for standard users, noisy but contained upload failures, or deployment verification drift

Target response expectations:

- `Critical`: acknowledge within 15 minutes and begin containment immediately
- `High`: acknowledge within 1 hour and start investigation the same business day
- `Medium`: review within 1 business day and trend for escalation

## Privileged Account Recovery

Privileged-account recovery must not rely on informal password resets alone.

Required controls:

- recovery requires approval from both the system owner and a second authorized reviewer
- every recovery action must create or reference an incident or ticket ID
- recovery actions must be traceable in audit logs and the incident record
- recovered users must re-enroll MFA before normal privileged access is restored
- all active sessions for the affected account must be revoked during recovery

Preferred recovery sequence:

1. Confirm the identity of the requester using an out-of-band channel.
2. Verify the requester still has an approved privileged role.
3. Create an incident or ticket with approver names, timestamp, and reason.
4. Revoke active sessions for the account.
5. Perform an approved password reset or admin-assisted recovery action.
6. Require immediate MFA re-enrollment before privileged routes are usable.
7. Review recent auth, audit, and admin activity for compromise indicators.
8. Close the ticket only after the user confirms restored access and reviewers accept the evidence.

## Break-Glass Access

If emergency privileged access is required:

- use a dedicated break-glass account, not a shared normal admin account
- store credentials in a managed vault with dual-control access
- require immediate post-use password rotation and MFA re-establishment
- review all actions taken under break-glass access within 1 business day

## Evidence Retention

Keep the following evidence for security review and audit:

- alert payloads forwarded through `SECURITY_ALERT_WEBHOOK_URL`
- Sentry issue links or exported incident snapshots for confirmed events
- CI and deployment workflow results for production releases
- recovery approvals, incident tickets, and reviewer sign-off records
- relevant audit-log exports for privileged account actions

## Operational Review Cadence

- Review alert thresholds quarterly.
- Review privileged-account recovery events monthly, even if the count is zero.
- Confirm branch protection and required GitHub checks remain enforced after repository administration changes.
- Revalidate the break-glass process during tabletop or incident-response exercises at least annually.