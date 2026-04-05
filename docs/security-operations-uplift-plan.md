# Security Operations Uplift Plan

This document turns the highest-leverage security recommendation in the repository into an execution plan. The goal is to improve operational security maturity materially faster than another narrow backend feature would.

## Objective

Move the backend from repository-level security controls plus local operational guidance to enforced, observable, and reviewable production security operations.

Primary outcomes:

- centralized and tamper-resistant security telemetry
- named ownership for alert triage and privileged recovery
- managed secret storage with rotation evidence
- enforced branch protection and release approval in live systems

If executed well, this program should move operational security maturity from about `5.5/10` toward about `7/10`, and overall deployment readiness from about `6/10 to 6.5/10` toward about `7/10`.

## Scope

In scope:

- audit-log exports and alert forwarding
- Sentry exception and trace events
- CI and deployment verification outputs
- on-call or ticket routing for `high` and `critical` signals
- managed secrets for production runtime and deployment
- branch protection, required checks, release approval, and exception evidence

Out of scope for this initiative:

- redesigning application RBAC
- replacing the current auth model
- full media quarantine or content moderation pipelines
- privacy-policy or legal approval workflows outside the engineering or operations boundary

## Program Structure

### Phase 1. Centralize telemetry

Goal:

- make security-relevant signals durable, searchable, and harder to tamper with than app-database logs or ad hoc webhook destinations

Engineering deliverables:

- forward `SECURITY_ALERT_WEBHOOK_URL` events into a centralized SIEM, log platform, or managed event sink
- export application audit logs on a scheduled basis or stream them into the same sink
- route Sentry issues and deploy verification failures into the same review surface or linked case system
- define a minimum event schema that preserves actor, target, request, severity, and environment context

Operational deliverables:

- set retention policy for security telemetry
- define who can read, administer, and delete or suppress alerts
- define evidence export procedure for audits and incident review

Suggested owners:

- primary: platform or DevOps lead
- supporting: backend owner, security owner, release owner

Exit criteria:

- every `high` and `critical` webhook alert is visible in the central sink within the expected delivery window
- audit events for privileged account create, update, delete, restore, password reset, and MFA actions are retained outside the application database
- production deploy verification failures are visible in the same investigation workflow
- retention, access control, and export procedure are documented and approved

### Phase 2. Operationalize triage and response

Goal:

- ensure high-severity telemetry leads to accountable action instead of passive visibility

Engineering deliverables:

- route `high` and `critical` alerts into paging, ticketing, or case-management tooling
- tag alerts with owner, severity, and environment where the sink supports it
- add routing for privileged recovery anomalies, burst privileged user management, and release-gate failures

Operational deliverables:

- define on-call or business-hours ownership for `critical`, `high`, and `medium` events
- define acknowledgement and escalation targets
- define incident templates for:
  - privileged recovery review
  - suspicious privileged user-management bursts
  - release-gate bypass or failed deploy verification
  - suspected credential exposure or vault access anomaly

Suggested owners:

- primary: security operations owner or service owner
- supporting: backend owner, incident manager, release owner

Exit criteria:

- `critical` alerts create a tracked case, page, or equivalent escalation
- `high` alerts create a tracked queue item with named ownership
- the response process is exercised at least once with retained evidence
- alert severity guidance in the runbook matches the downstream workflow behavior

### Phase 3. Move production secrets into managed infrastructure

Goal:

- replace informal environment-file handling with controlled retrieval, access review, and rotation evidence

Engineering deliverables:

- move production values for `JWT_SECRET`, `MFA_ENCRYPTION_KEY`, `DATABASE_URL`, `API_KEYS`, `SUPABASE_SERVICE_ROLE_KEY`, deploy credentials, and operational webhook secrets into a managed vault or secret manager
- update deployment automation to retrieve secrets at deploy or runtime instead of relying on manually managed static files
- document emergency rotation flow and rollback expectations

Operational deliverables:

- define secret owners and approvers
- define quarterly membership review for secret access
- retain evidence for all rotations and emergency access events
- put break-glass credentials behind dual control with post-use review

Suggested owners:

- primary: platform or infrastructure owner
- supporting: security owner, release owner

Exit criteria:

- no long-lived production secrets are maintained as ordinary plaintext workstation `.env` files
- production secret access is limited to approved operators and deployment systems
- at least one controlled rotation has been executed and evidenced end to end
- break-glass access is documented, tested, and reviewable

### Phase 4. Enforce release governance in live systems

Goal:

- make the documented release and branch-protection expectations real and auditable

Engineering deliverables:

- enforce branch protection on `develop` and `main`
- require passing checks for security workflows and deploy verification before merge or release
- require pull-request review and restrict direct pushes and force pushes
- ensure production deploy approval is recorded in the actual delivery path

Operational deliverables:

- retain approval evidence for production releases
- retain exception records for bypasses, hotfixes, or temporary control changes
- review release evidence and control exceptions on a recurring cadence

Suggested owners:

- primary: repository administrator or release owner
- supporting: security owner, platform owner

Exit criteria:

- `main` and `develop` cannot be updated outside the approved release path except by explicitly approved emergency procedure
- required checks are enforced in repository settings, not just documented in markdown
- every production release has review and evidence linkage
- every exception has recorded reason, approver, timestamp, and remediation follow-up

## Implementation Order

Recommended order:

1. Phase 1 first, because centralized telemetry is the foundation for detection and evidence.
2. Phase 2 next, because telemetry without ownership does not materially improve response maturity.
3. Phase 3 next, because secret handling is one of the largest remaining high-impact operational weaknesses.
4. Phase 4 in parallel with late Phase 3 where repository administration ownership is available.

Fastest rating-improvement combination:

- Phase 1 plus Phase 3

That combination improves monitoring defensibility and secret governance at the same time, which is the shortest path to a materially better operational score.

## Minimum Metrics

Track these metrics during rollout:

- percentage of `high` and `critical` alerts reaching the central sink successfully
- mean acknowledgement time for `critical` and `high` alerts
- number of production secrets still managed outside the vault
- number of releases with complete approval evidence
- number of control exceptions or release bypasses per quarter
- number of privileged recovery events reviewed within the target window

## Acceptance Checklist

This initiative is not complete until all of the following are true:

- the team can show centralized records for security alerts, privileged audit events, and deploy verification failures
- the team can show named responders and escalation evidence for `critical` and `high` events
- the team can show that production secrets are retrieved from managed infrastructure rather than ordinary static files
- the team can show live branch protection and required checks in repository settings
- the team can show release approval or exception evidence for recent production changes

## Recommended First Sprint

If this work starts immediately, the first sprint should deliver:

- selected SIEM or centralized sink
- event mapping for webhook alerts, audit-log exports, Sentry, and deploy verification
- draft severity-to-routing matrix
- initial secret inventory with owners
- live repository branch-protection review with identified gaps

The first sprint should end with a concrete go or no-go decision on the telemetry platform and a prioritized backlog for Phases 1 through 4.