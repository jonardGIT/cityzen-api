# Data Processing System Description

## Cover Page

| Field | Value |
| --- | --- |
| Document title | `Citizen Incident Reporting System Data Processing System Description` |
| Intended use | `Internal governance record, registration support, and processor or regulator briefing` |
| Deployment context | `LGU-first pilot deployment of the CIRS API and connected services` |
| Organization | `[Insert LGU, office, or agency name]` |
| Prepared for | `DPO, system owner, technical owner, and approving authority` |
| Prepared by | `[Insert responsible officer or technical owner]` |
| Description date | `2026-04-30` |
| Version | `pilot-v1.0` |

### Issuance Note

This document should describe the actual live processing configuration, not only the repository baseline. Update it when the deployed processor inventory, retention posture, hosting region, or automated processing changes.

This document describes the personal-data processing system represented by the Citizen Incident Reporting System (CIRS) API repository.

It is intended to support pilot-stage compliance documentation, registration-stage review, and internal governance review.

## Document Control

| Field           | Value                                                         |
| --------------- | ------------------------------------------------------------- |
| Document owner  | System owner with DPO review                                  |
| Confidentiality | Internal governance document                                  |
| Status          | Pilot draft for internal approval                             |
| Source of truth | Actual deployed API behavior and approved processor inventory |
| Review trigger  | Any processing, hosting, data model, or automation change     |

## 1. System Identification

- Name of system: `Citizen Incident Reporting System`
- System type: `LGU-operated incident reporting, coordination, and privacy-governance support platform`
- Repository scope: `Express 5 + TypeScript API with Prisma-backed PostgreSQL persistence`
- Description date: `2026-04-30`
- Prepared by: `Draft generated for repository owner review; replace with responsible officer or DPO name before formal use`

## 1.1 Processing context

The repository supports a city-first or LGU-first operational deployment model. In production use, the operating LGU acts as the personal information controller for the live service, while third-party cloud, hosting, auth, storage, and monitoring services act as processors where applicable.

## 2. Purpose Of Processing

The system processes personal data to:

1. receive and manage citizen incident reports
2. authenticate and manage users, admins, responders, and reviewers
3. support assignment, dispatch, coordination, and incident follow-up
4. maintain audit, accountability, and security records
5. support data subject requests and privacy incident documentation

## 3. Categories Of Data Subjects

The system may process data relating to:

1. citizens or reporters using the service
2. barangay residents or city residents identified in an incident record
3. responders, dispatchers, admins, auditors, and reviewers
4. children or minors where they appear in an incident narrative, attachment, or affected-person context
5. other individuals referenced in operational narratives, supporting evidence, or privacy request records

## 4. Types Of Personal Data Collected

Typical personal data handled by the system includes:

1. names, email addresses, mobile numbers, and account details
2. incident descriptions, locations, categories, statuses, and related communications
3. uploaded files, photos, videos, and other evidence
4. account and security metadata such as login activity, device or browser details, sessions, and password-reset records
5. privacy request details and incident documentation records

## 5. Types Of Sensitive Personal Information

Depending on use, the system may handle data that is sensitive or high-risk in context, including:

1. photos or video content containing faces, minors, homes, injuries, or emergency context
2. exact or near-exact location tied to a person or incident
3. narratives that may imply health, violence, vulnerability, or family circumstances
4. identity-linked emergency or public safety records

Operational note:

Even when the formal legal category depends on the exact content, these fields should be treated as restricted and not as ordinary low-risk data.

## 6. Retention Period

Retention must use specific periods and not indefinite storage.

Pilot baseline used by the repository governance pack:

| Record class          | Retention period                                          |
| --------------------- | --------------------------------------------------------- |
| Citizen accounts      | 3 years after account closure or last verified activity   |
| Incident reports      | 7 years after final closure                               |
| Audit logs            | 3 years from event date                                   |
| Data-subject requests | 5 years after final resolution                            |
| Privacy incidents     | 7 years after closure and completion of follow-up actions |

These periods must be confirmed against the operating LGU's approved retention schedule before production use.

## 7. Internal Access

Access may be granted internally only to authorized users on a need-to-know basis, including:

1. responders and dispatchers handling assigned incidents
2. city or LGU admins managing workflow and access
3. auditors and reviewers with approved oversight functions
4. DPO and privacy reviewers handling requests and incidents
5. technical operators with approved infrastructure or support duties

## 8. Third-Party Sharing

The system may share or expose data to third parties only where required for operation and governance, including:

1. the operating LGU and its authorized departments
2. hosting providers
3. database providers
4. authentication providers
5. file or media storage providers
6. monitoring or alerting providers
7. email, SMS, or webhook delivery providers

All such third parties should be documented in the processor register and covered by appropriate contractual controls.

## 8.1 Minimum processor inventory fields

Each processor entry should include at least:

1. provider name
2. processing function
3. hosting or processing region
4. contract owner
5. DPA or contract status
6. cross-border transfer assessment reference

## 9. Cross-Border Transfer

The system may involve data transfers outside the Philippines where cloud infrastructure, database hosting, monitoring, or notification tools are located in foreign jurisdictions such as Singapore or the United States.

Where this applies, the operating LGU must:

1. document the hosting region and transfer path
2. assess the transfer basis and safeguards
3. record the provider in the processor register
4. ensure DPO and system-owner review before production use

## 10. Automated Decision-Making Or Profiling

Current pilot posture:

- The repository is not documented as using automated decision-making or profiling as a formal production feature.

Forward-looking risk note:

- If AI triage, prioritization, recommendation, routing, or profiling is introduced later, the system description, PIA, privacy notice, and lawful basis review must all be updated before the feature is enabled in production.

## 11. Security Measures In Place

The system relies on layered technical and organizational safeguards, including:

1. authentication and session-security controls
2. optional MFA support for protected access paths
3. role-based and jurisdiction-scoped access control
4. audit logging for security-sensitive and mutating actions
5. rate limiting and abuse protection for exposed endpoints
6. privacy incident and breach-response documentation workflow
7. production fail-closed configuration checks for privacy and residency posture
8. retention and archive-aware governance controls

## 12. Related Documents

- `docs/privacy-management-program.md`
- `docs/privacy-impact-assessment-pilot.md`
- `docs/lawful-basis-register.md`
- `docs/privacy-governance-operations-guide.md`
- `docs/privacy-incident-playbook.md`
- `docs/public-privacy-notice-draft.md`

## 13. Review Trigger

Review this description whenever:

1. new categories of personal data are added
2. new data subjects or workflows are introduced
3. new processors or hosting regions are introduced
4. retention periods change
5. AI-assisted triage or profiling is added
6. a significant privacy incident reveals a documentation gap

## 14. Approval Record

| Sign-off item | Name and title                                    | Signature or approval reference                          | Date                     |
| ------------- | ------------------------------------------------- | -------------------------------------------------------- | ------------------------ |
| Prepared by   | `[Insert responsible officer or technical owner]` | `[Insert signature, memo number, or approval reference]` | `2026-04-30`             |
| Reviewed by   | `[Insert DPO or privacy reviewer]`                | `[Insert signature, memo number, or approval reference]` | `[Insert review date]`   |
| Approved by   | `[Insert approving authority]`                    | `[Insert signature, memo number, or approval reference]` | `[Insert approval date]` |
