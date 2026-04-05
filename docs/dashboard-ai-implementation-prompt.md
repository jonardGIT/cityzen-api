Build a production-ready admin dashboard module using the API config files in this repository.

Primary input files:

- docs/dashboard-crud-config.json (resource-based structure)
- docs/dashboard-crud-config.flat.json (endpoint-row structure)

Use docs/dashboard-crud-config.flat.json as the main source of truth for route generation and permission mapping.

Goal:
Implement a dynamic CRUD dashboard that automatically renders pages, tables, and forms for all resources in the config.

Functional requirements:

1. Authentication

- Use Bearer token auth with Authorization header.
- Add login flow using POST /api/v1/auth/login.
- Add refresh flow using POST /api/v1/auth/refresh.
- Add current-user bootstrap using GET /api/v1/auth/me.
- Call POST /api/v1/auth/logout on explicit sign-out so the backend revokes the current auth session.
- If login returns `401` with `mfaRequired: true`, prompt for a TOTP code and retry POST /api/v1/auth/login with `mfaCode`.
- Persist the token securely in app state or a server-managed session. Avoid long-lived localStorage storage for sensitive admin sessions when possible.
- Attach token to all authRequired endpoints.
- Do not expose deployment API keys in client-side code. For non-auth API-key-protected routes, prefer a Next.js server-side proxy or BFF that injects `x-api-key` from server environment variables.

2. Authorization and UI gating

- Assume current user role is available from auth state (`SYSTEM_ADMIN`, `DEPARTMENT_MANAGER`, `SUPERVISOR`, `DISPATCHER`, `RESPONDER`, `CITIZEN_REPORTER`, `AUDITOR`).
- Hide or disable action buttons (Create, Edit, Delete) if current role is not included in allowedRoles.
- Treat `authRequired` in the config files as authoritative; the current dashboard resource routes are authenticated.
- Add a reusable hasPermission(endpoint, role) helper.
- For incident list/get when role is `CITIZEN_REPORTER`, show only the logged-in user's own incidents.
- Citizens list/get/create/update/delete are admin-only; keep `citizens/link-me` as a dedicated citizen self-service action rather than a normal admin CRUD form.

3. Dynamic resource pages

- Auto-generate one page per resource from config:
  - citizens, agencies, responders, statuses, categories, severities, incidents, assignments, users
- For each resource page:
  - Table/List view (list endpoint)
  - Details drawer/modal (get endpoint)
  - Create form (create endpoint)
  - Link profile form for citizens (linkMe endpoint)
  - Report form for incidents (report endpoint)
  - Update form (update endpoint)
  - Delete action with confirmation modal (delete endpoint)
- Use endpoint.operation values: list, get, create, linkMe, report, update, delete.

4. Generic API client

- Build a typed API layer that accepts method, fullPath, body, params, token.
- Replace {id} placeholders safely.
- Centralize error handling for 401, 403, 404, 409, 422.
- Also handle 429 consistently for rate-limited responses.
- Return normalized result shape:
  - success: boolean
  - data: unknown
  - error: { status, message, details? }

5. Form handling

- Build schema-driven forms with resource-specific field configs.
- Start with these default field mappings:
  - users: name, email, password, role
  - citizens: name, contactInfo, preferredChannel
  - agencies: name
  - responders: name, agencyId, role, contactInfo
  - statuses: name
  - categories: name, subCategory
  - severities: level, definition
  - incidents: description, statusId, citizenId, categoryId, severityId, latitude, longitude, addressLine1, addressLine2, barangay, districtName, cityName, provinceName, regionName, postalCode, landmark
  - assignments: incidentId, responderId, responseStart, responseEnd, outcome, notes
- Support partial payload on update.
- For citizens linkMe operation, use payload fields:
  - name, preferredChannel
  - Do not send contactInfo for linkMe; backend binds it to authenticated user email.
- For incidents report operation, use payload fields:
  - description, dateReported, categoryId, severityId, latitude, longitude, addressLine1, addressLine2, barangay, districtName, cityName, provinceName, regionName, postalCode, landmark
  - Do not send citizenId for report; backend infers it from authenticated user email.
  - Use the dedicated incident media upload endpoint for attachments instead of embedding `mediaUrl` in the incident payload.

6. UX requirements

- Global loading indicators for list and submit actions.
- Toast notifications for success and failure.
- Empty states for no records.
- Retry action for failed list fetch.
- Confirmation modal before delete.

7. Navigation

- Auto-generate sidebar menu from distinct resource names in config.
- Use resource.label for display text.
- Routing format suggestion:
  - /dashboard/:resource

8. Data refresh strategy

- After create/update/delete, refetch list endpoint for that resource.
- Keep local optimistic updates optional, but prioritize correctness.

9. Error behavior

- 401: redirect to login and clear invalid token.
- 403: show not authorized banner.
- 409: show conflict message (e.g., duplicate or foreign key conflict).
- 422: show validation errors near fields when possible.
- 429: show a retry message and honor Retry-After when present.

11. List query contract integration

- For list endpoints, support query params:
  - page, pageSize
  - search
  - sortBy, sortOrder
  - createdFrom, createdTo, updatedFrom, updatedTo
  - filters (JSON string)
- Use filters format:
  - [{ field, operator, value }]
- Supported operators currently exposed by backend:
  - equals, contains, in, gt, gte, lt, lte, between
- Do not assume every field supports every operator. Respect backend 422 validation.

Backend follow-up contract (when new fields/operators are requested):

- Add the field to backend whitelist for that resource as sortable and/or filterable before frontend uses it.
- Preserve backend 422 error field paths exactly, because UI maps them to controls:
  - filters[i].field
  - filters[i].operator
  - filters[i].value
  - sortBy
  - sortOrder
- If a new operator is added in backend, extend frontend operator map in CrudTable.tsx to expose it.

Incident location contract:

- The backend now uses incident-owned coordinate/address snapshot fields.
- `locationId` is removed from incident create/update/report payloads.
- The dashboard/mobile client must send the location snapshot directly.
- Reverse geocoding, if used, is currently a client responsibility; backend persists the provided snapshot.

Mobile citizen flow requirements:

1. Citizen signs up via /api/v1/auth/register (`CITIZEN_REPORTER` role by default in the current role model).
2. App calls /api/v1/citizens/link-me to create/update citizen profile linked to auth email.
3. Citizen creates incident via /api/v1/incidents/report.
4. Citizen views own incidents via /api/v1/incidents and /api/v1/incidents/{id} only.

Security alignment notes:

- `/api/v1/auth/register`, `/api/v1/auth/login`, and `/api/v1/auth/refresh` are public auth bootstrap/renewal routes.
- `/api/v1/auth/mfa/setup`, `/api/v1/auth/mfa/enable`, and `/api/v1/auth/mfa/disable` require a privileged JWT. Use the current backend role metadata and dashboard config rather than legacy role names.
- `/api/v1/auth/me` and `/api/v1/auth/logout` require JWT bearer auth.
- Login/register/refresh responses now include `sessionId`, `expiresAt`, `refreshExpiresAt`, and a rotated `refreshToken`; use the metadata for session handling, not as a replacement for the bearer token.
- Every successful refresh invalidates the previous refresh token, so the dashboard must replace stored refresh state atomically.
- Privileged accounts may be challenged for TOTP MFA at login; the dashboard should render a second-step MFA form instead of treating the first `401` as a generic failure.
- Password or role changes revoke existing backend sessions, so handle a follow-up `401` by clearing client auth state and forcing a fresh login.
- Most non-auth API routes also require `x-api-key` when the backend is configured with API keys.
- Audit logs are admin-only and are handled separately by `docs/dashboard-audit-log-implementation-prompt.md`.

5. Deliverables

- Reusable hooks/components for:
  - useCrudResource(resourceName)
  - CrudTable
  - CrudFormModal
  - DeleteConfirmModal
- Config parser utility for flat config.
- Permission utility based on allowedRoles.
- At least one end-to-end implemented resource page used as reference for all others.

Technical constraints:

- Keep implementation generic and config-driven.
- Do not hardcode endpoints beyond auth bootstrap paths.
- Prefer clean architecture: API layer, permission layer, UI layer.
- Keep code strongly typed.

Acceptance criteria:

- All resources in docs/dashboard-crud-config.flat.json render in dashboard navigation.
- Allowed actions vary correctly by role.
- CRUD operations execute against the API paths from config.
- Unauthorized actions are not executable from UI.
- Errors and loading states are handled consistently.

Output format requested from AI:

1. Proposed file structure
2. Core utilities and types
3. Main dashboard page/container code
4. Reusable CRUD components
5. Example role-gating logic
6. Final integration checklist
