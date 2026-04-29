# Privacy Compliance Closeout Checklist

Use this checklist to turn the repository's privacy and governance documents into a deployment-ready compliance pack.

This checklist is for the final closeout stage before an LGU pilot, partner-LGU rollout, procurement review, or formal DPO sign-off.

It focuses on the work that still must be completed outside the codebase.

For a consolidated summary of the remaining external items, use `docs/privacy-external-blockers-report.md`.

## 1. Document Completion

Complete each of these documents and remove or replace all bracketed placeholders:

1. `docs/privacy-governance-policy-draft.md`
2. `docs/public-privacy-notice-draft.md`
3. `docs/lawful-basis-register.md`
4. `docs/record-of-processing-activities-template.md`
5. `docs/processor-register-template.md`
6. `docs/retention-schedule-template.md`
7. `docs/access-review-template.md`
8. `docs/privacy-incident-playbook.md`
9. `docs/staff-privacy-training-outline.md`

Closeout rule:

Do not treat any document as approved while placeholder names, dates, references, or owner fields remain unresolved.

## 2. Real-World Ownership Assignment

Confirm named owners exist for each required role:

1. DPO or accountable privacy lead
2. system owner
3. security or infrastructure owner
4. operations lead
5. records-management owner
6. executive approver or delegated authority

Evidence to keep:

1. names and titles
2. office or department
3. contact information
4. approval date

## 3. Processor And Vendor Finalization

Before sign-off, confirm:

1. each active hosting, database, auth, storage, monitoring, and webhook provider is named in the processor register
2. each provider has a contract or DPA reference
3. hosting region or residency posture is documented for each provider
4. any cross-border provider has matching transfer references and review notes
5. unused categories are marked `not applicable` or `not enabled in this environment`

## 4. Retention And Disposal Finalization

Before sign-off, confirm:

1. every record class has a real retention period, not a placeholder
2. the retention clock start is clearly defined
3. archive rules match actual deployed behavior
4. disposal requires documented review and not only automatic deletion
5. legal-hold and complaint exceptions are defined

## 5. Access Governance Finalization

Before sign-off, confirm:

1. the first live privileged-access review has been completed
2. all privileged users have named manager or owner confirmation
3. jurisdiction scopes are verified against actual operational assignments
4. stale, overbroad, or test accounts are disabled or downgraded
5. service accounts, API keys, and webhook secrets are reviewed and recorded

## 6. Privacy Notice Finalization

Before publication, confirm:

1. the LGU or operating authority name is inserted
2. DPO contact details are correct
3. the purposes and lawful-basis summary match the actual deployment
4. the processor and residency wording matches the current vendor posture
5. the notice version, effective date, and review date are set

## 7. Rights And Incident Readiness

Before sign-off, confirm:

1. a rights-request response owner is designated
2. escalation contacts for privacy incidents are current
3. at least one privacy-request tabletop exercise has been completed
4. at least one privacy-incident tabletop exercise has been completed
5. the privacy incident playbook reflects the actual escalation path and notification decision process

## 8. Training And Awareness Evidence

Before sign-off, confirm:

1. training materials are finalized for admins, dispatchers, responders, reviewers, and technical operators
2. staff with live access completed training before account issuance
3. attendance records and acknowledgement evidence are retained
4. refresher cadence is assigned and calendared

## 9. Technical And Operational Checks

Before sign-off, confirm:

1. production env values required for DPO contact, breach-response controls, and residency posture are configured
2. the production profile and actual runtime match the written governance documents
3. governance reporting is reachable and reviewed in the target deployment
4. backups, restore procedures, and audit-log protection are confirmed
5. any enabled monitoring or webhook integrations are reflected in the processor register

## 10. Executive And DPO Sign-Off

Minimum sign-off block to retain:

1. DPO approval of the policy, notice, and rights or incident workflow
2. system owner approval of the deployment and processor inventory
3. records-management approval of the retention schedule
4. executive or delegated authority approval for live operational use

## 11. Final Go Or No-Go Questions

Do not mark the compliance pack as deployment-ready unless all of these are true:

1. no critical document still contains unresolved placeholders
2. no active processor lacks a documented contract or residency review
3. no critical retention period is still undefined
4. no privileged-access review is outstanding for the live user set
5. no required DPO, records, or executive sign-off is missing

## 12. Closeout Record

| Item                                             | Status          | Owner     | Date completed | Evidence reference | Notes     |
| ------------------------------------------------ | --------------- | --------- | -------------- | ------------------ | --------- |
| Policy draft finalized                           | `[open/closed]` | `[owner]` | `[date]`       | `[reference]`      | `[notes]` |
| Public privacy notice finalized                  | `[open/closed]` | `[owner]` | `[date]`       | `[reference]`      | `[notes]` |
| Processor register finalized                     | `[open/closed]` | `[owner]` | `[date]`       | `[reference]`      | `[notes]` |
| Retention schedule finalized                     | `[open/closed]` | `[owner]` | `[date]`       | `[reference]`      | `[notes]` |
| Access review completed                          | `[open/closed]` | `[owner]` | `[date]`       | `[reference]`      | `[notes]` |
| Rights and incident tabletop exercises completed | `[open/closed]` | `[owner]` | `[date]`       | `[reference]`      | `[notes]` |
| DPO sign-off completed                           | `[open/closed]` | `[owner]` | `[date]`       | `[reference]`      | `[notes]` |
| Executive sign-off completed                     | `[open/closed]` | `[owner]` | `[date]`       | `[reference]`      | `[notes]` |
