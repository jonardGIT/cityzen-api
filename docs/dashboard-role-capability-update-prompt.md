# Dashboard AI Prompt: RBAC And Capability Contract Update

Use this prompt when updating the dashboard to match the latest backend role, permission, and access-control semantics.

## Prompt

You are updating the Xypes dashboard to match the current backend API, OpenAPI contract, and RBAC model.

Treat the backend as the source of truth. Build for the current LGU-first 9-role model, not the retired flat admin hierarchy.

### Backend Facts

- Valid backend roles are only:
  - `NATIONAL_ADMIN`
  - `REGIONAL_DIRECTOR`
  - `PROVINCIAL_ADMIN`
  - `CITY_ADMIN`
  - `CITY_CONTENT_EDITOR`
  - `DISPATCHER`
  - `RESPONDER`
  - `CITIZEN_REPORTER`
  - `AUDITOR`
- Legacy role normalization still exists on the backend:
  - `SUPER_ADMIN` -> `NATIONAL_ADMIN`
  - `SYSTEM_ADMIN` -> `NATIONAL_ADMIN`
  - `ADMIN` -> `CITY_ADMIN`
  - `DEPARTMENT_MANAGER` -> `CITY_ADMIN`
  - `SUPERVISOR` -> `PROVINCIAL_ADMIN`
  - `VIEWER` -> `CITIZEN_REPORTER`
- Legacy aliases are compatibility-only input handling, not first-class roles for new UI, docs, or policy. Do not surface `SYSTEM_ADMIN` or `SUPER_ADMIN` as distinct selectable roles.
- For the Tuguegarao-first pilot, do not widen UX or navigation around `NATIONAL_ADMIN` unless the deployment has explicitly enabled national governance beyond the city-first live roster.
- `POST /auth/register` creates a `CITIZEN_REPORTER` account by default.
- `GET /users/capabilities` is available to any authenticated user and returns:
  - `role`
  - `label`
  - `permissions`
  - `scope`
  - `canCreateUser`
  - `canUpdateUser`
  - `canDeleteUser`
  - `canManageUsers`
- Permission keys are scoped and domain-specific. Examples:
  - `user:manage:global`
  - `user:create:city`
  - `incident:assign:province`
  - `assignment:update:city`
  - `incident:read:assigned`
  - `citizen:link:self`
  - `audit:read:global`
  - `mobile_content:publish:city`
- User-management decisions are scope-aware, not a single flat ladder:
  - `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, and `CITY_ADMIN` are the user-management roles.
  - Higher-scope admins can manage only backend-allowed roles inside their jurisdiction.
  - `CITY_CONTENT_EDITOR` is not a user-management role.
  - `AUDITOR` is not part of the admin hierarchy and should never be treated as a subordinate operational role in UI logic.
  - `NATIONAL_ADMIN` currently carries both jurisdiction-governance and legacy top-admin semantics; future design work should avoid extending that overload unless the backend role model is intentionally revised.
- Route access rules relevant to the dashboard:
  - `GET /users/capabilities`: any authenticated user
  - `GET /users`, `POST /users`, `PATCH /users/:id`, `DELETE /users/:id`: `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`
  - `GET /admin/users`: `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`
  - `GET /audit-logs`, `GET /audit-logs/:id`: `NATIONAL_ADMIN`, `AUDITOR`
  - `GET /assignments`, `POST /assignments`, `PATCH /assignments/:id`, `DELETE /assignments/:id`:
    - `NATIONAL_ADMIN`
    - `REGIONAL_DIRECTOR`
    - `PROVINCIAL_ADMIN`
    - `CITY_ADMIN`
    - `DISPATCHER`
  - `GET /incidents`, `GET /incidents/:id`, `GET /incidents/:id/timeline`:
    - `CITIZEN_REPORTER`
    - `CITY_ADMIN`
    - `DISPATCHER`
    - `RESPONDER`
    - `REGIONAL_DIRECTOR`
    - `PROVINCIAL_ADMIN`
    - `NATIONAL_ADMIN`
  - `POST /citizens/link-me` and `POST /incidents/report`: `CITIZEN_REPORTER`
  - `POST /auth/mfa/setup`, `POST /auth/mfa/enable`, `POST /auth/mfa/disable`:
    - `NATIONAL_ADMIN`
    - `REGIONAL_DIRECTOR`
    - `PROVINCIAL_ADMIN`
    - `CITY_ADMIN`
    - `CITY_CONTENT_EDITOR`
    - `DISPATCHER`
    - `AUDITOR`
- Protected `/api/v1/*` routes still require `x-api-key` in addition to JWT unless explicitly public.
- Error semantics:
  - `401` means missing or invalid API key, token, or revoked session
  - `403` means authenticated but not allowed for the route or action

### Dashboard Requirements

1. Replace old role names in UI code, labels, route guards, and feature flags.
2. Normalize all legacy aliases to the current role set before rendering or access checks.
3. Do not treat `/users/capabilities` as admin-only.
4. Drive UI behavior from returned `permissions`, `scope`, and convenience booleans instead of hard-coded assumptions.
5. Do not depend on old broad permission keys without scope suffixes.
6. Do not assume every admin is global. Respect LGU scope in navigation, management actions, and filters.
7. Do not infer that `AUDITOR` is below any operational admin role.
8. Restrict audit log pages, audit exports, and audit navigation to `NATIONAL_ADMIN` and `AUDITOR`.
9. Restrict user-management screens to `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, and `CITY_ADMIN`.
10. Within user-management screens, disable or hide create, edit, delete, and role-retarget actions when backend manageability rules do not allow them.
11. Route `CITIZEN_REPORTER` users toward citizen profile linking and incident reporting flows.
12. Route `CITY_CONTENT_EDITOR` users toward content-management surfaces only, not operational dispatch or user-management screens.
13. Ensure protected API calls send both `x-api-key` and `Authorization: Bearer <token>` where required.

### Human-Readable Labels

Use these labels in the dashboard:

- National Admin
- Regional Director
- Provincial Admin
- City Admin
- City Content Editor
- Dispatcher
- Responder
- Citizen Reporter
- Auditor

### Frontend Implementation Guidance

- Create one frontend `normalizeRole()` utility that handles legacy labels.
- Create one capability parser that trusts backend `permissions` and `scope`.
- Create one `canManageRole(actorRole, targetRole, scope)` utility in the dashboard that mirrors backend semantics as closely as possible, but always respect backend denials as authoritative.
- Prefer route and navigation checks based on permission bundles and explicit role sets, not string comparisons scattered across components.
- Show explicit unauthorized states for `403` responses.
- Show explicit authentication or configuration recovery states for `401` responses, especially when API key headers are missing.

### Deliverables

1. Update frontend role constants and types.
2. Update auth and session parsing plus legacy role normalization.
3. Update capability parsing for scoped permission keys and LGU scope labels.
4. Update navigation visibility and route guards.
5. Update user-management UI so target-role actions respect backend manageability and jurisdiction scope.
6. Update audit log, assignment, and incident access rules.
7. Update labels, badges, empty states, and error handling for `401` vs `403`.
8. Document any remaining backend assumptions the dashboard still depends on.
