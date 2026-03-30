# Dashboard AI Prompt: Role And Capability Migration

Use this prompt when updating the dashboard to match the latest backend auth and authorization model.

## Prompt

You are updating the Xypes dashboard to match the current backend API and OpenAPI contract.

Use these backend facts as source of truth:

- The API now uses these roles only:
  - `SYSTEM_ADMIN`
  - `DEPARTMENT_MANAGER`
  - `SUPERVISOR`
  - `DISPATCHER`
  - `RESPONDER`
  - `CITIZEN_REPORTER`
  - `AUDITOR`
- Legacy labels map as follows:
  - `SUPER_ADMIN` -> `SYSTEM_ADMIN`
  - `ADMIN` -> `DEPARTMENT_MANAGER`
  - `VIEWER` -> `CITIZEN_REPORTER`
- `POST /auth/register` creates a `CITIZEN_REPORTER` account by default.
- `GET /users/capabilities` is now available to any authenticated user and returns:
  - `role`
  - `label`
  - `permissions`
  - `scope`
  - `canUpdateUser`
  - `canDeleteUser`
- `GET /audit-logs` and `GET /audit-logs/{id}` are allowed only for `SYSTEM_ADMIN` and `AUDITOR`.
- `GET /admin/users` is allowed for `SYSTEM_ADMIN` and `DEPARTMENT_MANAGER`.
- `POST /citizens/link-me` and `POST /incidents/report` are citizen self-service flows for `CITIZEN_REPORTER` users.
- Protected `/api/v1/*` routes still require `x-api-key` in addition to JWT unless explicitly public.
- A `401` usually means missing/invalid API key or auth token. A `403` means authenticated but lacking the required role.

Update the dashboard with these requirements:

1. Replace all old role names in UI labels, guards, and feature flags.
2. Stop treating `VIEWER` as a valid backend role; use `CITIZEN_REPORTER` instead.
3. Stop treating `/users/capabilities` as an admin-only endpoint.
4. Use the returned `permissions` and `scope` fields to drive navigation, page access, empty states, and CTA visibility.
5. Restrict audit log pages, audit exports, and audit navigation to `SYSTEM_ADMIN` and `AUDITOR`.
6. Restrict admin user-management screens to `SYSTEM_ADMIN` and `DEPARTMENT_MANAGER`.
7. Route citizen self-service users toward incident reporting and citizen profile linking flows.
8. Ensure API calls to protected endpoints include `x-api-key` and bearer token together.
9. Update user-facing copy so role names are human-readable:
   - System Admin
   - Department Manager
   - Supervisor
   - Dispatcher
   - Responder
   - Citizen Reporter
   - Auditor
10. Preserve backward compatibility in display code where persisted legacy role labels might still appear in cached frontend state, but normalize them before rendering or checking permissions.

Implementation expectations:

- Prefer a single frontend role-normalization utility.
- Prefer a single capability-to-navigation mapping table.
- Show explicit unauthorized states for `403` responses.
- Show explicit authentication/configuration recovery states for `401` responses, especially when `x-api-key` is missing.
- Avoid hardcoding old role names anywhere in new code.

Deliverables:

1. Update frontend role constants/types.
2. Update auth/session parsing and capability parsing.
3. Update route guards and menu visibility.
4. Update audit log and user-management access rules.
5. Update labels, badges, and empty-state copy.
6. Note any remaining backend assumptions that the dashboard still depends on.