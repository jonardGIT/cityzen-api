# Security Access Governance

This document defines the minimum operational controls for role ownership, privileged access approval, periodic review, and joiner or mover or leaver handling for this API.

## Role Ownership

Each privileged or data-bearing role should have a named business owner and a technical owner.

Minimum ownership expectations:

- `ADMIN`: owned by the system owner and delegated operations lead
- `RESPONDER` and other operational roles: owned by the incident-response or agency operations lead
- read-only audit or reporting access: owned by the security or compliance lead

Ownership records should identify:

- the approving person or team
- the business justification for the role
- the review cadence for users assigned to the role

## Access Approval Workflow

Granting or changing privileged access should require:

1. A documented request or ticket.
2. Approval from the role owner.
3. Verification that the user completed required onboarding and MFA setup expectations.
4. A recorded effective date and the operator who applied the change.

Do not assign privileged access based only on informal chat or verbal approval.

## Joiner, Mover, Leaver Controls

Joiners:

- verify identity before account creation
- assign the least-privileged role required
- require MFA enrollment before normal privileged activity

Movers:

- re-evaluate existing roles whenever job scope changes
- remove roles that are no longer required before adding broader ones
- record the reason for each role change in the request or ticket

Leavers:

- archive or disable accounts on or before separation time
- revoke active sessions immediately
- remove API keys, deploy access, and other linked credentials when applicable

## Periodic Access Review

At minimum, review privileged accounts quarterly.

Each review should confirm:

- the user still needs the assigned role
- MFA remains enabled where required
- the account has recent legitimate activity or an approved dormant exception
- stale, duplicated, or emergency access has been removed

Suggested evidence sources:

- `GET /api/v1/admin/users/access-review`
- `GET /api/v1/admin/users/mfa-compliance`
- audit-log exports for role changes, archival, restoration, and password resets

## Review Outcomes

Each review should end with one of these outcomes:

- retain access unchanged
- reduce privileges
- remove access
- open remediation work for missing MFA, stale accounts, or missing ownership evidence

Review records should capture:

- reviewer name
- date of review
- scope of accounts reviewed
- remediation actions and due dates

## Emergency or Temporary Privileged Access

Temporary privileged access must include:

- an expiration date
- a named approver
- a business reason
- a follow-up review to confirm removal

Avoid indefinite temporary access.

## Operational Minimum

This document is a repository baseline. It is only effective if the workflow is enforced through actual administrative practice, account provisioning discipline, and periodic review evidence.