# Privacy Impact Assessment (Pilot)

## Cover Page

| Field | Value |
| --- | --- |
| Document title | `Citizen Incident Reporting System Privacy Impact Assessment` |
| Assessment scope | `Pilot-stage LGU deployment using the current API repository and connected processors` |
| Intended use | `Internal privacy review, pilot approval, and registration-stage compliance support` |
| Organization | `[Insert LGU, office, or agency name]` |
| Prepared for | `DPO, system owner, technical owner, and approving authority` |
| Assessed by | `[Insert responsible privacy reviewer or DPO name]` |
| Assessment date | `2026-04-30` |
| Version | `pilot-v1.0` |

### Issuance Note

This PIA is drafted as a baseline pilot assessment. It should be updated whenever the actual production deployment, hosting arrangement, processor inventory, or automation posture differs from the assumptions stated here.

This document is the pilot-stage Privacy Impact Assessment for the Citizen Incident Reporting System (CIRS).

It is intended for initial registration-stage compliance and deployment review, not as a replacement for a full external audit.

## Document Control

| Field                | Value                                                                                |
| -------------------- | ------------------------------------------------------------------------------------ |
| Document owner       | DPO or designated privacy reviewer with the system owner                             |
| Confidentiality      | Internal assessment document                                                         |
| Status               | Pilot draft for internal approval                                                    |
| Assessment type      | Baseline pilot-stage PIA                                                             |
| Reassessment trigger | New processor, new data category, new public exposure, or AI-assisted feature change |

## 1. PIA Information

- System assessed: `Citizen Incident Reporting System`
- Assessment scope: `Pilot-stage LGU deployment using the current API repository and connected hosting, database, auth, logging, and notification services`
- Assessment date: `2026-04-30`
- Conducted by: `[Insert responsible privacy reviewer or DPO name before formal use]`
- Supporting repository documents:
  - `docs/privacy-management-program.md`
  - `docs/data-processing-system-description.md`
  - `docs/lawful-basis-register.md`
  - `docs/privacy-incident-playbook.md`

## 2. Description Of The Data Flow

### 2.1 High-level flow

1. A citizen submits information through a CIRS-connected client surface such as a public app, web form, or assisted operator workflow.
2. The client sends the request to the CIRS API under `/api/v1`.
3. The API validates the request, authenticates the actor when required, and applies access or rate-limit controls.
4. The API stores the record in PostgreSQL or Supabase-backed Postgres using Prisma.
5. Authorized LGU staff, dispatchers, responders, admins, or reviewers access the record through approved operational interfaces.
6. Audit logs, security records, and privacy workflow records are created alongside the operational data where applicable.
7. Limited data may be exposed to approved processors such as hosting, database, auth, storage, monitoring, or notification providers.

### 2.2 Detailed flow by stage

| Stage               | Data movement                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Intake              | Citizen identity, contact details, incident narrative, location, and attachments move from the client to the API             |
| Processing          | API validation, role and scope checks, storage, workflow assignment, and audit logging occur in the server environment       |
| Internal access     | Authorized LGU users access records according to role and jurisdiction scope                                                 |
| Governance          | Rights requests, privacy incidents, retention review, and audit review are handled through internal administrative workflows |
| External processing | Hosting, database, auth, media storage, monitoring, and notification vendors may process data as approved processors         |

## 2.3 Systems and actors in scope

| Component or actor                     | Role in processing                                                       |
| -------------------------------------- | ------------------------------------------------------------------------ |
| Public or assisted intake client       | Collects incident and account information from the reporting party       |
| CIRS API                               | Validates, authenticates, scopes, logs, and persists operational records |
| PostgreSQL or Supabase-backed Postgres | Stores operational, auth, governance, and audit data                     |
| LGU operations staff                   | Uses the records for response, coordination, and review                  |
| DPO or privacy office                  | Handles rights requests, privacy review, and incident oversight          |
| Approved processors                    | Provide hosting, auth, storage, monitoring, and notification support     |

## 3. Identified Risks

The following pilot-stage risks were identified from the current repository behavior and deployment model.

| Risk ID | Risk description                                                         | Example scenario                                                                              |
| ------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| R1      | Re-identification through incident narratives, locations, or attachments | A public-facing or misdirected record reveals enough context to identify a person             |
| R2      | Unauthorized internal access                                             | An admin or responder views records outside their jurisdiction or operational need            |
| R3      | Data breach through account compromise or weak secrets                   | A privileged account, token, or environment secret is compromised                             |
| R4      | Cross-border transfer without sufficient documentation                   | Hosting or database infrastructure sits outside the Philippines without documented review     |
| R5      | Over-retention or disposal failure                                       | Records are kept indefinitely or deleted without approved retention handling                  |
| R6      | Informal handling of data subject requests                               | Staff respond to requests through chat or email without identity checks or documentation      |
| R7      | Processor-related exposure                                               | A third-party service reports exposure, downtime, or misconfiguration affecting personal data |
| R8      | Future automated decision-making risk                                    | AI triage, prioritization, or profiling is added later without updated impact assessment      |

## 4. Control Measures

| Risk ID | Control measures currently in place or required                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| R1      | Privacy-safe public endpoints, limited public disclosure, role-based access, restricted workflow access, retention and review documentation |
| R2      | Role-based access control, jurisdiction scoping, access reviews, audit logging, minimum-necessary handling rules                            |
| R3      | Authentication controls, MFA support, session security, rate limiting, secret handling procedures, incident-response workflow               |
| R4      | Processor inventory, residency posture review, transfer documentation, DPO and system-owner review before production use                    |
| R5      | Approved retention schedule, archive-aware behavior, legal-hold handling, disposal approval and evidence rules                              |
| R6      | Data-subject request workflow, DPO routing, identity verification, documented decision trail                                                |
| R7      | Vendor register, contract review, breach-response playbook, containment and notification decision records                                   |
| R8      | Review trigger requiring updated PIA, lawful basis review, and transparency update before AI triage or profiling is activated               |

## 5. Residual Risk Assessment

| Risk ID | Residual risk level                         | Why risk remains                                                                                                                          |
| ------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| R1      | Medium                                      | Even with access and disclosure controls, incident narratives and attachments can still contain highly identifying context                |
| R2      | Medium                                      | Human misuse or overbroad role assignment remains possible until recurring access review and training discipline are consistently applied |
| R3      | Medium                                      | Security controls reduce risk but cannot eliminate compromise from phishing, weak operational practice, or vendor failure                 |
| R4      | Medium                                      | Cross-border or hybrid hosting still requires documented legal and contractual review beyond code-level safeguards                        |
| R5      | Low to Medium                               | Archive-aware logic exists, but actual disposal quality depends on formal retention governance outside the application code               |
| R6      | Low to Medium                               | Workflow support exists, but staff can still bypass formal intake unless training and supervision are enforced                            |
| R7      | Medium                                      | Processor incidents remain partly outside direct LGU control even with contracts and notification expectations                            |
| R8      | Medium to High if introduced without review | Automated decision support could materially change rights impact, fairness risk, and transparency obligations                             |

## 6. Pilot PIA Conclusion

The current pilot architecture can be operated with a manageable privacy risk posture if the LGU completes the linked governance documents and operational controls.

The most important conditions for acceptable pilot use are:

1. publish and maintain the public privacy notice
2. approve a specific retention schedule
3. maintain a processor and residency register
4. operate a documented data subject request workflow
5. maintain a documented breach-response process inside the 72-hour window
6. train staff before live account issuance

## 6.1 Approval threshold for live use

This baseline PIA should be treated as sufficient for pilot deployment only if the following are true:

1. the retention schedule is approved
2. processor and residency records are complete
3. access reviews and staff training are operationalized
4. there is no undisclosed automated decision-making in the live workflow

## 7. Mandatory Follow-Up Actions

1. Insert the formal name of the responsible privacy reviewer or DPO.
2. Attach or reference the approved retention schedule.
3. Attach or reference the processor register and transfer assessment.
4. Re-run this PIA before enabling AI triage, scoring, or profiling features.
5. Review this PIA after any significant privacy incident or major processing change.

## 8. Approval Record

| Sign-off item             | Name and title                                      | Signature or approval reference                          | Date                     |
| ------------------------- | --------------------------------------------------- | -------------------------------------------------------- | ------------------------ |
| Assessed by               | `[Insert responsible privacy reviewer or DPO name]` | `[Insert signature, memo number, or approval reference]` | `2026-04-30`             |
| Reviewed by               | `[Insert system owner or technical owner]`          | `[Insert signature, memo number, or approval reference]` | `[Insert review date]`   |
| Approved for pilot use by | `[Insert approving authority]`                      | `[Insert signature, memo number, or approval reference]` | `[Insert approval date]` |
