# Security Session Governance

This document defines the minimum operational expectations for device and session review, session inventory use, and future trusted-device or enterprise-identity enhancements.

## Current Platform Baseline

The backend already supports:

- authenticated session inventory for app-JWT mode
- targeted session revocation for the current user
- privileged access-review reporting with active-session counts and stale-session flags
- privileged MFA compliance reporting for periodic review

These controls are useful only if reviewers actually examine and act on them.

## Device and Session Review Expectations

At minimum, reviewers should look for:

- privileged users with no MFA enabled
- privileged users with stale or unexpected session activity
- unusually high active-session counts for a single account
- recent password reset or account-recovery activity followed by new session creation
- sessions that appear inconsistent with expected role usage or operating context

Recommended cadence:

- privileged accounts: review quarterly at minimum
- break-glass or emergency accounts: review after every use
- accounts involved in incidents or recovery actions: review immediately after containment

## Session Inventory Usage

When the platform runs in app-JWT mode, reviewers should use:

- `GET /api/v1/auth/sessions` for user-visible session inventory
- `DELETE /api/v1/auth/sessions/:id` for targeted revocation
- `GET /api/v1/admin/users/access-review` for privileged review posture
- `GET /api/v1/admin/users/mfa-compliance` for privileged MFA status

When the platform runs in an external-provider token mode, equivalent review evidence should come from the provider and be retained alongside application audit evidence.

## Trusted Device Guidance

The current backend does not implement trusted-device semantics.

Until that exists:

- do not treat a remembered browser or device as proof of low risk
- keep MFA required for privileged access
- investigate unexpected session creation even if the user claims the device is known

## Enterprise Identity Guidance

If the system moves to a stricter enterprise environment, evaluate:

- SSO or federation for privileged users
- centralized conditional-access policies
- stronger anomaly detection from the upstream identity provider
- device trust or managed-device posture controls

## Operational Minimum

This document is a governance baseline. It does not replace real review evidence, identity-provider controls, or incident-response investigation.