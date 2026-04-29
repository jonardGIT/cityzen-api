# Lawful Basis Register

This document defines the lawful basis for processing personal and sensitive personal information handled by the CIRS API.

It is written for the current product shape of this repository: a Philippine LGU-first incident reporting and response API that supports citizen self-service, responder operations, audit logging, privacy request handling, and administrative security governance.

This register should stay aligned with:

- the actual API routes and data models under `src/` and `prisma/`
- the privacy notice version enforced by the runtime
- the retention, breach-response, and residency controls surfaced by `GET /api/v1/admin/security/data-governance`

## Governing Standard

The processing positions below are intended to align with:

1. Republic Act No. 10173 or the Data Privacy Act of 2012
2. Its Implementing Rules and Regulations
3. National Privacy Commission practical guidance on transparency, proportionality, legitimate purpose, security, accountability, and data subject rights

This file is an operational register, not a substitute for legal review by the LGU's Data Protection Officer or counsel.

## Controller Context

For the intended deployment model, the LGU or operating public authority using this API is the personal information controller for operational records created through the system.

This API acts as the technical processing layer used to:

- receive incident reports
- authenticate users and operators
- route incidents to authorized responders and administrators
- maintain audit and security records
- support data subject requests and breach-response administration

Third-party infrastructure used with this API, including database, auth, storage, monitoring, and notification providers, should be covered by separate processor contracts and transfer assessments where required.

## Processing Principles

All processing using this API should follow these rules:

1. Process only data that is necessary for the specific endpoint, workflow, or legal function.
2. Use the least intrusive lawful basis that still supports the operational requirement.
3. Do not rely on consent where the processing is actually required for public service delivery, platform security, fraud prevention, or legal compliance.
4. Use explicit consent only for processing that is optional, additional, or not strictly necessary for the requested service.
5. Treat exact location, incident narratives, attachments, contact details, and linked citizen identity as restricted data.
6. Keep public trust endpoints privacy-safe, redacted, and rate-limited.
7. Preserve auditable records for privileged, security-sensitive, and privacy-sensitive operations.

## Lawful Basis Matrix

| Processing activity                                                                 | Typical data involved                                                                                                   | Primary lawful basis                                                                                                                       | Why this basis fits the API                                                                                                                          |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Citizen account registration and authentication                                     | Name, email, mobile number, password hash, auth subject, MFA state, session metadata                                    | Contract or steps at the request of the data subject                                                                                       | The data subject initiates account creation and login so the API can provide the requested self-service account and authenticated features.          |
| Citizen mobile profile linking and account-to-citizen association                   | Name, contact info, preferred channel, account identifiers, citizen linkage data                                        | Contract or steps at the request of the data subject                                                                                       | The user asks the system to create or link a citizen-facing profile so the platform can deliver the requested service correctly.                     |
| Citizen incident reporting                                                          | Reporter identity, contact details, location, incident description, uploaded evidence, related status and category data | Performance of a public authority function or legitimate government service; vital interests when emergency conditions apply               | The core purpose of the API is to receive and process incident reports for local public safety, emergency coordination, and response operations.     |
| Internal incident triage, assignment, escalation, and response coordination         | Incident details, citizen identity, responder identity, locality, status history, assignment records                    | Performance of a public authority function or legitimate government service                                                                | Operators process incident records to deliver the LGU's emergency, safety, and coordination mandate.                                                 |
| Public case lookup and trust-layer status visibility                                | Redacted case status, limited timeline or reference data, case token metadata                                           | Legitimate government service with strong necessity and proportionality limits                                                             | The endpoint exists to provide public trust and service visibility while intentionally withholding full internal incident data.                      |
| User, role, jurisdiction, and capability administration                             | Operator identity, role, jurisdiction scope, account lifecycle data                                                     | Legitimate interests of the controller in secure administration, plus public authority function where the deployment is operated by an LGU | The API must restrict access, define accountability, and limit who may act on behalf of the LGU.                                                     |
| Auth-session inventory, refresh-token rotation, logout, MFA, and device metadata    | Session IDs, expiry dates, refresh token hashes, IP address, user agent, MFA timestamps                                 | Legitimate interests in securing the platform and preventing unauthorized access                                                           | These controls are necessary to secure accounts, detect misuse, and enforce session governance.                                                      |
| Audit logging of auth, privileged, and mutating operations                          | Actor identity, route, method, IP address, user agent, target ID, outcome, security metadata                            | Legal obligation and legitimate interests in accountability, fraud prevention, incident response, and defensible administration            | The API needs tamper-resistant administrative records to investigate misuse, prove accountability, and support internal or regulatory review.        |
| Password reset, abuse throttling, and security alerting                             | Account identifiers, recovery metadata, webhook delivery events, rate-limit buckets, failed-attempt counters            | Legitimate interests in account recovery and platform security                                                                             | The processing is necessary to let authorized users recover access while preventing abuse and compromise.                                            |
| Data subject request intake and review                                              | Requester identity, request type, details, workflow notes, resolution summary, due dates                                | Legal obligation                                                                                                                           | Once a rights request is submitted, the controller must evaluate and respond under applicable privacy law and internal policy.                       |
| Privacy incident and breach register administration                                 | Incident summary, affected data categories, notification timing, NPC references, reviewer notes                         | Legal obligation and legitimate interests in security and accountability                                                                   | The API now includes a breach register because privacy incident handling and regulatory documentation are not optional once an incident is assessed. |
| Retention, archival, legal hold, and secure disposal workflows                      | Record metadata, archive timestamps, retention classifications, legal hold state                                        | Legal obligation and legitimate interests in records governance                                                                            | The controller must retain some records for accountability while disposing of others when no longer necessary and not under hold.                    |
| Cross-border transfer assessment, processor inventory, and residency posture review | Provider hostnames, processor categories, transfer references, security contact data                                    | Legal obligation and legitimate interests in governance and accountable processing                                                         | The repo already enforces residency and transfer documentation because infrastructure choices affect lawful and secure processing.                   |

## Consent Position

Consent in this API should be used narrowly.

Consent is appropriate for:

1. Privacy notice acknowledgement and transparency evidence during onboarding.
2. Optional communications or optional processing that is not required to provide the requested government service.
3. Optional disclosures or integrations that go beyond the platform's core incident-management and security functions.

Consent should not be treated as the primary basis for:

1. core incident intake and response operations
2. account security controls
3. audit logging
4. abuse prevention
5. legal retention or breach-response records
6. authenticated service delivery that the user specifically requested

If the processing is necessary even when the user would prefer not to provide optional agreement, use the correct non-consent basis and explain it transparently in the privacy notice.

## Sensitive Personal Information And High-Risk Data

This API can handle data that may qualify as sensitive or high-risk in practice, including:

- exact or near-exact location tied to a person or incident
- emergency narratives that may reveal health, safety, violence, or vulnerability context
- media evidence that may contain faces, homes, plates, minors, or medical context
- government-operator identity and access records

For those categories, the operational rule is:

1. collect only what the workflow requires
2. restrict access by role and jurisdiction
3. avoid public disclosure
4. preserve auditability
5. apply stronger storage, notification, and review controls

## Data Subject Rights Impact

The chosen lawful basis does not remove the need to support data subject rights.

This API should continue to support, document, and operationalize:

1. notice and transparency
2. access requests
3. correction or rectification where appropriate
4. erasure, blocking, or restriction where legally available
5. objection where applicable to the basis used
6. complaint, breach, and escalation handling

Where processing is based on legal obligation, public authority, or strong security necessity, the response to a rights request may be limited by law or operational necessity, but the basis and reason for limitation should be documented.

## Operational Mapping To Current Repo Features

The current repository already contains controls that should be read together with this register:

1. Privacy notice capture and enforcement for onboarding and first-time citizen profile creation.
2. Data subject request workflow endpoints for self-service and admin review.
3. Admin governance reporting for retention, legal hold, residency, and breach-response posture.
4. Admin privacy incident register endpoints for documented breach handling.
5. Startup validation that fails closed when breach-response and residency requirements are not configured in production.

## Required Follow-Through Outside This File

This lawful basis register is only one requirement. The LGU deployment should also maintain:

1. a public-facing privacy notice that uses the same bases in plain language
2. a record of processing activities
3. a processor and subprocessor inventory
4. a breach-response playbook and notification decision tree
5. retention and disposal schedules approved by the responsible authority
6. DPO review and sign-off for production use

## Review Trigger

Review and update this file whenever any of the following changes:

1. new personal-data fields are added to Prisma models or request payloads
2. a new public endpoint is introduced
3. a new external processor or cross-border transfer path is added
4. incident media or public trust behavior changes materially
5. rights-handling, breach-handling, or retention behavior changes
6. the privacy notice version or deployment model changes
