# Data Processing System Description

## Cover Page

| Field              | Value                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------- |
| Document title     | `Citizen Incident Reporting System Data Processing System Description`                  |
| Intended use       | `Internal governance record, registration support, and processor or regulator briefing` |
| Deployment context | `LGU-first pilot deployment of the CIRS API and connected services`                     |
| Organization       | `[Insert LGU, office, or agency name]`                                                  |
| Prepared for       | `DPO, system owner, technical owner, and approving authority`                           |
| Prepared by        | `[Insert responsible officer or technical owner]`                                       |
| Description date   | `2026-04-30`                                                                            |
| Version            | `pilot-v1.0`                                                                            |

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

## 1.2 Registration Requirement Coverage

The data processing system description for registration or governance review should explicitly cover the following minimum items.

| Requirement                                     | What this description must state                                                                                                          | Current repository coverage     |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Name and description of each system             | Name of the system, what it does, and the operational context in which it is used                                                         | Covered in Sections 1 and 1.1   |
| Types of data processed                         | Main categories of personal data and any higher-risk or sensitive data handled by the system                                              | Covered in Sections 4 and 5     |
| Categories of data subjects                     | The groups of individuals whose personal data may be processed                                                                            | Covered in Section 3            |
| Purpose of processing                           | Why the system processes personal data and what operational or governance functions it supports                                           | Covered in Section 2            |
| Retention period                                | Record classes, retention periods, and any approval dependency on the LGU schedule                                                        | Covered in Section 6            |
| Security measures                               | Technical and organizational safeguards used to protect the data                                                                          | Covered in Sections 7 and 11    |
| Whether automated decision-making is involved   | Whether the live system uses automated decisions, profiling, or AI-assisted triage                                                        | Covered in Section 10           |
| Whether data is transferred cross-border        | Whether external or foreign-hosted processors are involved and how transfer review is handled                                             | Covered in Sections 8 and 9     |
| Whether processing is performed as a PIC or PIP | Whether the organization uses the system as a personal information controller or processor, and whether separate registrations are needed | Covered in Sections 1.1 and 1.3 |

## 1.3 Current CIRS Use Assessment Against The Requirement

The current repository baseline supports the following assessment for the CIRS pilot deployment model.

| Requirement                                     | Current CIRS assessment                                                                                                                                                                                                                                                                                                                                                                                                                               | Status                                                 |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Name and description of each system             | The system is identified as the Citizen Incident Reporting System, an LGU-operated incident reporting, coordination, and privacy-governance support platform.                                                                                                                                                                                                                                                                                         | Covered                                                |
| Types of data processed                         | The description identifies account data, incident data, attachments, security metadata, and privacy-governance records, with a separate high-risk data section for sensitive context.                                                                                                                                                                                                                                                                 | Covered                                                |
| Categories of data subjects                     | The description identifies citizens, residents referenced in incidents, staff, minors appearing in records, and other persons mentioned in evidence or governance workflows.                                                                                                                                                                                                                                                                          | Covered                                                |
| Purpose of processing                           | The description explains operational intake, response coordination, account management, audit and security logging, and privacy workflow support.                                                                                                                                                                                                                                                                                                     | Covered                                                |
| Retention period                                | The description includes a pilot retention baseline by record class, but these periods still require LGU approval before formal registration or live reliance.                                                                                                                                                                                                                                                                                        | Covered with external approval dependency              |
| Security measures                               | The description identifies authentication, MFA support, RBAC, audit logging, rate limiting, breach workflow, fail-closed checks, and archive-aware controls.                                                                                                                                                                                                                                                                                          | Covered                                                |
| Whether automated decision-making is involved   | No formal production automated decision-making or profiling is documented in the current repository baseline.                                                                                                                                                                                                                                                                                                                                         | Covered                                                |
| Whether data is transferred cross-border        | The description states that cross-border transfer may occur when external providers are used and requires documented residency and transfer review.                                                                                                                                                                                                                                                                                                   | Covered with deployment-specific confirmation required |
| Whether processing is performed as a PIC or PIP | The current pilot model describes the operating LGU as the PIC for live service operation, while hosting, database, auth, storage, monitoring, and messaging vendors act as processors where applicable. No separate PIP registration use of the same system by the operating LGU is documented in the current baseline. If the same organization later uses CIRS in a processor role for another controller, that use must be registered separately. | Covered with separate-registration rule noted          |

## 1.4 Three-Surface Assessment For Registration Use

For this registration-oriented assessment, the connected CIRS deployment is broken into three practical system surfaces:

1. `MyTuguegarao` as the citizen-facing mobile or public-app surface referenced by the current CIRS docs
2. `CIRS Dashboard` as the staff and admin operational frontend described in the integration guidance
3. `CIRS API` as the backend processing, storage, and governance core in this repository

These can be documented together as connected systems, but if the same organization uses any one of them in both a personal information controller and a personal information processor role, that use should be registered separately.

| System surface                      | Name and description of the system                                                                                                                                                                        | Types of data processed                                                                                                                                                                 | Categories of data subjects                                                                                                                                | Purpose of processing                                                                                                                                                          | Retention period                                                                                                                                                                                                                        | Security measures                                                                                                                                                                                      | Automated decision-making                                                                                    | Cross-border transfer                                                                                                                                                             | PIC or PIP assessment                                                                                                                                                                                                                                             |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MyTuguegarao citizen-facing surface | Citizen-facing mobile or public-app surface for account registration, privacy-notice acknowledgement, profile linking, incident submission, and status follow-up                                          | Name, email, mobile number, account identifiers, citizen profile linkage data, location snapshots, incident narratives, attachments, notice acknowledgement or related account metadata | Citizens, reporters, account holders, residents or other persons identified in incident submissions                                                        | Deliver citizen self-service intake, reporting, account access, and status visibility                                                                                          | Authoritative retention should follow the backend retention schedule because the operational record lives in CIRS, while any device-local cache or session data should be minimized and governed by the mobile or client-session policy | TLS in transit, authenticated sessions, least local storage, API-backed validation, notice enforcement where enabled, and backend-auth security controls                                               | No formal production automated decision-making is documented in the current baseline for this surface        | Depends on the actual mobile hosting, notification, analytics, or backend provider set; do not assume cross-border transfer unless the deployed vendors are documented            | In the normal LGU deployment model, the operating LGU is the PIC for this surface. If the same app is later operated by a vendor on behalf of another controller, that processor use should be registered separately.                                             |
| CIRS Dashboard operational surface  | Staff and admin frontend for dispatchers, responders, city admins, auditors, and privacy reviewers; used for browser-based access to incidents, assignments, users, audit views, and governance workflows | Staff account and session data, incident records, citizen identity and contact details, assignment and workflow metadata, audit views, privacy-request and privacy-incident records     | Staff users, citizens and reporters whose records are viewed or managed, and other persons referenced in incidents or governance records                   | Support operational response, dispatch, review, access administration, audit visibility, and governance workflows                                                              | Authoritative record retention follows the backend schedule; dashboard-origin cookies or session artifacts should follow shorter browser-session or security retention rules                                                            | Same-origin auth proxy model, HttpOnly cookie handling on the dashboard origin, role and capability-aware access, MFA support where enabled, and API-enforced auth, validation, and audit behavior     | No formal production automated decision-making is documented in the current baseline for this surface        | Depends on the actual dashboard hosting, monitoring, and integrated provider set; document separately if frontend hosting or observability vendors are external or foreign-hosted | In the normal LGU deployment model, the operating LGU is the PIC for this operational surface. If the same dashboard is later used by a service provider in a processor role for another controller, register that use separately.                                |
| CIRS API processing core            | Backend processing, authentication, validation, storage, audit, and privacy-governance system under `/api/v1`, built with Express, Prisma, and PostgreSQL or Supabase-backed Postgres                     | Account data, incident data, attachments, location and narrative data, auth and security metadata, audit logs, privacy-request records, and privacy-incident records                    | Citizens, reporters, staff users, minors or vulnerable persons appearing in records, and other individuals referenced in incidents or governance workflows | Receive and validate reports, authenticate actors, enforce RBAC and scope, persist records, support audit and governance workflows, and expose approved operational interfaces | Pilot baseline is 3 years for citizen accounts, 7 years for incident reports, 3 years for audit logs, 5 years for data-subject requests, and 7 years for privacy incidents, subject to LGU approval                                     | Authentication and session controls, optional MFA, RBAC and jurisdiction scoping, audit logging, rate limiting, breach workflow support, privacy fail-closed configuration, and archive-aware controls | No formal production automated decision-making or profiling is documented in the current repository baseline | May involve foreign-hosted providers for hosting, database, auth, monitoring, storage, or notifications, so transfer and residency review must match the live deployment          | In the current pilot model, the operating LGU is the PIC for live use and external vendors are processors where applicable. If the same API stack is later run by one organization on behalf of another controller, that PIP use should be registered separately. |

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

Operational note:

These safeguards describe the repository baseline and expected deployment posture. Formal registration or sign-off still depends on verifying that the live environment, processor inventory, and approved controls match this description.

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
