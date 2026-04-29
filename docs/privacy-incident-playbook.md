# Privacy Incident Playbook

Use this playbook when a privacy incident, suspected breach, or unauthorized disclosure involving CIRS data is reported or discovered.

This is the operational response guide that sits beside the API's privacy incident register and breach-response configuration.

Use this together with:

- `docs/privacy-governance-operations-guide.md`
- `docs/lawful-basis-register.md`
- deployed privacy incident workflow endpoints
- the current DPO and security escalation contacts

## 1. Trigger Conditions

Open or review a privacy incident when any of these occurs:

1. Personal data is viewed by an unauthorized person.
2. Personal data is sent to the wrong recipient or external party.
3. A device, account, token, or system with access to personal data is compromised.
4. Incident data is exported, copied, or disclosed outside approved workflows.
5. Hosted infrastructure or a vendor reports exposure, compromise, or loss involving relevant data.

## 2. Immediate Actions

Within the first response window:

1. Contain the issue if possible without destroying evidence.
2. Notify the DPO and system owner immediately.
3. Create or update the privacy incident record.
4. Record the time of discovery, reporter, affected system, and initial facts.
5. Preserve logs, screenshots, and relevant audit evidence.
6. Do not downplay, hide, or silently resolve the incident.

## 3. First Assessment Questions

1. What data was involved?
2. How many people may be affected?
3. Was sensitive, high-risk, or identity-linked data involved?
4. Is the exposure ongoing?
5. Did a processor or vendor contribute to the incident?
6. Could affected individuals face harm if the exposure is confirmed?

## 4. Roles During Response

1. DPO: privacy assessment, rights impact, notification decision support, regulator-facing review.
2. System owner: operational coordination and management reporting.
3. Security or infra owner: containment, evidence preservation, and technical remediation.
4. Operations lead: confirms operational impact and staff actions.
5. Records officer or counsel if needed: legal hold or documentation support.

## 5. Response Workflow

1. Detect and acknowledge the incident.
2. Contain the immediate risk.
3. Preserve evidence.
4. Assess severity and likely data impact.
5. Decide whether regulator or affected-person notification is required.
6. Remediate the root cause.
7. Document final outcome, lessons learned, and follow-up actions.

## 6. Minimum Incident Record Fields

Document at minimum:

1. Incident reference
2. Date and time discovered
3. Reporter
4. System or workflow involved
5. Data categories involved
6. Estimated affected population
7. Containment steps taken
8. Notification decision and timing
9. Corrective actions
10. Reviewer and closure date

## 7. Notification Decision Log

If notification is considered, record:

1. Who made the decision
2. What facts supported the decision
3. Whether NPC notification is required
4. Whether affected individuals must be informed
5. When notification was sent or why it was not required

## 8. Post-Incident Review

After closure, complete:

1. Root-cause summary
2. Control gap summary
3. Staff or vendor performance review
4. Required policy or configuration changes
5. Training updates if human error contributed

## 9. Tabletop Exercise Template

Run at least quarterly:

1. Choose one realistic scenario.
2. Walk through detection, containment, notification, and documentation.
3. Record blockers, missing contacts, and missing evidence.
4. Update this playbook or the workflow if needed.
