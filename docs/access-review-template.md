# CIRS Access Review Record Template

Use this document for recurring review of privileged, scoped, and operational access to the CIRS API and related administrative tools.

It is pre-filled for the current role model used by the repository so reviewers can work from a realistic access-review sheet rather than a blank form.

This review should be run at least monthly for privileged users and quarterly for broader operational access.

Use this together with:

- `docs/privacy-governance-operations-guide.md`
- `GET /api/v1/admin/security/data-governance`
- admin user, role, MFA, and audit log outputs from the deployed environment

## 1. Review Metadata

- LGU or operating authority: `Tuguegarao City pilot deployment sample`
- Environment or deployment name: `CIRS Production`
- Review period: `2026 Q2 sample review`
- Reviewer: `Privacy Governance Review Team - sample`
- Department or unit: `City Administrator's Office / DPO Office - sample`
- Date completed: `2026-06-30`

## 2. Privileged Access Review

Use one row per reviewed account. The table below is a suggested starting point for the current seeded and expected operational roles.

| User name         | Email or username                                                                                | Role                  | Jurisdiction scope                   | Still required | Manager or owner confirmation                                          | MFA compliant | Action required                                         | Action owner      | Completion date | Notes                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------ | --------------------- | ------------------------------------ | -------------- | ---------------------------------------------------------------------- | ------------- | ------------------------------------------------------- | ----------------- | --------------- | ---------------------------------------------------------------- |
| National admin    | `admin@xypes.local` or production equivalent                                                     | `NATIONAL_ADMIN`      | Global or unscoped                   | `No`           | `Confirmed unnecessary for city-first pilot`                           | `No`          | `Disable for pilot deployment`                          | `System owner`    | `2026-06-30`    | Sample pilot posture keeps national role out of live scope       |
| Regional director | `regional.director@xypes.local` or production equivalent                                         | `REGIONAL_DIRECTOR`   | Region II or approved regional scope | `No`           | `Confirmed unnecessary unless regional governance is formally enabled` | `No`          | `Do not enable in pilot`                                | `System owner`    | `2026-06-30`    | Keep disabled until regional rollout is approved                 |
| Provincial admin  | `supervisor@xypes.local` or production equivalent                                                | `PROVINCIAL_ADMIN`    | Assigned province                    | `No`           | `Deferred for city-first pilot unless province escalation requires it` | `No`          | `Do not enable in pilot`                                | `Operations lead` | `2026-06-30`    | Sample posture keeps provincial scope out of initial live roster |
| City admins       | `ops.lead@xypes.local`, `tuguegarao.city.admin@xypes.local`, or production equivalents           | `CITY_ADMIN`          | Assigned city only                   | `Yes`          | `Confirmed by city operations owner`                                   | `Yes`         | `Keep enabled with monthly review`                      | `Operations lead` | `2026-06-30`    | Sample pilot keeps one primary and one backup city admin only    |
| Dispatchers       | `dispatcher@xypes.local`, `tuguegarao.dispatcher@xypes.local`, or production equivalents         | `DISPATCHER`          | Assigned city only                   | `Yes`          | `Confirmed against active operations roster`                           | `Yes`         | `Keep enabled for active staff only`                    | `Operations lead` | `2026-06-30`    | Review roster monthly                                            |
| Responders        | `responder@xypes.local`, `tuguegarao.responder@xypes.local`, or production equivalents           | `RESPONDER`           | Assigned city or responder scope     | `Yes`          | `Confirmed against active field roster`                                | `Yes`         | `Keep enabled for current field users only`             | `Operations lead` | `2026-06-30`    | Remove promptly when no longer field-active                      |
| Auditor           | `auditor@xypes.local` or production equivalent                                                   | `AUDITOR`             | Read-only approved scope             | `Yes`          | `Confirmed for compliance oversight`                                   | `Yes`         | `Keep enabled with read-only scope`                     | `DPO Office`      | `2026-06-30`    | One auditor account is sufficient for pilot sample               |
| Content editors   | `content.editor@xypes.local`, `tuguegarao.content.editor@xypes.local`, or production equivalents | `CITY_CONTENT_EDITOR` | Assigned city only                   | `Conditional`  | `Enable only if operational content workflow is live`                  | `Yes`         | `Disable unless content editing is part of pilot scope` | `Operations lead` | `2026-06-30`    | Prevent role creep into incident operations                      |

## 3. Service Accounts And Secrets Review

| Account or secret | Purpose                                                             | Owner            | Still required | Rotation needed | Last rotated | Action required                                         | Notes                                 |
| ----------------- | ------------------------------------------------------------------- | ---------------- | -------------- | --------------- | ------------ | ------------------------------------------------------- | ------------------------------------- |
| API key           | API-level access control for trusted clients or integrations        | `System owner`   | `Yes`          | `Yes`           | `2026-06-01` | `Rotate before go-live and record owner`                | Confirm stale keys are revoked        |
| Webhook secret    | Password reset, monitoring, or privacy incident webhook integration | `Security owner` | `Yes`          | `Yes`           | `2026-06-01` | `Confirm approved destination and rotate on deployment` | Confirm destination is still approved |
| Service account   | Operational integration or automation account                       | `Security owner` | `Conditional`  | `Yes`           | `2026-06-01` | `Remove if no automation is live`                       | Confirm least-privilege scope         |

## 4. CIRS-Specific Review Steps

Run these steps during every review cycle:

1. Export the current user and privileged-role list from the deployed environment.
2. Compare the live list to the approved staffing roster.
3. Confirm every privileged user still belongs to the correct LGU, department, city, or province scope.
4. Check MFA status and any available auth-session anomalies.
5. Review recent audit activity for unexplained admin, export, or rights-handling actions.
6. Disable or downgrade any account that is no longer justified.

## 5. Review Questions

For each account, confirm:

1. The person still works in the relevant function or department.
2. The assigned role is the minimum necessary role.
3. The jurisdiction scope is still correct.
4. MFA is enabled where required.
5. There are no unresolved anomalies in session or audit activity.
6. Offboarding or downgrade is immediate if access is no longer needed.

## 6. Findings Summary

| Finding                                                                                               | Severity | Action                                                               | Owner          | Due date     | Status |
| ----------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------- | -------------- | ------------ | ------ |
| `Non-city roles remain present in seeded environments and must not be enabled in live pilot accounts` | `High`   | `Disable national, regional, and provincial roles for initial pilot` | `System owner` | `2026-07-05` | `Open` |

## 7. Sign-Off

- Reviewer sign-off: `Privacy Governance Review Team - sample sign-off pending`
- Operations lead sign-off: `City Operations Lead - sample sign-off pending`
- System owner sign-off: `CIRS System Owner - sample sign-off pending`
- DPO sign-off if privacy-sensitive issues were found: `DPO Office - sample sign-off pending`

## 8. Filing Rule

Keep the completed access review with supporting evidence, including the reviewed account list, approval notes, and remediation actions.
