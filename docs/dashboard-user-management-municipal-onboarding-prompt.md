# Dashboard Prompt: User Management And Municipal Onboarding

Use this prompt when implementing or updating dashboard flows for LGU user management, municipal onboarding, and jurisdiction-aware staff creation.

Use `docs/dashboard-current-feature-prompt.md` as the governing prompt when feature-gating or OpenAPI/config reconciliation questions arise.

Use `docs/dashboard-role-capability-update-prompt.md` as the governing prompt when role normalization, capability handling, or dashboard RBAC behavior is ambiguous.

## Primary Instruction

Read the backend OpenAPI contract first and treat it as the source of truth before changing dashboard forms, route guards, role gates, or user-management behavior.

Required references:

- `src/docs/openapi.ts`
- `GET /api/v1/openapi.json` when the API is running locally
- `src/types/auth.ts`
- `src/controllers/usersController.ts`
- `src/validators/bodyValidators.ts`
- `src/__tests__/users.test.ts`
- `README.md` sections covering JWT roles, seeded users, and the access matrix

Do not guess user-management semantics from older frontend code.

Do not rebuild the dashboard around the old `SYSTEM_ADMIN` / `DEPARTMENT_MANAGER` / `SUPERVISOR` model.

## Current Backend Role Model

The canonical backend roles are:

- `NATIONAL_ADMIN`
- `REGIONAL_DIRECTOR`
- `PROVINCIAL_ADMIN`
- `CITY_ADMIN`
- `CITY_CONTENT_EDITOR`
- `DISPATCHER`
- `RESPONDER`
- `CITIZEN_REPORTER`
- `AUDITOR`

Legacy aliases still normalize on the backend:

- `SUPER_ADMIN` and `SYSTEM_ADMIN` -> `NATIONAL_ADMIN`
- `DEPARTMENT_MANAGER` and `ADMIN` -> `CITY_ADMIN`
- `SUPERVISOR` -> `PROVINCIAL_ADMIN`
- `VIEWER` -> `CITIZEN_REPORTER`

Do not use the legacy labels as the frontend source of truth.

## User Management Surface To Match

The dashboard user-management experience must match these backend routes:

- `GET /api/v1/users/capabilities`
- `GET /api/v1/users`
- `GET /api/v1/users/{id}`
- `POST /api/v1/users`
- `PATCH /api/v1/users/{id}`
- `DELETE /api/v1/users/{id}`
- `POST /api/v1/users/{id}/restore` when archive mode is active

Related national-only admin routes also exist:

- `GET /api/v1/admin/users`
- `GET /api/v1/admin/users/mfa-compliance`
- `GET /api/v1/admin/users/access-review`

Do not treat `/admin/users` as the primary municipal onboarding surface.

For day-to-day onboarding and scoped user management, prefer `/api/v1/users` and the capability-driven LGU admin workflow.

## Current Access Model

The backend allows these roles to access `/api/v1/users` management routes:

- `NATIONAL_ADMIN`
- `REGIONAL_DIRECTOR`
- `PROVINCIAL_ADMIN`
- `CITY_ADMIN`

But access is not global for every one of those roles.

The backend enforces both:

- role eligibility
- jurisdiction scope

That means:

- `NATIONAL_ADMIN` is the broadest management role
- `REGIONAL_DIRECTOR` is limited to managed users within the same region
- `PROVINCIAL_ADMIN` is limited to managed users within the same province
- `CITY_ADMIN` is limited to managed users within the same city or municipality
- `CITY_CONTENT_EDITOR` is not a management role even though it is a privileged operational role for other features
- `AUDITOR` is not part of the user-management hierarchy

The frontend must not replace backend enforcement, but it should avoid presenting impossible actions when the backend contract already exposes enough information to suppress them.

## Capability Contract

`GET /api/v1/users/capabilities` is available to any authenticated user.

It returns:

- `role`
- `label`
- `permissions`
- `scope`
- `canUpdateUser`
- `canDeleteUser`

Use those fields as the dashboard’s capability source when deciding whether to:

- show user-management navigation
- show create user actions
- enable edit actions
- enable archive or restore actions
- tailor onboarding copy to city, province, or region scope

Treat `canUpdateUser` and `canDeleteUser` as convenience flags only.

Do not assume they eliminate the need for target-user eligibility checks.

## Create And Update Payload Contract

The current create user payload includes:

- `name`
- `email`
- `password`
- `role`
- `jurisdictionType` optional
- `jurisdictionId` optional

The current update user payload supports partial updates for:

- `name`
- `email`
- `password`
- `role`
- `jurisdictionType`
- `jurisdictionId`

Validation rules the dashboard must respect:

- `jurisdictionType` must be one of `region`, `province`, `city`, `municipality`, or `barangay`
- `jurisdictionId` must be a UUID v4
- `jurisdictionType` and `jurisdictionId` must be provided together
- update requests must send at least one updatable field

Do not send only one of the jurisdiction fields.

## Municipal Onboarding Requirements

Municipal onboarding in the dashboard should be modeled as jurisdiction-aware user creation, not as an ad hoc special case.

For example, onboarding a municipal team for Roxas, Isabela should use:

- a user role such as `CITY_ADMIN`, `CITY_CONTENT_EDITOR`, `DISPATCHER`, or `RESPONDER` depending on the staff function
- a municipality-backed jurisdiction assignment via `jurisdictionType` plus `jurisdictionId`

The backend normalizes `municipality` into the city or municipality jurisdiction layer, so the frontend should present city and municipality choices through the canonical locality selector UI without inventing a separate management model.

When a city or province admin creates local staff, default the selector flow to the operator’s own allowed locality scope instead of presenting the full national locality tree.

## Geography Selection Guidance

Use canonical geography resources for locality selection rather than freeform locality strings.

The backend mounts geography resources for:

- `/api/v1/regions`
- `/api/v1/provinces`
- `/api/v1/cities-municipalities`
- `/api/v1/barangays`

Use those resources, or the active OpenAPI document for the running backend, to drive cascading selectors for jurisdiction assignment.

Do not hardcode Tuguegarao, Roxas, Isabela, or any other locality as frontend constants outside seed or demo fixtures.

## Required Dashboard UX

Implement or update these behaviors:

1. User-management entry points
   - Show the user-management section only when the current user is allowed to manage users in the current scope.
   - Distinguish between the scoped `/users` workflow and the national-only `/admin/users` review screens.

2. Create-user flow
   - Support jurisdiction-aware staff creation from the dashboard.
   - Include role selection plus jurisdiction selection.
   - Hide or disable create actions that are outside the actor’s management scope.

3. Edit-user flow
   - Support role retargeting and jurisdiction reassignment only when the current actor is allowed to manage that target.
   - Respect the backend requirement that jurisdiction changes always send both `jurisdictionType` and `jurisdictionId` together.

4. List and detail views
   - Render `jurisdictionType` and `jurisdictionId` in a way that helps operators understand user assignment.
   - Support list filtering by `role`, `jurisdictionType`, and `jurisdictionId` where the backend allows it.
   - Preserve backend-scoped results instead of trying to widen them on the client.

5. Archive and restore actions
   - Treat archive and restore as capability-sensitive lifecycle actions.
   - Only surface restore when archive mode is active and the endpoint is present in active OpenAPI.

## UX Expectations For LGU Operations

Build this as an LGU operations workflow, not as a generic enterprise user-admin shell.

- Use locality-first language where it helps operators understand who they are onboarding.
- Make it clear whether the operator is creating a city, municipal, provincial, or regional user.
- Prefer explicit jurisdiction selectors and readable locality summaries over raw UUID-centric forms.
- Make scope boundaries visible so a city admin understands why they cannot assign staff outside the municipality.

## Error Handling Expectations

Preserve backend semantics:

- `401` means auth or session failure
- `403` means the actor is authenticated but not allowed for that route or target scope
- `404` means the target user or archived user does not exist in the current scope
- `409` means conflict
- `422` means validation failed

For `422` responses, map field errors back to:

- `role`
- `jurisdictionType`
- `jurisdictionId`
- any other returned field path

Do not flatten paired-jurisdiction validation into a generic toast when the form can display it inline.

## Acceptance Checklist

- User-management navigation appears only for operators who can actually manage users.
- Scoped LGU admin roles use `/api/v1/users` correctly instead of being forced through a national-only admin screen.
- Create and edit flows send `jurisdictionType` and `jurisdictionId` together.
- Municipal onboarding can create locality-bound staff accounts such as municipal admins, content editors, dispatchers, and responders.
- List and detail views reflect backend-scoped results and jurisdiction data.
- Restore actions are shown only when archive mode is active.
- Legacy role labels are normalized before capability and permission checks.
- Capability-driven UI behavior comes from `/api/v1/users/capabilities`, not from guessed frontend hierarchies.

## Output Format Requested From AI

1. Proposed file structure or touched dashboard modules
2. Role and capability handling strategy
3. User list and detail rendering approach
4. Create and edit form design for jurisdiction-aware onboarding
5. Geography selector and locality-loading strategy
6. Archive and restore gating approach
7. Final integration and verification checklist
