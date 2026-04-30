# Privacy Management Program

## Cover Page

| Field | Value |
| --- | --- |
| Document title | `Citizen Incident Reporting System Privacy Management Program` |
| Deployment context | `LGU-first pilot and registration-stage compliance package` |
| Intended use | `Internal governance approval, registration support, and operational privacy control alignment` |
| Organization | `[Insert LGU, office, or agency name]` |
| Prepared for | `DPO, system owner, records officer, and approving authority` |
| Prepared by | `[Insert responsible officer, privacy lead, or policy drafter]` |
| Effective date | `2026-04-30` |
| Version | `pilot-v1.0` |

### Issuance Note

This document is intended for internal approval and governance use. Replace all bracketed placeholders with LGU-specific names, titles, control references, and approval details before formal issuance.

This document is the pilot-stage Privacy Management Program for the Citizen Incident Reporting System (CIRS) deployment model represented by this repository.

It is written for LGU-first operations and should be used together with:

- `docs/public-privacy-notice-draft.md`
- `docs/lawful-basis-register.md`
- `docs/privacy-governance-operations-guide.md`
- `docs/privacy-incident-playbook.md`
- `docs/staff-privacy-training-outline.md`
- `docs/privacy-impact-assessment-pilot.md`
- `docs/data-processing-system-description.md`

This is a working governance document for pilot and registration-stage compliance. It is not a substitute for legal advice.

## Document Control

| Field                   | Value                                                             |
| ----------------------- | ----------------------------------------------------------------- |
| Document owner          | Operating LGU through the designated DPO and system owner         |
| Confidentiality         | Internal governance document                                      |
| Status                  | Pilot draft for internal approval                                 |
| Related public document | `docs/public-privacy-notice-draft.md`                             |
| Required review trigger | Any material processing, hosting, retention, or role-scope change |

## 1. Program Information

- Program name: `Citizen Incident Reporting System Privacy Management Program`
- Version: `pilot-v1.0`
- Effective date: `2026-04-30`
- Review cycle: `quarterly at minimum and before any material processing change`
- Operating model: `LGU-operated incident reporting and response platform`
- Primary controller context: `The operating LGU acts as personal information controller for production use`

## 2. Privacy Policy

### Public-facing privacy policy

The public-facing privacy policy for this system must be:

1. publicly visible
2. written in plain language
3. aligned with the actual processing behavior of the deployed API
4. version-controlled and reviewed when processing changes

Current repository source:

- `docs/public-privacy-notice-draft.md`
- `docs/cirs-privacy-site/privacy.html`

Minimum policy content:

1. who is responsible for the data
2. what the system is used for
3. what personal data is collected
4. why the data is processed
5. lawful basis summary in plain language
6. who may receive the data
7. whether external or cross-border processing occurs
8. retention period or retention schedule summary
9. data subject rights and contact details
10. security safeguards summary

Operational rule:

The public notice must match the notice version enforced by the system for onboarding or privacy notice acknowledgement.

## 3. Internal Data Handling Procedures

The operating LGU must maintain short internal procedures for staff and admins. At minimum, the following procedures are required.

### 3.1 Account and access handling

1. Verify the identity and role need of each staff member before account issuance.
2. Assign the narrowest valid role and jurisdiction scope.
3. Require MFA where the deployment profile supports privileged access protection.
4. Revoke or downgrade access immediately when a user changes role or leaves the organization.
5. Review privileged access at least monthly.

### 3.2 Incident data handling

1. Use CIRS as the primary handling surface for incident records.
2. Do not export, screenshot, or forward incident data outside approved workflows unless formally authorized.
3. Limit access to the staff responsible for the relevant operational workflow.
4. Treat exact location, attachments, narratives, and linked identity data as restricted.
5. Log and investigate unusual access, privilege misuse, or out-of-scope disclosure.

### 3.3 Retention and disposal

1. Apply a specific approved retention period for each record class.
2. Use archive-aware behavior where records are operationally inactive but still within retention.
3. Suspend deletion or disposal when a legal hold, complaint, or ongoing investigation applies.
4. Record disposal approvals and evidence when records are destroyed.

### 3.4 Vendor and transfer handling

1. Maintain a processor register for every hosting, database, auth, storage, monitoring, and notification vendor.
2. Review cross-border hosting or data transfer implications before production use.
3. Record contract ownership, DPA status, renewal dates, and transfer assessment references.

Repository implementation guide:

- `docs/privacy-governance-operations-guide.md`

## 4. Breach Response Procedure

The CIRS breach and privacy incident response procedure is documented in:

- `docs/privacy-incident-playbook.md`

The operating LGU must be prepared to act inside the 72-hour reporting window where the applicable NPC reporting threshold is met.

### 4.1 Immediate actions

Within the first response window:

1. contain the incident without destroying evidence
2. notify the DPO and system owner immediately
3. create or update the privacy incident record
4. identify the affected data categories and likely affected persons
5. preserve logs, audit evidence, screenshots, and vendor notices

### 4.2 72-hour response window

| Time window    | Minimum action                                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 0 to 24 hours  | Confirm incident trigger, contain exposure, preserve evidence, notify internal owners, open the incident record                         |
| 24 to 48 hours | Assess severity, affected data, affected population, likely harm, and whether third-party processors are involved                       |
| 48 to 72 hours | Finalize notification decision, prepare regulator-facing summary where required, document whether affected individuals must be informed |

### 4.3 Required decision record

The incident record must include:

1. incident reference and discovery time
2. reporter and affected system
3. categories of data involved
4. estimated affected population
5. containment steps taken
6. notification decision and timing
7. corrective actions and closure review

## 5. Data Subject Request Handling

The system must support handling for:

1. access requests
2. correction or rectification requests
3. erasure, blocking, or deletion-related review where legally available
4. objection or restriction requests where applicable
5. privacy complaints

Repository support surfaces:

- data-subject request workflow endpoints
- `docs/cirs-privacy-site/rights.html`
- `docs/privacy-governance-operations-guide.md`

### 5.1 Intake rules

1. route all requests through the DPO or designated privacy office
2. verify requester identity before releasing or changing personal data
3. record the request type, scope, intake date, and reviewing owner
4. avoid informal approvals through chat, email, or verbal side channels

### 5.2 Access

1. identify the relevant records and lawful limitations
2. prepare a privacy-safe response package
3. record the decision and release date

### 5.3 Correction

1. identify the disputed record
2. collect supporting evidence where needed
3. record the corrected field, decision maker, and correction date

### 5.4 Erasure or blocking

1. assess whether retention, legal hold, audit, or public authority obligations limit deletion
2. document whether the request is granted, partially granted, or denied
3. record the basis for the final decision

## 6. Staff Training Plan On Data Privacy

The pilot-stage staff training plan for CIRS is based on:

- `docs/staff-privacy-training-outline.md`
- `docs/cirs-privacy-site/training.html`

### 6.1 Training tracks

1. All staff: privacy basics, confidentiality, phishing awareness, acceptable use, and incident reporting.
2. Responders and dispatchers: minimum necessary access, sensitive narrative handling, and no off-platform sharing.
3. Admins and supervisors: account lifecycle, rights workflow, incident oversight, and audit expectations.
4. Technical operators: secrets handling, deployment safeguards, backups, vendor changes, and logging protection.
5. DPO and reviewers: lawful basis, rights handling, breach-response decisions, and documentation quality.

### 6.2 Training cadence

1. before live account issuance
2. at least annually
3. after major workflow or policy change
4. after a significant privacy or security incident

### 6.3 Evidence to retain

1. attendance list
2. training material version
3. completion date
4. acknowledgement or quiz result where used
5. follow-up actions when gaps are identified

## 7. Program Governance Roles

Minimum pilot ownership model:

1. DPO: approves notice language, reviews requests, reviews incidents, signs off on retention and transfer positions.
2. System owner: accountable for production deployment and vendor coordination.
3. Security or infra owner: manages hosting, secrets, logs, backups, and technical containment.
4. Operations lead: confirms workflow fit, access assignments, and field handling expectations.
5. Records officer or equivalent: approves retention and disposal evidence.

## 7.1 Minimum approval matrix

| Role                        | Minimum approval responsibility                                                       |
| --------------------------- | ------------------------------------------------------------------------------------- |
| DPO or privacy lead         | Reviews lawful basis, rights handling, notices, and incident response readiness       |
| System owner                | Confirms the program matches the actual deployed architecture and processor inventory |
| Security or infra owner     | Confirms secrets handling, logging, backup, and containment procedures                |
| Records or governance owner | Confirms retention, legal hold, and disposal posture                                  |

## 8. Review And Maintenance

Review this program when:

1. a new processor or hosting region is introduced
2. a new personal-data field or public endpoint is added
3. retention behavior changes
4. AI triage, scoring, or profiling is introduced
5. a significant privacy incident occurs
6. the DPO or system owner changes

## 8.1 Required supporting records

This program should be approved together with the following records or their LGU-specific equivalents:

1. approved retention schedule
2. processor and transfer register
3. access review register
4. privacy incident register and escalation contacts
5. staff training attendance and completion evidence

## 9. Pilot Sign-Off Block

| Sign-off item | Name and title                                                                   | Signature or approval reference                          | Date                     |
| ------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------ |
| Prepared by   | `[Insert responsible officer, privacy lead, or policy drafter]`                  | `[Insert signature, memo number, or approval reference]` | `2026-04-30`             |
| Reviewed by   | `[Insert DPO or approving authority]`                                            | `[Insert signature, memo number, or approval reference]` | `2026-04-30`             |
| Approved by   | `[Insert head of office, city administrator, or equivalent approving authority]` | `[Insert signature, memo number, or approval reference]` | `[Insert approval date]` |

Next review due: `2026-07-30`
