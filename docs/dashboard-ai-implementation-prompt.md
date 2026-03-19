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
- Persist token securely in app state (and optionally local storage).
- Attach token to all authRequired endpoints.

2. Authorization and UI gating
- Assume current user role is available from auth state (SUPER_ADMIN, ADMIN, DISPATCHER, RESPONDER, VIEWER).
- Hide or disable action buttons (Create, Edit, Delete) if current role is not included in allowedRoles.
- List and Get views should remain visible where config allows unauthenticated access.
- Add a reusable hasPermission(endpoint, role) helper.
- For incident list/get when role is VIEWER, show only the logged-in user's own incidents.

3. Dynamic resource pages
- Auto-generate one page per resource from config:
  - citizens, responders, statuses, categories, severities, locations, incidents, assignments, users
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
- Return normalized result shape:
  - success: boolean
  - data: unknown
  - error: { status, message, details? }

5. Form handling
- Build schema-driven forms with resource-specific field configs.
- Start with these default field mappings:
  - users: name, email, password, role
  - citizens: name, contactInfo, preferredChannel
  - responders: name, agency, role, contactInfo
  - statuses: name
  - categories: name, subCategory
  - severities: level, definition
  - locations: district, city, province, region
  - incidents: description, mediaUrl, statusId, citizenId, locationId, categoryId, severityId
  - assignments: incidentId, responderId, responseStart, responseEnd, outcome, notes
- Support partial payload on update.
- For citizens linkMe operation, use payload fields:
  - name, preferredChannel
  - Do not send contactInfo for linkMe; backend binds it to authenticated user email.
- For incidents report operation, use payload fields:
  - description, mediaUrl, dateReported, statusId, locationId, categoryId, severityId
  - Do not send citizenId for report; backend infers it from authenticated user email.

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

Mobile citizen flow requirements:
1. Citizen signs up via /api/v1/auth/register (VIEWER role by default).
2. App calls /api/v1/citizens/link-me to create/update citizen profile linked to auth email.
3. Citizen creates incident via /api/v1/incidents/report.
4. Citizen views own incidents via /api/v1/incidents and /api/v1/incidents/{id} only.

10. Deliverables
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
