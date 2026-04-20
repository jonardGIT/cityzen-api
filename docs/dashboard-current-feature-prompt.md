# Dashboard Prompt: Implement Against The Current Feature Set

Use this prompt when asking an AI to build or update the dashboard against the backend as it exists now, not against older assumptions.

## Current Contract State

Assume the backend and dashboard contract are currently in this state:

- 64 dashboard config operations
- 77 OpenAPI operations
- 0 active config operations missing from OpenAPI
- 0 OpenAPI operations for configured resources missing from config
- the only intentional omission is `POST /incidents/media/upload` when the current feature-aware OpenAPI output does not expose media upload because that backend feature is disabled in the active selection

Treat that state as correct.

Do not "fix" the contract by inventing missing routes or removing feature-gated operations from the config.

## Source Of Truth

Use these files in this order:

1. `GET /api/v1/openapi.json` from the running backend for active operations
2. `src/docs/openapi.ts` for canonical schema and feature-aware omission rules
3. `docs/dashboard-crud-config.flat.json` for dashboard resource generation and permission mapping
4. `docs/dashboard-crud-config.json` for grouped resource semantics
5. `docs/dashboard-ai-implementation-prompt.md` for general dashboard implementation expectations

If OpenAPI and config differ, first check whether the config operation has a `featureGate`.

If it is feature-gated and the active feature is off, treat the omission as intentional.

## Primary Instruction

Implement the dashboard against the currently active backend feature set.

That means:

- use the config files for resource/page generation
- use OpenAPI for live request and response shapes
- use `featureGate` metadata to decide whether a configured operation should appear in the UI for the current deployment
- do not assume every configured operation is active in every environment

## Current Resource Surface

The dashboard resource model currently includes:

- citizens
- agencies
- responders
- statuses
- categories
- severities
- incidents
- assignments
- users

Core resource actions include combinations of:

- `list`
- `get`
- `create`
- `update`
- `delete`
- `restore`
- `linkMe`
- `report`
- `mediaAccess`
- `mediaUpload`
- `capabilities`

Do not add a `locations` resource.

The backend no longer uses the old separate `locations` CRUD surface for incident workflows.

## Current Roles

The role model is:

- `NATIONAL_ADMIN`
- `REGIONAL_DIRECTOR`
- `PROVINCIAL_ADMIN`
- `CITY_ADMIN`
- `CITY_CONTENT_EDITOR`
- `DISPATCHER`
- `RESPONDER`
- `CITIZEN_REPORTER`
- `AUDITOR`

Legacy labels are backward-compatibility aliases only, not the canonical contract.

Normalize them to the live backend roles before applying permission logic:

- `SUPER_ADMIN` and `SYSTEM_ADMIN` -> `NATIONAL_ADMIN`
- `DEPARTMENT_MANAGER` and `ADMIN` -> `CITY_ADMIN`
- `SUPERVISOR` -> `PROVINCIAL_ADMIN`
- `VIEWER` -> `CITIZEN_REPORTER`

Do not build new dashboard logic around the legacy labels.

## Current Jurisdiction Limitation

The backend still uses the historical `city` scope and permission suffix for the local LGU tier.

For the current rollout, the dashboard must treat local user-management jurisdiction as city-only:

- `jurisdictionType` input accepts only `region`, `province`, `city`, and `barangay`
- do not send `jurisdictionType = municipality`
- when sending `jurisdictionType = city`, the `jurisdictionId` must reference a real `CITY` row, not a `MUNICIPALITY` row
- treat municipality support as future work, not as a compatibility path the current UI should preserve

## Feature Gates You Must Respect

The config now exposes explicit feature gates.

Honor them.

### Incident media upload

- `incidents.mediaUpload`
- available only when `featureGate.feature = mediaStorage` and `requires = supabase-storage`

If the active OpenAPI spec does not include `POST /incidents/media/upload`, treat it as disabled for that environment.

### Restore operations

All `restore` actions are feature-gated.

- available only when `featureGate.feature = recordDeletion` and `requires = archive`

If archive mode is off, do not render restore actions and do not flag them as contract drift.

### Session inventory

Optional auth endpoints:

- `GET /auth/sessions`
- `DELETE /auth/sessions/{id}`

These are available only when:

- `featureGate.feature = tokenMode`
- `requires = app-jwt`

### MFA endpoints

Optional auth endpoints:

- `POST /auth/mfa/setup`
- `POST /auth/mfa/enable`
- `POST /auth/mfa/disable`

These are available only when:

- `featureGate.feature = mfaMode`
- `requiresAnyOf = [local-totp, supabase-totp]`

Do not assume MFA endpoints exist in environments where MFA is disabled.

## Required Dashboard Behavior

### 1. Resource generation

- generate pages and actions from `docs/dashboard-crud-config.flat.json`
- show only operations whose permissions and feature gates pass
- keep resource navigation driven by distinct configured resource names

### 2. Permission gating

- hide or disable actions when the user role is not in `allowedRoles`
- use `GET /users/capabilities` for any authenticated user when capability metadata is needed
- trust backend `permissions`, `scope`, `canUpdateUser`, and `canDeleteUser` over a frontend-only role ladder
- treat user-management actions as both role-gated and jurisdiction-scoped for `CITY_ADMIN`, `PROVINCIAL_ADMIN`, `REGIONAL_DIRECTOR`, and `NATIONAL_ADMIN`
- fail closed for user-management navigation, route access, and lifecycle actions until capability data has loaded and positively allows the action
- for `CITIZEN_REPORTER`, enforce self-service behavior on citizen linking and incident visibility
- do not expose admin-only actions to non-admin roles

### 3. Feature-aware operation gating

- if an endpoint has no `featureGate`, treat it as active when it is present in OpenAPI
- if an endpoint has a `featureGate`, check the active deployment feature state before surfacing it
- if the feature state is not directly available from the backend, infer availability from the active OpenAPI document

### 4. OpenAPI drift handling

- do not report feature-gated omissions as errors when the active feature is off
- only report drift when an operation is active for the current feature selection and still missing from OpenAPI

### 5. Incident workflow behavior

- incidents use inline location snapshot fields, not `locationId`
- citizen reporting uses `POST /incidents/report`
- citizen profile linking uses `POST /citizens/link-me`
- incident media upload, when enabled, uses `POST /incidents/media/upload`
- incident media access uses `GET /incidents/{id}/media/{mediaId}`

## Implementation Constraints

- prefer a config-driven dashboard over hardcoded per-resource pages
- do not add routes or forms that are not present in config or active OpenAPI
- do not hardcode old role names
- do not assume user management is national-only; LGU admin roles can read and manage users within backend-enforced scope
- do not preserve municipality alias behavior in create or edit forms for the current rollout
- do not assume all optional auth endpoints exist in every deployment
- preserve backend validation behavior, especially `401`, `403`, `409`, `422`, and `429`

## Acceptance Criteria

The dashboard work is correct only if all of the following are true:

- active configured operations map cleanly to active OpenAPI operations
- feature-gated operations are hidden or disabled when the feature is off
- resource pages reflect the current backend role model
- no legacy `locations` workflow is reintroduced
- incident media upload is treated as optional, not universally available
- restore actions are treated as archive-only
- session inventory is treated as app-JWT-only
- MFA management is treated as MFA-enabled-only

## Output Request For The AI

When responding, provide:

1. the proposed file structure
2. the feature-gating strategy for UI generation
3. the API client and permission model
4. the resource rendering approach
5. the auth/session/MFA handling approach
6. the drift-prevention checks that keep config and OpenAPI aligned
