# Privacy Governance Operations Guide

This guide turns the repository's privacy and security features into day-to-day organizational controls.

It is written for the current LGU-first deployment model of the CIRS API and should be used by the operating LGU, its Data Protection Officer, system owner, and admin team.

Use this guide together with:

- `docs/lawful-basis-register.md`
- `docs/privacy-governance-policy-draft.md`
- `docs/public-privacy-notice-draft.md`
- `docs/record-of-processing-activities-template.md`
- `docs/production-readiness-checklist.md`
- `docs/production-service-runbook.md`
- `GET /api/v1/admin/security/data-governance`

This is not a substitute for legal advice. It is the practical implementation guide for the operational controls that the code now supports.

## 1. Control Owners

Assign named people, not job titles only.

Minimum ownership model:

1. DPO: approves privacy notice language, reviews rights requests, reviews incidents, signs off on retention and transfer positions.
2. System owner: accountable for the API deployment, vendor coordination, and production readiness.
3. Security or infra owner: manages hosting, secrets, backups, logging, and deployment controls.
4. Operations lead: owns responder and admin access assignments and confirms the workflow still matches actual LGU operations.
5. Records officer or equivalent: owns retention schedule approval, disposal evidence, and legal-hold coordination.

Store the current owner list in a separate internal contact sheet and review it every quarter.

## 2. First 30-Day Setup

Before production use, complete these in order:

1. Approve the lawful basis register in `docs/lawful-basis-register.md` with DPO review notes.
2. Publish a plain-language privacy notice aligned with the onboarding notice version enforced by the API.
3. Decide the official retention schedule for incidents, audit logs, user accounts, privacy requests, and privacy incident records.
4. Inventory all processors and subprocessors used by the deployment, including hosting, database, auth, storage, email or webhook providers, and monitoring vendors.
5. Sign or review vendor contracts, data-sharing terms, and processor clauses before live personal data is processed.
6. Configure production env values for DPO contact, breach-response controls, and residency posture.
7. Define the approval path for access requests, role changes, emergency access, and account deactivation.
8. Train admins, dispatchers, responders, and reviewers before issuing live accounts.
9. Run a tabletop exercise for one privacy request and one privacy incident.
10. Record the initial sign-off pack with date, approver names, and deployed environment details.

## 3. Staff Procedures

Write short, role-specific procedures instead of one long policy manual.

Required procedures:

1. Account issuance: who approves access, what identity checks are required, what role can be granted, and how jurisdiction scope is assigned.
2. Role change: who can request elevation, who approves it, and how temporary access expires.
3. Offboarding: when accounts are disabled, how tokens and sessions are revoked, and who confirms completion.
4. Incident handling: what staff may view, edit, assign, or export from incident records.
5. Privacy request handling: where requests are filed, response deadlines, approval path, and how outcomes are documented.
6. Privacy incident escalation: when to open a privacy incident record, when to notify the DPO, and who decides whether NPC or affected-person notification is required.
7. Legal hold handling: who can suspend deletion or disposal and how that hold is recorded.

Minimum procedure template:

1. Purpose
2. Scope
3. Responsible role
4. Step-by-step actions
5. Required evidence or logs
6. Escalation contact
7. Review date

Operational rule:

Keep each procedure to one or two pages. Staff should be able to follow it during real incident pressure.

## 4. Retention Schedule Guide

The code now supports archive-aware behavior, governance reporting, and privacy-incident documentation, but you still need a formal schedule approved by the LGU.

Define retention classes at minimum for:

1. Citizen accounts
2. Incident reports
3. Incident attachments or media
4. Dispatch and assignment activity
5. Audit logs
6. Data-subject requests
7. Privacy incident records
8. Password reset and session-security records

For each class, document:

1. Record description
2. Legal or operational reason for keeping it
3. Start of retention clock
4. Retention period
5. Archive rule
6. Disposal rule
7. Legal-hold override rule
8. Approval owner

Practical example fields:

| Record class          | Keep for                                      | Archive rule                                   | Disposal trigger                                             | Owner                          |
| --------------------- | --------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------ | ------------------------------ |
| Incident reports      | Defined by LGU-approved schedule              | Archive when closed and inactive               | Dispose only after schedule ends and no legal hold applies   | Records officer + system owner |
| Audit logs            | Defined by security and accountability policy | Keep immutable or export to approved log store | Dispose after required accountability period                 | Security owner                 |
| Data-subject requests | Defined by privacy governance schedule        | Keep full workflow history                     | Dispose only after the response record is no longer required | DPO                            |
| Privacy incidents     | Defined by breach documentation schedule      | Preserve all status and decision history       | Dispose only after legal and review obligations end          | DPO + security owner           |

Implementation steps:

1. Draft the schedule.
2. Get DPO and records-owner approval.
3. Mark any exceptions requiring legal hold.
4. Review whether the deployed archive behavior matches the written schedule.
5. Run a quarterly disposal review and log what was retained, archived, or held.

## 5. Vendor And Processor Contracts

Every external service touching personal data needs documented review.

At minimum, maintain a processor register with:

1. Vendor name
2. Service category
3. Data involved
4. Hosting region or likely data location
5. Contract owner
6. Security contact
7. Transfer assessment reference
8. Contract or DPA renewal date

Contract checklist:

1. Identify whether the vendor acts as processor, subprocessor, or independent controller.
2. Confirm the contract covers confidentiality, security, breach notification, assistance with data subject requests, deletion or return of data, and audit or review rights.
3. Document the vendor's hosting region and whether cross-border transfer documentation is required.
4. Record the contract reference in the processor register.
5. Review the contract annually or when the service scope changes.

For this repository, review at least:

1. Hosting provider
2. Database provider
3. Authentication provider
4. File or media storage provider
5. Monitoring or alerting provider
6. Email, SMS, or webhook delivery provider

If a provider is cross-border, ensure the repository's configured transfer references match the signed documentation and actual deployment.

## 6. Access Reviews

The code enforces roles and scoped access, but you still need recurring human review.

Monthly review steps:

1. Export the current privileged user list.
2. Verify each admin, dispatcher, responder, auditor, and content editor still needs access.
3. Verify jurisdiction scope still matches the person's assignment.
4. Remove or downgrade stale accounts immediately.
5. Review MFA compliance and unresolved session anomalies.
6. Log the review date, reviewer name, findings, and actions taken.

Quarterly review steps:

1. Reconfirm all privileged roles with department heads.
2. Review break-glass or emergency access events.
3. Review service accounts, API keys, and webhook secrets.
4. Confirm departed staff were fully offboarded.
5. Sample audit logs for unusual access patterns.

Minimum evidence to keep:

1. Reviewed user list
2. Approval or removal decisions
3. Ticket or memo reference
4. Completion date

## 7. Training Program

Training should be role-based, short, and repeated.

Minimum training tracks:

1. All staff: privacy basics, acceptable use, phishing awareness, incident reporting, and confidentiality.
2. Responders and dispatchers: minimum necessary access, handling sensitive narratives, and no off-platform sharing.
3. Admins: account management, rights-request workflow, privacy incident escalation, and export discipline.
4. DPO and reviewers: lawful basis, rights handling, breach assessment, and documentation quality.
5. Technical operators: secrets handling, production env validation, backup and restore, and vendor-change review.

Minimum training cadence:

1. Before account issuance
2. Annual refresher
3. After major workflow or policy changes
4. After a significant privacy or security incident

Evidence to retain:

1. Attendance list
2. Training material version
3. Completion date
4. Quiz or acknowledgement result when used

## 8. DPO Operations

The DPO should have a real operating routine, not only an escalation address.

Monthly DPO checklist:

1. Review new and open data-subject requests.
2. Review new and open privacy incidents.
3. Check the current privacy notice version against live onboarding behavior.
4. Review any new processor or infrastructure change.
5. Confirm breach-response contacts and decision paths still work.

Quarterly DPO checklist:

1. Review the lawful basis register.
2. Review the processor register and cross-border documentation.
3. Review retention schedule exceptions and legal holds.
4. Review access-review evidence.
5. Approve any necessary privacy notice updates.

Annual DPO checklist:

1. Reassess whether each processing activity is still necessary and proportionate.
2. Reassess whether public endpoints remain sufficiently redacted.
3. Reassess high-risk workflows such as incident media, exact location handling, and breach-response records.
4. Produce an annual privacy governance summary for the operating LGU.

## 9. Suggested Operating Cadence

Use this minimum cadence if you do not already have one.

Weekly:

1. Check open privacy requests.
2. Check open privacy incidents.
3. Review failed-login or alert spikes.

Monthly:

1. Perform access review.
2. Review governance report output.
3. Review backup and restore status.
4. Confirm vendor or infra changes did not introduce unreviewed processors.

Quarterly:

1. Review ownership list.
2. Review retention and legal-hold status.
3. Review vendor register and contract dates.
4. Run one tabletop exercise.

Annually:

1. Refresh training.
2. Reapprove privacy notice and lawful basis register.
3. Reassess cross-border posture and processor inventory.
4. Reapprove the retention schedule.

## 10. Evidence Pack To Keep

If the LGU is questioned by internal audit, leadership, or the NPC, this is the minimum pack you should be able to produce quickly.

1. Current privacy notice
2. Lawful basis register
3. Record of processing activities
4. Processor register and contracts
5. Retention schedule
6. Access-review logs
7. Training records
8. Open and closed data-subject request records
9. Open and closed privacy incident records
10. DPO review notes and sign-offs

## 11. How This Maps To The Current API

The repository already supports several parts of this operating model:

1. Privacy notice acceptance can be captured and versioned during onboarding.
2. Data-subject requests can be submitted and reviewed through dedicated API workflows.
3. Privacy incidents can be logged and tracked with status history.
4. Governance posture can be checked through the admin security governance report.
5. Production startup can fail closed when breach-response or residency settings are missing.

What the code does not replace:

1. DPO judgement
2. Staff discipline
3. Signed contracts
4. Approved retention schedules
5. Training attendance and evidence
6. Management sign-off

Use `docs/privacy-compliance-closeout-checklist.md` as the final deployment-readiness checklist for those non-code requirements.

## 12. Supporting Templates And Playbooks

Use these documents to turn this guide into working compliance artifacts:

1. `docs/retention-schedule-template.md`
2. `docs/processor-register-template.md`
3. `docs/privacy-incident-playbook.md`
4. `docs/access-review-template.md`
5. `docs/staff-privacy-training-outline.md`
6. `docs/record-of-processing-activities-template.md`
7. `docs/privacy-governance-policy-draft.md`
8. `docs/public-privacy-notice-draft.md`
9. `docs/tuguegarao-pilot-governance-baseline.md`
10. `docs/privacy-compliance-closeout-checklist.md`
