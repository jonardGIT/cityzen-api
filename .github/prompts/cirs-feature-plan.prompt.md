---
description: 'Plan a CIRS API feature using the local orchestrator and return a sequenced execution plan grounded in the repo conventions.'
agent: 'orchestrator'
argument-hint: 'Describe the backend feature, rollout problem, security concern, or LGU workflow'
applyTo:
  - '**/xypes-cirs-api/**'
---

Use the local CIRS API `orchestrator` to plan and delegate this work.

<task>
{{input}}
</task>

<requirements>
- Follow the conventions in [.github/copilot-instructions.md](../copilot-instructions.md).
- Default to **Tuguegarao-first** rollout and partner-LGU patterns.
- Preserve `/api/v1` backward compatibility unless the task explicitly authorizes a breaking change.
- Use the standard order: schema → RBAC → CRUD/runtime → infra (if needed) → tests → review.
- Delegate each slice to the best-fit specialist (`schema-architect`, `rbac-engineer`, `crud-builder`, `infra-engineer`, `test-writer`, `reviewer`).
- Keep public endpoints privacy-safe and fail-closed.
- If the work spans the dashboard or mobile, return a coordination note for the user-level `xypes-platform-orchestrator` rather than implementing cross-repo.
</requirements>

<output>
Return:
- the delegated agents in order
- the main files or code areas each agent should touch
- key constraints that must hold during implementation
- the validation and review steps required before completion
- any cross-repo coordination notes
</output>
