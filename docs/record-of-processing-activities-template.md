# CIRS Record Of Processing Activities Template

Use this document as the working record of processing activities for the CIRS deployment.

It is pre-filled for the current API feature set so the operating LGU can review, complete, and approve it as part of its privacy governance records.

Use this together with:

- `docs/lawful-basis-register.md`
- `docs/privacy-governance-operations-guide.md`
- `docs/processor-register-template.md`
- `docs/retention-schedule-template.md`

## 1. Record Metadata

- LGU or operating authority: `Tuguegarao City pilot deployment sample`
- Environment or deployment name: `CIRS Production`
- Record owner: `CIRS System Owner - sample assignment`
- DPO reviewer: `DPO Office - sample reviewer`
- Effective date: `2026-05-01`
- Next review date: `2026-08-01`

## 2. Processing Activity Register

Use one row per major processing activity.

| Processing activity                                        | Purpose                                                          | Categories of data subjects                                          | Categories of personal data                                                                  | Lawful basis                                                                               | Internal recipients                                                       | External processors or recipients                                | Retention reference                   | Security controls summary                                                        | Notes                                                            |
| ---------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Citizen account registration and authentication            | Create and secure citizen-facing accounts                        | Citizens, reporters, account holders                                 | Name, email, mobile number, password hash, auth metadata, MFA state                          | Contract or steps at request of data subject                                               | Admins, auth support roles, authorized operators where needed             | Auth provider, database provider, hosting provider               | `docs/retention-schedule-template.md` | JWT or auth controls, MFA, audit logging, rate limiting, password reset controls | Align with onboarding privacy notice                             |
| Citizen profile linking and account-to-citizen association | Associate a user account with the correct citizen-facing profile | Citizens, account holders                                            | Contact details, citizen linkage data, account identifiers                                   | Contract or steps at request of data subject                                               | Authorized operators, admin reviewers where needed                        | Database provider, hosting provider                              | `docs/retention-schedule-template.md` | Role-based access, audit logging, scoped access                                  | Confirm only minimum linkage data is processed                   |
| Incident reporting and case creation                       | Receive and process incident reports                             | Citizens, reporters, complainants, affected persons                  | Identity data, contact details, location, incident narrative, category, status, attachments  | Public authority function, legitimate government service, vital interests where applicable | Dispatchers, responders, city or provincial admins, auditors as permitted | Database provider, hosting provider, storage provider if enabled | `docs/retention-schedule-template.md` | Role and jurisdiction controls, archive behavior, audit logging, rate limits     | High-risk category due to sensitive narratives and location data |
| Internal triage, assignment, escalation, and response      | Coordinate incident response and operational handling            | Citizens, responders, operators, affected persons                    | Incident details, assignee data, status history, locality and assignment records             | Public authority function or legitimate government service                                 | Dispatchers, responders, admins, auditors as permitted                    | Database provider, hosting provider                              | `docs/retention-schedule-template.md` | Role-based access, audit logging, scoped visibility                              | Review jurisdiction boundaries regularly                         |
| Public case lookup and trust-layer visibility              | Provide privacy-safe service visibility to the public            | Citizens, reporters, case inquirers                                  | Redacted case status, token-linked reference data, limited timeline entries                  | Legitimate government service with necessity and proportionality limits                    | Public users, authorized support staff                                    | Hosting provider, database provider                              | `docs/retention-schedule-template.md` | Redaction, tokenization, rate limiting, limited response design                  | Re-review when public exposure changes                           |
| Audit logging and security monitoring                      | Preserve accountability and investigate misuse                   | Staff, operators, administrators, citizens indirectly tied to events | User identifiers, route, action, IP, result, timestamps, security metadata                   | Legal obligation and legitimate interests                                                  | Security owner, system owner, DPO where needed                            | Monitoring provider, hosting provider, database provider         | `docs/retention-schedule-template.md` | Immutable logging approach, restricted access, alerting                          | Do not expose logs broadly                                       |
| Data-subject request intake and review                     | Receive and process privacy rights requests                      | Citizens, account holders, requesters                                | Request type, identity, supporting details, workflow notes, resolution summary               | Legal obligation                                                                           | DPO, authorized reviewers, admin support roles                            | Database provider, hosting provider                              | `docs/retention-schedule-template.md` | Access controls, audit logging, workflow tracking                                | Keep reasoning and outcomes documented                           |
| Privacy incident and breach management                     | Document, assess, and respond to privacy incidents               | Affected individuals, staff, operators                               | Incident summary, affected categories, assessment notes, notification timing, reviewer notes | Legal obligation and legitimate interests                                                  | DPO, security owner, system owner, limited reviewers                      | Database provider, hosting provider, monitoring provider         | `docs/retention-schedule-template.md` | Restricted access, audit logging, escalation workflow                            | Preserve notification decision trail                             |
| Cross-border transfer and processor governance             | Review vendors, residency posture, and transfer controls         | Vendors, operators, indirectly affected data subjects                | Hostnames, service contacts, transfer references, processor metadata                         | Legal obligation and legitimate interests                                                  | DPO, system owner, security owner                                         | External vendors under review                                    | `docs/retention-schedule-template.md` | Processor register, startup validation, residency controls                       | Keep aligned with actual env and vendor set                      |

## 3. Completion Notes

When finalizing this record:

1. Replace generic processor labels with actual provider names.
2. Confirm every activity aligns with the lawful basis register.
3. Confirm retention references point to the signed retention schedule.
4. Confirm public-facing activities remain proportionate and privacy-safe.
5. Update the record when new endpoints, new processors, or materially new data categories are introduced.

## 4. Review Log

| Date         | Change made                                | Reason                         | Approved by                            | Notes                                                                |
| ------------ | ------------------------------------------ | ------------------------------ | -------------------------------------- | -------------------------------------------------------------------- |
| `2026-04-29` | Initial CIRS processing register completed | Baseline privacy documentation | `DPO Office - sample approval pending` | `Replace generic provider labels with actual vendors before go-live` |
