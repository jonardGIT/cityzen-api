# CIRS Retention Schedule Working Template

Use this document to define how long each class of CIRS records is kept, when it is archived, when it can be disposed of, and who approves exceptions.

It is intentionally pre-filled with CIRS-specific record classes and suggested starting positions so the LGU can review, revise, and approve it instead of starting from a blank form.

This schedule should be approved by the LGU's DPO, records officer, and system owner before production use.

Use this together with:

- `docs/lawful-basis-register.md`
- `docs/privacy-governance-operations-guide.md`
- `GET /api/v1/admin/security/data-governance`

## 1. Approval Block

- LGU or operating authority: `Tuguegarao City pilot deployment sample`
- Environment or deployment name: `CIRS Production`
- Effective date: `2026-05-01`
- Review date: `2027-05-01`
- Approved by DPO: `DPO Office - sample approval pending`
- Approved by records officer: `City Records Officer - sample approval pending`
- Approved by system owner: `CIRS System Owner - sample approval pending`

Status note:

This schedule is a starting governance draft for the current CIRS API feature set. Exact disposal periods must be aligned with LGU policy, records-management obligations, active investigations, legal holds, and DPO review.

## 2. Retention Rules

Use one row per record class. The entries below are suggested starting positions for the current repository.

| Record class                  | Description                                        | Typical data included                    | Legal or operational basis for retention                        | Retention clock starts                                            | Retention period                                                       | Archive rule                                                                        | Disposal rule                                                                                      | Legal-hold override | System owner                      | DPO review required | Notes                                                                      |
| ----------------------------- | -------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------- | ------------------- | -------------------------------------------------------------------------- |
| Citizen accounts              | Citizen-facing user accounts                       | Name, email, mobile, auth metadata       | Service delivery, account security, accountability              | Account closure or last account activity, depending on LGU policy | `3 years after account closure or last verified activity`              | Archive inactive or closed accounts where operationally required                    | Dispose only after approved schedule ends and no legal hold, complaint, or active incident remains | Yes                 | System owner + DPO                | Yes                 | Sample period only; confirm with DPO and records officer                   |
| Incident reports              | Main operational incident records                  | Narrative, location, status, assignments | Public service delivery, accountability, public safety response | Incident closure date or final administrative closure date        | `7 years after final closure`                                          | Archive when closed and inactive                                                    | Dispose only after approved schedule ends and no investigation, complaint, or legal hold remains   | Yes                 | Operations lead + records officer | Yes                 | Sample accountability-heavy period for pilot governance                    |
| Incident attachments          | Uploaded evidence and media                        | Images, video, files, metadata           | Evidence handling, incident documentation, accountability       | Incident closure date or linked case closure date                 | `7 years after linked incident closure`                                | Archive with linked incident when retention still applies                           | Dispose only after linked record is eligible and no evidentiary hold applies                       | Yes                 | System owner + operations lead    | Yes                 | Keep aligned with incident report retention unless DPO sets stricter rules |
| Audit logs                    | Security and accountability logs                   | Actor, action, route, IP, result         | Security, legal accountability, misuse investigation            | Event timestamp                                                   | `3 years from event date, with export if longer retention is required` | Keep immutable in primary store or approved export store                            | Dispose only after required accountability period and sign-off                                     | Yes                 | Security owner                    | Yes                 | Sample period assumes exported long-term evidence if needed                |
| Data-subject requests         | Privacy rights workflow records                    | Request type, status, reviewer notes     | Legal obligation, privacy governance, complaint handling        | Final resolution or closure date                                  | `5 years after final resolution`                                       | Preserve full workflow history until eligible for disposal                          | Dispose only after response and complaint windows are no longer relevant                           | Yes                 | DPO                               | Yes                 | Sample period intended to preserve complaint and review history            |
| Privacy incidents             | Breach and privacy incident records                | Assessment, timeline, notification notes | Legal obligation, security governance, regulator accountability | Incident closure date                                             | `7 years after closure and completion of all follow-up actions`        | Preserve full incident history and decision trail                                   | Dispose only after legal, review, and notification obligations end                                 | Yes                 | DPO + security owner              | Yes                 | Sample conservative period for regulator and audit readiness               |
| Sessions and security records | Refresh-token, session, and password-reset records | Session IDs, expiry, reset metadata      | Platform security, access control, incident investigation       | Session expiry, revocation, or reset completion date              | `180 days, unless linked to an active investigation`                   | Keep active records only as long as operationally needed; archive only if justified | Dispose after security review period ends and no incident review requires retention                | Yes                 | Security owner                    | No                  | Sample short-form period to stay proportionate                             |

## 3. Completion Guidance

For each row, confirm and finalize:

1. The exact trigger that starts the retention clock.
2. Whether the record should remain active, be archived, or be exported before disposal.
3. Whether there are special rules for legal hold, active investigations, complaints, or pending litigation.
4. Whether a disposal step needs approval evidence before it is executed.

## 4. Disposal Review Log

Use this section for recurring review cycles.

| Review date  | Reviewer                                  | Record classes reviewed                        | Items archived | Items held | Items approved for disposal | Action reference          | Notes                                                            |
| ------------ | ----------------------------------------- | ---------------------------------------------- | -------------- | ---------- | --------------------------- | ------------------------- | ---------------------------------------------------------------- |
| `2026-07-15` | `Privacy Governance Review Team - sample` | Incident reports, audit logs, privacy requests | `14`           | `3`        | `0`                         | `CIRS-RET-2026-Q3-SAMPLE` | `Sample review entry pending actual records-office confirmation` |

## 5. Exceptions And Legal Holds

Document any exceptions here.

| Date         | Record class     | Reason for exception or legal hold                   | Approved by                            | Expiry or review date | Notes                                                  |
| ------------ | ---------------- | ---------------------------------------------------- | -------------------------------------- | --------------------- | ------------------------------------------------------ |
| `2026-08-01` | Incident reports | Pending complaint, investigation, or litigation hold | `DPO Office - sample approval pending` | `2026-11-01`          | `Sample legal-hold entry for pilot documentation only` |

## 6. Minimum Review Cadence

1. Review the schedule at least annually.
2. Re-review whenever a new data category, public endpoint, storage provider, or legal requirement is introduced.
3. Re-review after any major privacy incident, litigation hold, or regulator inquiry.

## 7. Adoption Checklist

1. Replace all bracketed placeholders.
2. Confirm every retention period is approved by the DPO and records officer.
3. Confirm archive behavior in the deployed system matches the written rule.
4. Confirm disposal requires documented review and not only an automated deletion event.
5. File the signed version in the LGU's compliance records.
