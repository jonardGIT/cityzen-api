# Dashboard AI Prompt: RBAC And Capability Contract Update

Use this prompt when updating the dashboard to match the latest backend role, permission, and access-control semantics.

## Prompt

You are updating the Xypes dashboard to match the current backend API, OpenAPI contract, and RBAC model.

Treat the backend as the source of truth. Do not infer permissions from old role labels or from a generic admin hierarchy.

### Backend Facts

- Valid backend roles are only:
  - `SYSTEM_ADMIN`
  - `DEPARTMENT_MANAGER`
  - `SUPERVISOR`
  - `DISPATCHER`
  - `RESPONDER`
  - `CITIZEN_REPORTER`
  - `AUDITOR`
- Legacy role normalization still exists on the backend:
  - `SUPER_ADMIN` -> `SYSTEM_ADMIN`
  - `ADMIN` -> `DEPARTMENT_MANAGER`
  - `VIEWER` -> `CITIZEN_REPORTER`
- `POST /auth/register` creates a `CITIZEN_REPORTER` account by default.
- `GET /users/capabilities` is available to any authenticated user and returns:
  - `role`
  - `label`
  - `permissions`
  - `scope`
  - `canUpdateUser`
  - `canDeleteUser`
- Permission keys are now scoped and domain-specific. Examples:
  - `citizen:link:self`
  - `incident:create:self`
  - `incident:read:assigned`
  - `incident:read:department`
  - `assignment:create:department`
  - `assignment:override:region`
  - `user:update:department`
  - `user:manage:global`
  - `audit:read:global`
  - `audit:export:global`
- The backend no longer uses a single universal role ladder for all decisions.
- User-management decisions are explicit:
  - `SYSTEM_ADMIN` can manage all user roles except `SYSTEM_ADMIN` and `AUDITOR`
  - `DEPARTMENT_MANAGER` can manage only:
    - `SUPERVISOR`
    - `DISPATCHER`
    - `RESPONDER`
    - `CITIZEN_REPORTER`
  - `AUDITOR` is not part of admin hierarchy and should not be treated as a subordinate admin role in UI logic.
- Route access rules relevant to the dashboard:
  - `GET /users/capabilities`: any authenticated user
  - `GET /users`, `POST /users`, `PATCH /users/:id`, `DELETE /users/:id`: `SYSTEM_ADMIN`, `DEPARTMENT_MANAGER`
  - `GET /admin/users`: `SYSTEM_ADMIN`, `DEPARTMENT_MANAGER`
  - `GET /audit-logs`, `GET /audit-logs/:id`: `SYSTEM_ADMIN`, `AUDITOR`
  - `GET /assignments`, `POST /assignments`, `PATCH /assignments/:id`, `DELETE /assignments/:id`:
    - `SYSTEM_ADMIN`
    - `DEPARTMENT_MANAGER`
    - `SUPERVISOR`
    - `DISPATCHER`
  - `POST /citizens/link-me` and `POST /incidents/report`: `CITIZEN_REPORTER`
- Protected `/api/v1/*` routes still require `x-api-key` in addition to JWT unless explicitly public.
- Error semantics:
  - `401` means missing or invalid API key, token, or revoked session
  - `403` means authenticated but not allowed for the route or action

### Dashboard Requirements

1. Replace all old role names in UI code, labels, route guards, and feature flags.
2. Stop treating `VIEWER` as a valid backend role. Normalize it to `CITIZEN_REPORTER` before rendering or checking access.
3. Stop treating `/users/capabilities` as admin-only.
4. Use returned `permissions`, `scope`, `canUpdateUser`, and `canDeleteUser` to drive UI behavior.
5. Do not depend on old broad permission keys like `incident:read`, `incident:assign`, or `user:manage` without scope suffixes.
6. Do not assume a descending global admin hierarchy in the frontend.
7. Do not infer that `AUDITOR` is below `DEPARTMENT_MANAGER` or below operational roles.
8. Restrict audit log pages, audit exports, and audit navigation to `SYSTEM_ADMIN` and `AUDITOR`.
9. Restrict user-management screens to `SYSTEM_ADMIN` and `DEPARTMENT_MANAGER`.
10. Within user-management screens, disable or hide create/edit/delete actions when the target role is not manageable according to backend rules.
11. Route `CITIZEN_REPORTER` users toward citizen profile linking and incident reporting flows.
12. Ensure protected API calls send both `x-api-key` and `Authorization: Bearer <token>` where required.

### Human-Readable Labels

Use these labels in the dashboard:

- System Admin
- Department Manager
- Supervisor
- Dispatcher
- Responder
- Citizen Reporter
- Auditor

### Frontend Implementation Guidance

- Create one frontend `normalizeRole()` utility that handles legacy labels.
- Create one capability parser that trusts backend `permissions` and `scope`.
- Create one `canManageRole(actorRole, targetRole)` utility in the dashboard that mirrors backend semantics exactly.
- Prefer route and navigation checks based on permission bundles and explicit role sets, not string comparisons scattered across components.
- Show explicit unauthorized states for `403` responses.
- Show explicit authentication/configuration recovery states for `401` responses, especially when API key headers are missing.

### Deliverables

1. Update frontend role constants and types.
2. Update auth/session parsing and role normalization.
3. Update capability parsing for scoped permission keys.
4. Update navigation visibility and route guards.
5. Update user-management UI so target-role actions respect backend `canManageRole` semantics.
6. Update audit log and assignment access rules.
7. Update labels, badges, empty states, and error handling for `401` vs `403`.
8. Document any remaining backend assumptions the dashboard still depends on.