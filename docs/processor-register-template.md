# CIRS Processor Register Working Template

Use this document to maintain an inventory of all vendors, subprocessors, and external services that handle or may access personal data processed by the CIRS API.

It is pre-filled with the processor categories that are already relevant to the current repository and deployment model.

This register should be reviewed by the DPO, system owner, and security or infrastructure owner.

Use this together with:

- `docs/lawful-basis-register.md`
- `docs/privacy-governance-operations-guide.md`
- `docs/production-env-templates.md`

## 1. Register Metadata

- LGU or operating authority: `Tuguegarao City pilot deployment sample`
- Environment or deployment name: `CIRS Production`
- Register owner: `CIRS System Owner - sample assignment`
- DPO reviewer: `DPO Office - sample reviewer`
- Last updated: `2026-04-29`
- Next review date: `2026-07-29`

## 2. Processor Inventory

Use one row per vendor or externally hosted service. The entries below are suggested starting lines for the current architecture.

| Vendor or service       | Service category                | Controller or processor role  | Data involved                                                    | Environment used    | Hosting region or residency posture                                               | Cross-border risk | Contract or DPA reference                                   | Transfer assessment reference                                               | Security contact                                                  | Renewal date | Owner                          | Notes                                                                                          |
| ----------------------- | ------------------------------- | ----------------------------- | ---------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------ | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Hosting provider        | Infrastructure hosting          | Processor or hosting provider | Application runtime data, infrastructure metadata                | Production, staging | `Cross-border documented`                                                         | `Medium`          | `Hosting contract reference pending final vendor selection` | `DTIA-2026-001 / MCC-2026-001 sample references`                            | `Security and infrastructure contact pending vendor finalization` | `2027-04-29` | System owner                   | Replace with actual provider name or mark as on-premises LGU infrastructure                    |
| Database provider       | Managed database                | Processor                     | Incident records, user records, audit data, privacy-request data | Production, staging | `Cross-border documented`                                                         | `High`            | `Supabase DPA reference pending final execution`            | `DTIA-2026-001 / MCC-2026-001 sample references`                            | `Vendor support and security contact pending entry`               | `2027-04-29` | System owner + security owner  | Sample row assumes Supabase-backed deployment; confirm residency and direct connection hosts   |
| Authentication provider | Auth and identity               | Processor                     | User identities, auth metadata, MFA state, session support data  | Production, staging | `Not applicable if local auth remains enabled; otherwise cross-border documented` | `Medium`          | `Not applicable for local auth sample baseline`             | `Not applicable unless external auth provider is enabled`                   | `System owner review required before enablement`                  | `2027-04-29` | System owner                   | Sample baseline currently assumes local auth in production until external provider is approved |
| Media storage provider  | File or object storage          | Processor                     | Incident attachments, metadata, signed access records            | Production, staging | `Not enabled in this environment sample`                                          | `Low`             | `Not applicable while disabled`                             | `Not applicable while disabled`                                             | `Operations lead review required before enablement`               | `2027-04-29` | Operations lead + system owner | If media storage is enabled later, add actual provider and transfer review                     |
| Monitoring provider     | Alerts, logs, monitoring        | Processor or subprocessor     | Error traces, operational logs, limited metadata                 | Production, staging | `Cross-border documented`                                                         | `Medium`          | `Monitoring services agreement reference pending`           | `DTIA-2026-002 sample reference if payload metadata leaves the Philippines` | `Security monitoring contact pending vendor entry`                | `2027-04-29` | Security owner                 | Sample row assumes privacy-filtered monitoring such as Sentry with PII minimization            |
| Messaging provider      | Email, SMS, or webhook delivery | Processor                     | Password reset or operational notification metadata              | Production, staging | `Hybrid or cross-border depending on webhook destination`                         | `Medium`          | `Notification services agreement reference pending`         | `Transfer review required if external notification provider is used`        | `Security owner to record contact after vendor confirmation`      | `2027-04-29` | Security owner                 | Include password-reset delivery webhook destination or mail provider if used                   |

## 3. CIRS-Specific Completion Notes

For the current repository, confirm these implementation-specific questions while completing the register:

1. Whether `SUPABASE_URL`, database hosts, or storage hosts appear outside the approved residency host list.
2. Whether password reset delivery or privacy-incident escalation webhooks are sent to external vendors.
3. Whether error monitoring captures personal data, stack traces only, or sanitized metadata.
4. Whether staging uses the same processors as production or a separate set.

## 4. Review Questions

For each entry, answer these before approving use:

1. Does the service receive personal data, metadata, or access to systems containing personal data?
2. Is the service a processor, subprocessor, or independent controller for the activity?
3. Is the hosting location in the Philippines, hybrid, or cross-border?
4. Is documented transfer assessment required?
5. Does the contract cover confidentiality, security, incident notification, assistance with rights requests, and deletion or return of data?
6. Is there an identified security contact and escalation path?

## 5. Change Log

| Date         | Change made                                                | Reason                         | Approved by                            | Notes                                                            |
| ------------ | ---------------------------------------------------------- | ------------------------------ | -------------------------------------- | ---------------------------------------------------------------- |
| `2026-04-29` | Added sample processor baseline for Tuguegarao-first pilot | Baseline privacy documentation | `DPO Office - sample approval pending` | `Replace sample references with signed contracts before go-live` |

## 6. Minimum Review Cadence

1. Review quarterly for active deployments.
2. Review before adding any new provider or integration.
3. Review immediately if hosting region, data flow, or contract scope changes.

## 7. Adoption Checklist

1. Replace generic provider labels with actual vendor names or `not applicable`.
2. Attach or reference the signed contract or DPA for each active provider.
3. Confirm every cross-border provider has matching transfer documentation.
4. Align the register with the live production env configuration and host inventory.
5. File the signed version in the LGU's compliance records.
