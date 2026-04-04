# Security Administration Controls

This document defines the minimum administrative controls expected around secret handling, branch protection, and production release approval for this repository.

## Secret Classes

Treat the following as managed secrets, not ordinary environment values:

- `JWT_SECRET`
- `MFA_ENCRYPTION_KEY`
- `API_KEYS`
- `DATABASE_URL`
- `DIRECT_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY` when bundled into privileged automation or deployment pipelines
- SSH deploy keys and workflow secrets used by `Deploy to Droplet`
- webhook endpoints and credentials used for password reset delivery or centralized security alert routing

## Storage Expectations

- Store production secrets in a managed vault or equivalent secret manager.
- Restrict write access to a limited set of platform administrators.
- Restrict read access to only the deployment systems and operators that require it.
- Do not store long-lived production secrets in plaintext `.env` files on developer workstations.
- Do not reuse the same secret value across development, staging, and production.
- Require production operational webhooks to use validated `https://` destinations.

## Rotation Expectations

Minimum target cadence:

- `JWT_SECRET`: rotate at least annually and immediately after suspected exposure
- `MFA_ENCRYPTION_KEY`: rotate under a controlled migration plan and immediately after suspected exposure
- `API_KEYS`: rotate at least every 180 days and when client access changes
- database credentials: rotate at least every 180 days
- `SUPABASE_SERVICE_ROLE_KEY` and deploy credentials: rotate immediately after administrator turnover or suspected exposure

Every rotation should leave evidence of:

- who approved the rotation
- when the rotation occurred
- which systems were updated
- whether rollback was required

## Branch Protection Baseline

At minimum, protect `develop` and `main` with:

- required passing checks for `Security Checks` and `CodeQL Analysis`
- blocked direct pushes except for explicitly authorized administrators
- pull-request review requirements for normal changes
- restricted force-push and branch-deletion permissions

If protected-branch settings change, record:

- who made the change
- why it was necessary
- when the original protections were restored

## Production Release Approval

Before deploying `main`, require:

1. Passing workflow results for `Security Checks` and `Deploy to Droplet` verification.
2. Review of any open security findings, workflow bypasses, or emergency changes.
3. Approval from a release owner or delegated operations approver.

For higher-risk releases, also require:

- a linked change or incident record
- a rollback plan
- confirmation that secrets or credentials changed by the release were updated through managed channels

## Emergency Exceptions

Emergency overrides should be rare.

If an approval gate or branch-protection control is bypassed:

- log the reason and approver immediately
- capture the exact commit and deployment timestamp
- create follow-up remediation work before the next routine release
- review the exception during the next security or operations review

## Review Cadence

- Review repository branch-protection settings quarterly.
- Review secret-access membership quarterly.
- Review release-approval evidence monthly for production changes.
- Reconcile stale deploy keys, old API keys, and unused secrets during each quarterly review.
