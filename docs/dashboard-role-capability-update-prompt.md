# Dashboard AI Prompt: RBAC And Capability Contract Update

Use this prompt when updating the dashboard to match the latest backend role, permission, and access-control semantics.

## Prompt

You are updating the Xypes dashboard to match the current backend API, OpenAPI contract, and RBAC model.

Treat the backend as the source of truth. Do not infer permissions from old role labels or from a generic admin hierarchy.

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
  - `SUPER_ADMIN` and `SYSTEM_ADMIN` -> `NATIONAL_ADMIN`
  - `DEPARTMENT_MANAGER` and `ADMIN` -> `CITY_ADMIN`
  - `SUPERVISOR` -> `PROVINCIAL_ADMIN`
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
  - `incident:read:city`
  - `incident:read:province`
  - `incident:read:region`
  - `assignment:create:city`
  - `user:update:city`
  - `user:manage:province`
  - `user:manage:region`
  - `user:manage:global`
  - `audit:read:global`
  - `audit:export:global`
- The backend no longer uses a single universal role ladder for all decisions.
- User-management decisions are explicit:
  - `GET /users/capabilities` is not admin-only; use it for any authenticated user.
  - `GET /users`, `GET /users/:id`, `POST /users`, `PATCH /users/:id`, `DELETE /users/:id`, and `POST /users/:id/restore` are available to `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, and `CITY_ADMIN`.
  - Reads and lifecycle actions are constrained by jurisdiction scope in addition to role.
  - `canUpdateUser` and `canDeleteUser` reflect scoped lifecycle ability for LGU admin roles and should be treated as convenience flags, not as a substitute for backend enforcement.
  - The current rollout does not accept `jurisdictionType = municipality` on user create or update requests.
  - When the dashboard sends `jurisdictionType = city`, the `jurisdictionId` must reference a real `CITY` LGU record.
  - `AUDITOR` is not part of the admin management ladder and should not be treated as a subordinate operational role in UI logic.
- Route access rules relevant to the dashboard:
  - `GET /users/capabilities`: any authenticated user
  - `GET /users`, `GET /users/:id`, `POST /users`, `PATCH /users/:id`, `DELETE /users/:id`, `POST /users/:id/restore`: `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`
  - `GET /admin/users`, `GET /admin/users/mfa-compliance`, `GET /admin/users/access-review`: `NATIONAL_ADMIN`
  - `GET /admin/security/data-governance`: `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, `CITY_ADMIN`, `AUDITOR`
  - `GET /audit-logs`, `GET /audit-logs/:id`: `NATIONAL_ADMIN`, `AUDITOR`
  - `GET /assignments`, `POST /assignments`, `PATCH /assignments/:id`, `DELETE /assignments/:id`:
    - `NATIONAL_ADMIN`
    - `REGIONAL_DIRECTOR`
    - `PROVINCIAL_ADMIN`
    - `CITY_ADMIN`
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
7. Do not infer that `AUDITOR` is below any LGU admin role or below operational roles.
8. Restrict audit log pages, audit exports, and audit navigation to `NATIONAL_ADMIN` and `AUDITOR`.
9. Restrict `/admin/users`, MFA compliance, and privileged access review screens to `NATIONAL_ADMIN`.
10. Treat `/users` management screens as available to LGU admin roles, but gate create/edit/delete/restore actions by both capability flags and jurisdiction-aware target eligibility.
11. Fail closed on user-management navigation and route guards until `/users/capabilities` has loaded and positively allows the view.
12. Remove municipality alias handling from runtime user-management forms, summaries, and tests for the current rollout.
13. Prefer `/users` proxy routes before `/admin/users` and preserve list query strings when forwarding user-management requests.
14. Route `CITIZEN_REPORTER` users toward citizen profile linking and incident reporting flows.
15. Ensure protected API calls send both `x-api-key` and `Authorization: Bearer <token>` where required.

### Human-Readable Labels

Use these labels in the dashboard:

- National Admin
- Regional Director
- Provincial Admin
- City/Municipal Admin
- City Content Editor
- Dispatcher
- Responder
- Citizen Reporter
- Auditor

### Frontend Implementation Guidance

- Create one frontend `normalizeRole()` utility that handles legacy labels.
- Create one capability parser that trusts backend `permissions` and `scope`.
- Create one helper that combines backend role normalization with jurisdiction-aware user-management checks instead of assuming a flat global hierarchy.
- Prefer route and navigation checks based on permission bundles and explicit role sets, not string comparisons scattered across components.
- Show explicit unauthorized states for `403` responses.
- Show explicit authentication/configuration recovery states for `401` responses, especially when API key headers are missing.

### Deliverables

1. Update frontend role constants and types.
2. Update auth/session parsing and role normalization.
3. Update capability parsing for scoped permission keys.
4. Update navigation visibility and route guards.
5. Update user-management UI so target-role actions respect backend capability flags plus jurisdiction-scoped user-management semantics.
6. Restore city-only jurisdiction fields for scoped user create and edit flows.
7. Update the user-management proxy layer so `/users` requests, detail fetches, and mutations line up with the current backend routing contract.
8. Update audit log and assignment access rules.
9. Update labels, badges, empty states, and error handling for `401` vs `403`.
10. Document any remaining backend assumptions the dashboard still depends on.
