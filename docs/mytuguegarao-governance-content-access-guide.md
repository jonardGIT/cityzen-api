# MyTuguegarao Governance And Content Access Guide

## Purpose

This guide aligns the CIRS API role model with Philippine LGU governance realities for MyTuguegarao, which should be treated as a city-level LGU deployment for Tuguegarao City. It defines:

- which roles should access what
- which roles should manage dynamic mobile content
- which newsroom behaviors should stay embedded in the mobile app
- how the current MyTuguegarao news structure maps to the existing `mobile_app_content` model
- a safe next-step design for a narrower city communications role

This is a Tuguegarao-first interpretation. It should work cleanly for other city LGUs later without forcing a national-first workflow onto city operations.

## Philippine LGU Governance Hierarchy

For operational access design, the practical hierarchy is:

1. National government oversight
2. Regional oversight
3. Provincial government
4. City or municipal government
5. Barangay-level public-facing operations and neighborhood coordination

For MyTuguegarao, the primary operating LGU is Tuguegarao City. That means the center of gravity should be the city government, not the region or the national level.

The current API role model already reflects a usable operational hierarchy:

1. `NATIONAL_ADMIN`
2. `REGIONAL_DIRECTOR`
3. `PROVINCIAL_ADMIN`
4. `CITY_ADMIN`
5. `CITY_CONTENT_EDITOR`
6. `DISPATCHER`
7. `RESPONDER`
8. `CITIZEN_REPORTER`
9. `AUDITOR`

This is not a one-to-one copy of civil service job titles. It is an application access hierarchy that mirrors real LGU supervision, escalation, and operations boundaries.

## MyTuguegarao Deployment Interpretation

Because MyTuguegarao is for Tuguegarao City, use these assumptions:

- `CITY_ADMIN` is the primary city operations and city communications authority.
- `PROVINCIAL_ADMIN` is optional oversight or coordination when Cagayan province needs visibility or shared workflows.
- `REGIONAL_DIRECTOR` is a higher-order oversight role, not the day-to-day publishing role for city content.
- `NATIONAL_ADMIN` is a platform governance role, not the normal newsroom editor.
- Barangay-facing communication can be represented through city-owned content, audience metadata, placement rules, or future audience segmentation, but barangay publishing should not require a separate first-class runtime role yet.

## Current Runtime Access Model

The current runtime behavior in this repo already supports the following access pattern.

### User Management Hierarchy

The API enforces downward-only management:

- `NATIONAL_ADMIN` can manage below it and is the only role allowed to manage `AUDITOR`.
- `REGIONAL_DIRECTOR` can manage province or city-level staff below it.
- `PROVINCIAL_ADMIN` can manage city-level staff below it.
- `CITY_ADMIN` can manage city-scoped operational roles below it.
- `DISPATCHER`, `RESPONDER`, `CITIZEN_REPORTER`, and `AUDITOR` do not function as staff-role managers.

### Current Mobile Content Access

The current `mobile-content` CRUD routes are available to `MOBILE_CONTENT_ROLES`, which currently means:

1. `NATIONAL_ADMIN`
2. `REGIONAL_DIRECTOR`
3. `PROVINCIAL_ADMIN`
4. `CITY_ADMIN`
5. `CITY_CONTENT_EDITOR`

The following roles should not manage mobile content in the current model:

1. `DISPATCHER`
2. `RESPONDER`
3. `CITIZEN_REPORTER`
4. `AUDITOR`

This is the correct fail-closed default for MyTuguegarao today.

## Recommended Access Matrix For MyTuguegarao

Use this role interpretation for Tuguegarao City.

| Role                  | Governance meaning                     | Incident operations | User management | Mobile content publishing                 | Notes                                     |
| --------------------- | -------------------------------------- | ------------------- | --------------- | ----------------------------------------- | ----------------------------------------- |
| `NATIONAL_ADMIN`      | Platform owner / multi-LGU super-admin | Global              | Global          | Yes, override only                        | Avoid as daily editor                     |
| `REGIONAL_DIRECTOR`   | Regional oversight                     | Region              | Region          | Yes, oversight only                       | Should not own city news cadence          |
| `PROVINCIAL_ADMIN`    | Province oversight                     | Province            | Province        | Yes, if province-shared content is needed | Optional for Tuguegarao-only rollout      |
| `CITY_ADMIN`          | Tuguegarao City owning LGU admin       | City                | City            | Yes, primary publisher                    | Best default for city communications      |
| `CITY_CONTENT_EDITOR` | Tuguegarao City communications editor  | No                  | No              | Yes, city-scoped publishing only          | Narrow PIO or digital comms role          |
| `DISPATCHER`          | Operational dispatch staff             | City                | No              | No                                        | Keep focused on incidents and assignments |
| `RESPONDER`           | Field responder                        | Assigned            | No              | No                                        | No newsroom publishing                    |
| `AUDITOR`             | Oversight / redacted review            | Global read         | Redacted read   | No                                        | Read-only oversight only                  |
| `CITIZEN_REPORTER`    | Resident app user                      | Own incidents       | No              | No                                        | Public consumer only                      |

## Dynamic Versus Embedded Content

MyTuguegarao currently has a richer news experience than the API content model. The mobile app includes:

- hardcoded newsroom categories
- featured-story layout rules
- resident-context digest behavior
- “why this matters” presentation logic
- reading-time calculation
- tailored story grouping and card choreography

Those are app-product behaviors, not CMS records. They should stay embedded in the app for now.

### Keep Dynamic In The API

The following content belongs in `mobile_app_content` because staff will need to update it frequently:

1. headline title
2. summary or excerpt
3. full body copy
4. hero or card image URL
5. CTA label
6. CTA destination URL or deep-link target string convention
7. publish and unpublish timing
8. ordering priority
9. placement such as home, alerts, or news
10. content classification such as advisory, announcement, or article

### Keep Embedded In MyTuguegarao

The following should stay in the app code unless the team decides to build a dedicated newsroom CMS layer later:

1. the digest layout system
2. news hub page composition
3. featured-versus-briefing visual hierarchy
4. resident-context panels
5. category tabs and their branded semantics
6. local reading-time computation
7. fallback editorial presentation when content is missing
8. city-branded motion and layout behavior

## Recommended Content Types For Tuguegarao City

Using the current schema, these are the most practical dynamic content classes for MyTuguegarao.

### Good Fits For The Current Model

1. `announcement`
2. `advisory`
3. `news`
4. `service-update`
5. `event`
6. `campaign`
7. `emergency-alert`

### Recommended Placements

1. `home`
2. `news`
3. `alerts`
4. `services`
5. `promos`
6. `onboarding`

For Tuguegarao City specifically, the strongest early rollout is:

1. home hero cards for city-wide announcements
2. advisories for weather, flooding, road closures, and city notices
3. news cards for civic updates and city programs
4. service reminders tied to permit, health, and local service schedules

## MyTuguegarao News Structure To Schema Mapping

The existing app-side `newsItems` records in MyTuguegarao map reasonably well to `mobile_app_content` for simple editorial storage.

### App Field To API Field Mapping

| MyTuguegarao field    | Current source      | `mobile_app_content` field                | Notes                                                       |
| --------------------- | ------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| `id`                  | app constant        | `id`                                      | Backend-generated UUID                                      |
| `title`               | app constant        | `title`                                   | Direct mapping                                              |
| `excerpt`             | app constant        | `summary`                                 | Direct mapping                                              |
| `content`             | app constant        | `body`                                    | Direct mapping                                              |
| `category`            | app constant        | `contentType` or `metadata.categoryLabel` | Use `contentType` for broad type, metadata for app taxonomy |
| `date`                | app constant        | `publishedAt`                             | Convert to ISO datetime                                     |
| `image`               | local asset require | `imageUrl`                                | Requires hosted asset URL, not app-bundled require          |
| detail route id param | app route           | `slug`                                    | Best route-safe public identifier                           |

### Suggested Metadata Shape

Use `metadata` for app-specific decoration without forcing those fields into the top-level schema yet.

Example:

```json
{
  "appCategory": "City News and Features",
  "featureStyle": "featured",
  "city": "Tuguegarao City",
  "source": "city-pio",
  "readingTimeMinutes": 3,
  "tags": ["city-hall", "digital-services"]
}
```

This keeps the backend flexible while the app still owns final presentation.

## Recommended Editorial Ownership For Tuguegarao City

For real city operations, publishing should usually come from the city Public Information Office, mayor’s office communications staff, or a city digital services communications function.

Today, the narrowest shipped runtime role is `CITY_CONTENT_EDITOR`, with `CITY_ADMIN` retaining broader city operations ownership.

That means the practical staffing guidance is:

1. Tuguegarao City communications staff should publish under `CITY_CONTENT_EDITOR` when they do not need broader city-admin powers.
2. Keep `CITY_ADMIN` for communications leads who also need broader city operations access.
3. Use province or region roles only when content is genuinely cross-city or supervisory.
4. Do not give dispatchers or responders publishing powers just because they generate incident information.
5. Auditors should never become publishers.

## Minimal Next-Step Role Design: `CITY_CONTENT_EDITOR`

If MyTuguegarao needs a narrower communications role, the safest next role to introduce is a city-scoped editor rather than expanding `CITY_ADMIN` further.

### Why Add This Role

`CITY_ADMIN` is broader than a communications or PIO user needs. A communications editor usually should not:

1. manage staff users
2. reset passwords
3. manage all city reference data
4. access incident operations beyond what public content requires

### Proposed Role

`CITY_CONTENT_EDITOR`

### Intended Scope

- city only
- no user management
- no dispatch controls
- no responder assignment controls
- no audit export authority
- no broad incident-management authority

### Proposed Permissions

1. `mobile_content:create:city`
2. `mobile_content:read:city`
3. `mobile_content:update:city`
4. `mobile_content:publish:city`
5. `mobile_content:archive:city`

Optional:

1. `media_library:read:city`
2. `media_library:create:city`

### Management Boundary

- `CITY_ADMIN` can manage `CITY_CONTENT_EDITOR`
- `PROVINCIAL_ADMIN` and above can manage it through their existing downward hierarchy
- `CITY_CONTENT_EDITOR` cannot manage any user role

### Recommendation

Design this role next, but do not add it blindly in the same change as content rollout unless the dashboard and auth surfaces are ready. For the current Tuguegarao deployment, `CITY_ADMIN` is sufficient for phase one.

## Phase Recommendations

### Phase 1: Use Existing Roles

Do this now:

1. keep `CITY_ADMIN` as the primary MyTuguegarao publisher
2. allow `PROVINCIAL_ADMIN`, `REGIONAL_DIRECTOR`, and `NATIONAL_ADMIN` only as escalation or override publishers
3. store simple news and advisories in `mobile_app_content`
4. keep the digest layout and branded newsroom behavior inside the app

### Phase 2: Add Narrow Editorial Role

Do this when the city communications team needs separation of duties:

1. add `CITY_CONTENT_EDITOR`
2. give it only content-management permissions
3. wire dashboard CRUD for `mobile-content` to that new role
4. keep user management and operational controls under `CITY_ADMIN`

### Phase 3: Add Audience Segmentation If Needed

Only do this after city publishing works well:

1. barangay-targeted content
2. resident segment targeting
3. service-specific content streams
4. localized digest rules driven partly by metadata

## Final Guidance For MyTuguegarao

Treat MyTuguegarao as Tuguegarao City’s city-LGU deployment.

The right default is:

1. `CITY_ADMIN` owns city publishing
2. higher LGU roles exist for escalation and supervisory override
3. operational incident roles do not publish app content
4. the current backend model should manage simple dynamic editorial content only
5. the app should continue to own the richer newsroom and digest experience

That gives Tuguegarao City a governance model that matches Philippine LGU practice, keeps permissions least-privilege, and avoids turning the mobile app into a generic CMS shell before the city has validated its actual publishing workflow.
