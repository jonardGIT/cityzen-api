Build a production-ready audit log module for the Xypes CIRS dashboard using the backend contract in this repository.

Use `docs/dashboard-current-feature-prompt.md` as the governing prompt when role-model, auth, or OpenAPI/config reconciliation questions arise.

Goal:
Implement a `NATIONAL_ADMIN`- and `AUDITOR`-only dashboard experience that reads durable server-side audit logs from the API and replaces any browser-local audit history approach.

Primary backend contract:

- GET /api/v1/audit-logs
- GET /api/v1/audit-logs/{id}

Security requirements:

- Treat audit logs as sensitive admin data.
- Requests must include:
  - Authorization: Bearer <jwt>
  - x-api-key when the deployment uses API key protection
- Only `NATIONAL_ADMIN` and `AUDITOR` users should be able to access the audit log UI and trigger audit log requests.
- `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`, `CITY_CONTENT_EDITOR`, `DISPATCHER`, `RESPONDER`, and `CITIZEN_REPORTER` must be blocked in both navigation and route-level guards.
- On 401, clear auth state and redirect to login.
- On 403, show a forbidden state and do not retry automatically.

Audit log response shape:

- id: string
- createdAt: string
- updatedAt: string
- timestamp: string
- action: string
- summary: string
- outcome: success | failure
- actorUserId: string | null
- actorEmail: string | null
- actorRole: string | null
- resource: string
- method: string
- path: string
- statusCode: number | null
- targetId: string | null
- ipAddress: string | null
- userAgent: string | null
- requestId: string | null
- metadata: object | null

Current backend behavior to reflect accurately:

- Audit logs are persisted on the server, not in localStorage.
- The backend automatically records key auth and mutation events.
- Logged operations include:
  - POST /api/v1/auth/login
  - POST /api/v1/auth/register
  - POST /api/v1/citizens/link-me
  - POST /api/v1/incidents/report
  - Create, update, and delete operations for:
    - citizens
    - agencies
    - responders
    - statuses
    - categories
    - severities
    - incidents
    - assignments
    - users
- The backend stores sanitized metadata only. Do not expect full request payloads.
- Metadata may include a message and validation error field summaries, but the UI must tolerate null metadata.

Functional requirements:

1. Access model

- Add an Audit Logs section to the admin dashboard navigation.
- Only render it for `NATIONAL_ADMIN` and `AUDITOR`.
- Add route protection so direct URL access is also blocked for lower roles.

2. Audit log list page

- Build a paginated table for GET /api/v1/audit-logs.
- Support these query params:
  - page
  - pageSize
  - search
  - sortBy
  - sortOrder
  - createdFrom
  - createdTo
  - updatedFrom
  - updatedTo
  - filters (JSON string)
- Default sort should be timestamp desc.
- Show these columns at minimum:
  - timestamp
  - outcome
  - action
  - resource
  - summary
  - actorEmail
  - actorRole
  - method
  - path
  - statusCode
  - requestId
- Make rows clickable to open a detail panel or dedicated detail view.

3. Audit log details view

- Fetch GET /api/v1/audit-logs/{id} when opening details.
- Display all returned fields clearly.
- Format timestamp, createdAt, and updatedAt as readable date-time values.
- Render metadata as a structured JSON inspector or key-value block.
- Handle null values gracefully.

4. Filtering and search UX

- Provide quick filters for:
  - outcome
  - action
  - resource
  - actorEmail
  - actorRole
  - method
  - statusCode
  - targetId
  - requestId
  - timestamp range
- Use backend-supported operators only.
- Supported filter operators currently available on audit logs:
  - equals
  - contains
  - in
  - gt
  - gte
  - lt
  - lte
  - between
- Respect field types:
  - timestamp, createdAt, updatedAt use datetime filtering
  - statusCode uses integer filtering
  - id and actorUserId use uuid filtering
  - most other fields are string filtering
- If the backend returns 422 for an invalid field or operator combination, surface the validation error in the filter UI instead of silently failing.

5. API client behavior

- Implement a typed audit log client with:
  - listAuditLogs(params, auth)
  - getAuditLogById(id, auth)
- Normalize responses into:
  - success: boolean
  - data
  - error: { status, message, details? }
- Centralize handling for 401, 403, 404, and 422.
- Preserve backend validation field paths exactly when mapping errors.

6. UX requirements

- Show loading states for initial load, page changes, filter changes, and detail fetches.
- Show empty state when no logs match current filters.
- Show retry action for list failures.
- Show a visible admin-only banner or badge indicating the data is sensitive.
- Use outcome badges with distinct success and failure styling.
- Make requestId copyable.
- Allow expanding/collapsing metadata for long payloads.

7. Security and privacy requirements

- Do not cache audit log responses in localStorage.
- Do not mirror audit log payloads into browser storage.
- If client-side caching is used, keep it in memory only and expire it quickly.
- Do not expose the API key in client-side code if the dashboard uses a server-side proxy or BFF.
- Prefer a server-side route handler or proxy in Next.js that injects x-api-key securely from server environment variables.

8. Suggested Next.js architecture

- Use a server-side API proxy for audit log requests:
  - /api/dashboard/audit-logs
  - /api/dashboard/audit-logs/[id]
- The proxy should:
  - read the user session token
  - forward Authorization header
  - inject x-api-key from server env if required
  - forward only the needed response body and status
- Keep the page UI separate from transport details:
  - lib/api/auditLogs.ts
  - app/api/dashboard/audit-logs/route.ts
  - app/api/dashboard/audit-logs/[id]/route.ts
  - app/dashboard/audit-logs/page.tsx
  - components/audit/AuditLogTable.tsx
  - components/audit/AuditLogFilters.tsx
  - components/audit/AuditLogDetailSheet.tsx

9. Recommended table behavior

- Default page size: 20
- Allow page size options: 10, 20, 50, 100
- Keep filters and pagination in the URL so audit views are shareable.
- Debounce free-text search.
- Reset page to 1 when filters or search change.

10. Acceptance criteria

- `NATIONAL_ADMIN` and `AUDITOR` users can list audit logs from the API.
- `NATIONAL_ADMIN` and `AUDITOR` users can open a single audit log detail view.
- `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`, `CITY_CONTENT_EDITOR`, `DISPATCHER`, `RESPONDER`, and `CITIZEN_REPORTER` cannot see or access the audit log section.
- Pagination, sorting, search, and filters all work against the backend list-query contract.
- 401, 403, 404, and 422 are handled consistently.
- No audit history relies on localStorage.
- Sensitive headers and API keys stay server-side.

Output format requested from AI:

1. Proposed file structure
2. Types for audit log entities and list-query params
3. API client and Next.js proxy route code
4. Audit log page container code
5. Reusable filter, table, and detail components
6. Role-gating and route-guard examples
7. Final integration checklist
