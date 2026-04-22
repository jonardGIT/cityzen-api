# Dashboard Prompt: User Management City-Scope Alignment

Use this prompt when updating the dashboard user-management module to match the current backend LGU rollout.

Use these references first:

- `docs/dashboard-current-feature-prompt.md`
- `docs/dashboard-role-capability-update-prompt.md`
- `src/docs/openapi.ts`
- `GET /api/v1/openapi.json` from the running backend when available

## Goal

Bring the dashboard user-management UI into alignment with the current backend contract.

The backend now allows LGU-scoped user management for `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, and `CITY_ADMIN`, but the current rollout only supports city-level local jurisdiction bindings.

## Backend Facts You Must Honor

- `GET /api/v1/users/capabilities` is available to any authenticated user.
- `GET /api/v1/users`, `GET /api/v1/users/:id`, `POST /api/v1/users`, `PATCH /api/v1/users/:id`, `DELETE /api/v1/users/:id`, and `POST /api/v1/users/:id/restore` are available to `NATIONAL_ADMIN`, `REGIONAL_DIRECTOR`, `PROVINCIAL_ADMIN`, and `CITY_ADMIN`.
- `canUpdateUser` and `canDeleteUser` are convenience flags, not a complete substitute for backend authorization.
- Current valid user `jurisdictionType` input values are only:
  - `region`
  - `province`
  - `city`
  - `barangay`
- Do not send `jurisdictionType = municipality`.
- When sending `jurisdictionType = city`, the `jurisdictionId` must reference a real `CITY` LGU record.
- The backend still uses the historical `city` scope and `:city` permission suffix for capability metadata. Treat that as compatibility naming only.
- User-management navigation and route access should fail closed until capability data has loaded and positively allows the view.

## Current Dashboard Gaps To Fix

1. The production user create and edit flow no longer sends `jurisdictionType` and `jurisdictionId` for scoped users.
2. User-management navigation and route guards are too optimistic when capability data is missing or empty.
3. The dashboard runtime role and manage-role helpers still reflect a legacy admin ladder instead of the current LGU-first contract.
4. The user-management proxy layer still prefers `/admin/users` before `/users` and may drift from the tested routing contract.
5. Existing dashboard tests still preserve municipality alias behavior that the backend no longer accepts.

## Required Dashboard Changes

### 1. Runtime role and capability alignment

- Replace legacy runtime role assumptions with the current LGU-first roles.
- Normalize legacy aliases once, then use the normalized role throughout UI logic.
- Keep capability parsing centered on backend `permissions`, `scope`, `canUpdateUser`, and `canDeleteUser`.

### 2. User-management access control

- Do not show user-management navigation, page content, or actions until `/users/capabilities` has loaded.
- Fail closed when capability data is absent, empty, or does not positively authorize the action.
- Keep row-level create, edit, delete, and restore controls gated by both capability flags and target-role eligibility.

### 3. Scoped user forms

- Restore `jurisdictionType` and `jurisdictionId` in the production user-management create and edit forms.
- Require those fields whenever the selected target role is region-, province-, or city-scoped.
- For local LGU binding, present only city-level options for the current rollout.
- Do not render municipality as a selectable outbound jurisdiction type.
- Use clear validation messaging when scoped roles are missing a jurisdiction selection.

### 4. Proxy and API client behavior

- Prefer `/users` before `/admin/users` in dashboard proxy routes.
- Preserve list query strings when forwarding list requests.
- Keep detail, create, update, delete, and restore routes aligned with the current backend routing contract.
- Preserve backend `400`, `401`, `403`, `409`, and `422` responses so the UI can show precise operator feedback.

### 5. Test updates

- Remove municipality alias expectations from production user-management tests.
- Add positive tests for city-scoped create and edit flows.
- Add negative tests that confirm the dashboard does not send municipality payloads.
- Add tests that verify fail-closed behavior when user-management capabilities are absent.
- Keep proxy tests aligned with `/users`-first forwarding.

## Suggested Deliverables

1. Updated user-management page, forms, and role helpers.
2. Updated user API client and proxy route handlers.
3. Updated tests for create, edit, routing, and authorization behavior.
4. A short note listing any remaining dashboard assumptions that still depend on future municipality support.

## Acceptance Criteria

- Scoped admins can create and edit users with valid region, province, city, and barangay bindings.
- The dashboard never sends `jurisdictionType = municipality`.
- City-scoped user management only uses real city-level LGU options.
- User-management navigation and route access fail closed until capability data positively allows them.
- Proxy routing prefers `/users` and preserves list query parameters.
- Dashboard tests no longer preserve municipality alias behavior.
