x`# Prompt: Prepare The CIRS Backend For MyTuguegarao Citizen Incident Reporting Integration

Use this prompt when asking an AI or an engineering team to assess, implement, or prepare this CIRS backend so the existing **MyTuguegarao** mobile app can integrate for **citizen incident reporting**.

This prompt is intentionally **complementary** to `docs/mytuguegarao-citizen-app-service-implementation-prompt.md`.

- The sibling mobile prompt asks how the existing app should integrate with CIRS.
- This backend prompt asks what the **CIRS API must expose, preserve, clarify, or complete** so that integration is production-ready.

This is not a request to redesign the mobile app. It is also not a license to invent new backend capabilities that the repository does not already support. If something appears missing, treat it as a **gap analysis item**, an **optional follow-up**, or a **clarification request**, not as an assumed existing feature.

This prompt must explicitly treat **MyTuguegarao as an external trusted citizen identity source** for mobile users in the desired future architecture, while still being honest about what the CIRS backend supports today.

## Goal And Scope

Produce a practical backend-readiness and implementation plan for enabling the existing **MyTuguegarao** app to use this CIRS API under `/api/v1` for citizen incident reporting, citizen case tracking, and narrowly scoped trust-safe case visibility, where **mobile-user registration happens first in the separate MyTuguegarao API** rather than directly in CIRS.

The response must stay:

- backend and API focused
- Tuguegarao-first and LGU-first
- grounded in the current repository behavior
- safe for production operations and privacy
- aware of future partner-city rollout without turning the present task into a generic national platform rewrite

The first objective is to make **current citizen reporting for Tuguegarao** work safely. Future city or platform expansion should be addressed only in ways that remain configurable and do not distort present CIRS behavior.

## Main Question To Answer

What must this CIRS backend preserve, expose, clarify, or complete so the existing MyTuguegarao mobile app can act as a **trusted external citizen identity source** for incident reporting and self-case tracking in Tuguegarao, while keeping future partner-city expansion possible through configuration and additive follow-up work?

## Read These Source-Of-Truth Files First

Before proposing changes, read the implementation and contract surfaces that already define current behavior.

Start with:

- `docs/mytuguegarao-citizen-app-service-implementation-prompt.md`
- `README.md`
- `src/app.ts`
- `src/featureSelection.ts`
- `src/routes/auth.ts`
- `src/controllers/authController.ts`
- `src/routes/citizens.ts`
- `src/routes/incidents.ts`
- `src/controllers/incidentsController.ts`
- `src/docs/openapi.ts`
- `src/__tests__/auth-bootstrap.test.ts`
- `src/__tests__/incidents.test.ts`
- `src/__tests__/security.test.ts`
- `src/__tests__/featureSelection.test.ts`

If you need implementation detail beyond those files, prefer the nearest validator, middleware, or service used by these routes instead of broad repo exploration.

## Current Citizen Flow Already Supported By This Backend

Anchor your plan on the current authenticated citizen flow that this backend already appears to support, but do not confuse it with the desired future MyTuguegarao integration model:

1. `POST /api/v1/auth/register`
2. `POST /api/v1/citizens/link-me`
3. `POST /api/v1/incidents/report`
4. `GET /api/v1/incidents`
5. `GET /api/v1/incidents/{id}`

Also account for adjacent or optional flows already present in the codebase:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/cases/{caseToken}` for public-safe case lookup
- `POST /api/v1/incidents/media/upload` when media storage is enabled
- `GET /api/v1/incidents/{id}/media/{mediaId}` for backend-gated media access

Your response must clearly distinguish:

- what is already supported now
- what CIRS does today because it is currently the direct citizen registration authority in this flow
- what the desired future architecture would change by moving first registration to MyTuguegarao
- what is feature-gated or environment-dependent
- what needs contract clarification
- what is a genuine backend gap worth implementing next

## Desired Future Identity And Reporting Pattern

The response must explicitly evaluate how CIRS should support this target architecture as an additive integration pattern:

1. citizens register first in the **MyTuguegarao API** using mobile-number-based onboarding and the mobile platform's own account model
2. CIRS is not the first registration authority for those mobile users
3. before CIRS accepts a citizen incident report from MyTuguegarao, CIRS performs a **trusted service-to-service verification** against MyTuguegarao to confirm the citizen is a real registered mobile user
4. CIRS stores or trusts a stable linked identifier for that external citizen relationship rather than trusting arbitrary identity fields coming from the mobile client
5. the design must avoid spoofable client-supplied identity, including raw phone numbers, claimed citizen IDs, or claimed external-account subjects sent directly from the app without trusted backend verification
6. the design should be repeatable for future city apps acting as additional trusted citizen identity sources

The recipient should explicitly answer:

- what CIRS should trust from MyTuguegarao
- what CIRS should store as the linked external identity
- what runtime checks must happen before report acceptance
- what new endpoint, token-exchange, mapping-table, or verification-service work is actually needed

## Current Backend Realities You Must Respect

Do not replace current security or trust boundaries with looser mobile-oriented assumptions.

At minimum, explicitly preserve that:

- citizen incident reporting is tied to the authenticated `CITIZEN_REPORTER` role
- `POST /api/v1/citizens/link-me` derives the acting account from the authenticated user context
- `POST /api/v1/incidents/report` derives the citizen identity from the authenticated user context
- the citizen must have a linked citizen profile before authenticated reporting succeeds
- citizen incident list and detail access are scoped to that citizen's own records
- public case lookup is intentionally redacted and should remain privacy-safe and rate-limited
- incident media upload is optional and depends on feature selection and environment configuration
- archive behavior and additive contract stability matter for existing clients
- audit sensitivity, abuse prevention, and fail-closed defaults should not be weakened

Also explicitly preserve in the future design that:

- CIRS must never accept a citizen identity claim only because the mobile client supplied it
- any MyTuguegarao identity trust must be established through a server-controlled mechanism
- linked external identity should be auditable and revocable
- the introduction of an external identity source must not weaken citizen-self scoping, public redaction, or LGU operational controls

Do not recommend sending spoofable actor IDs, trusting mobile-provided self-identity fields, exposing internal incident data on public endpoints, or flattening LGU operational controls just to simplify the app integration.

## What The Backend Must Preserve For Secure Citizen Reporting

Ask the recipient to identify the backend behaviors that must remain stable for launch safety.

Require explicit treatment of:

- API key and bearer-token expectations for mobile requests
- authenticated identity derivation from the JWT subject rather than from request payloads
- how authenticated identity derivation should evolve when the acting citizen originates from MyTuguegarao rather than direct CIRS-native registration
- citizen-self data boundaries versus dispatcher, responder, admin, and auditor access
- incident ownership scoping on list and detail routes
- privacy-safe case-token handling and enumeration resistance
- rate limiting for public trust endpoints and auth-sensitive flows
- audit logging or equivalent operational traceability for registration, citizen linking, reporting, upload, and auth refresh flows
- safe handling of attachments and signed access URLs when storage is enabled
- backward compatibility for current dashboard and operational clients

Require the response to explain what security properties must be preserved as non-negotiable:

- fail-closed verification when MyTuguegarao cannot be reached or the citizen cannot be verified
- no client-controlled override for external identity linkage
- no acceptance of spoofable mobile-number assertions from the device alone
- no public leakage of trusted external identity data

## What May Need To Be Exposed, Clarified, Or Completed For MyTuguegarao

The response should not assume every backend need is already perfectly productized. Ask for a concrete evaluation of what the mobile app still needs from CIRS.

Require the recipient to assess whether any of the following need clarification, documentation, hardening, or additive implementation:

- precise request and response examples for any external-identity verification, mobile-facing auth, and citizen-reporting flows
- clearer error contracts for missing citizen linkage, forbidden payload fields, expired or invalid refresh tokens, and disabled feature paths
- reference-data endpoints and list-query expectations the app needs for categories, severities, statuses, and locality-related selections
- any missing citizen-safe incident response fields needed for the app to show history, detail, trust state, and upload state without exposing internal-only data
- whether public case lookup should be exposed in phase 1, deferred, or kept optional behind product and operational approval
- whether additional backend documentation, OpenAPI accuracy, or example payload coverage is needed before the mobile team starts implementation
- whether the current route set is sufficient for day-one launch without schema or endpoint changes
- whether CIRS needs a new trusted integration endpoint, service credential model, identity-mapping table, or verification adapter for MyTuguegarao
- what identifier CIRS should trust or store for the linked citizen identity

If you identify a missing capability, label it as one of:

- launch blocker
- near-term hardening item
- optional follow-up
- future platform capability

## Auth, Session, And Token Expectations

The response must address how the mobile app should work with the backend's existing auth model rather than inventing a browser-style session model.

Cover at minimum:

- current registration and login expectations under the existing auth routes
- how those current auth routes relate to a future model where mobile-user registration starts in MyTuguegarao instead
- token handling for mobile clients using bearer authorization
- refresh-token use through `POST /api/v1/auth/refresh`
- refresh-token rotation expectations and invalidation handling
- the fact that token behavior may differ by feature selection, especially `app-jwt` versus `supabase-jwt`
- optional MFA mode differences where relevant to the selected auth profile
- what the mobile app must persist securely on-device and what it must never log or expose

Require the response to decide whether the future trust model should use, for example:

- a server-to-server verification call on demand
- a partner-signed assertion or token exchange validated by CIRS
- a CIRS-issued session after MyTuguegarao verification
- some combination of external identity verification plus local CIRS citizen linkage

Be explicit that recommendations must be validated against the current feature-selection model in `src/featureSelection.ts` and not hard-coded to one assumed deployment profile.

## Citizen Profile Linking And Self-Service Identity Constraints

Require an explicit plan for how CIRS should support self-service citizen onboarding from an **external trusted citizen identity source** without weakening identity boundaries.

Address:

- how `POST /api/v1/citizens/link-me` is intended to create or update the authenticated citizen's linked profile today
- whether `POST /api/v1/citizens/link-me` remains the right mechanism once the citizen is first registered in MyTuguegarao rather than directly in CIRS
- which fields the client may send and which fields must remain server-controlled
- how the backend should communicate "profile not linked yet" versus validation failures versus forbidden field usage
- whether any response-shape clarification is needed so the app can reliably gate the reporting flow
- what should remain self-service versus what must stay operationally controlled by LGU users
- what external identifier should be attached to the citizen profile or linked identity record
- how to prevent the client from choosing arbitrary external IDs, phone numbers, locality IDs, or roles

Do not propose a design where the mobile app can choose arbitrary citizen IDs, contact identities, locality IDs, or roles for the acting account.

## Incident Reporting Contract, Attachments, Case Lookup, And Feature Gates

Ask the recipient to define the backend contract expectations for the full citizen reporting flow.

Require analysis of:

- `POST /api/v1/incidents/report` request and response expectations
- required and optional reporting payload fields
- what location snapshot fields the client should send versus which canonical locality identifiers must remain backend-controlled or rejected
- category and severity validation expectations
- how status assignment is handled by the backend rather than by the mobile client
- how the API behaves when the citizen profile is missing
- how the API should behave when MyTuguegarao verification fails, times out, or returns an untrusted result
- how the API behaves when attachments are disabled by feature selection
- how `POST /api/v1/incidents/media/upload` and `GET /api/v1/incidents/{id}/media/{mediaId}` should be used when enabled
- what the app should receive for trust artifacts such as case token, lookup path, or expiration metadata where already supported
- whether `GET /api/v1/cases/{caseToken}` belongs in initial rollout or later trust hardening
- whether CIRS should accept direct citizen-report requests only after establishing or refreshing a trusted link to the MyTuguegarao citizen identity

Be explicit that media upload, signed access, and public case lookup should be treated as capability-dependent paths, not unconditional assumptions.

## Reference Data And Configuration The Mobile App Will Need

Require the recipient to spell out what reference data and backend-managed configuration MyTuguegarao depends on for a reliable citizen reporting flow.

At minimum, cover:

- categories
- severities
- statuses actually exposed to citizens or trust-safe case lookup surfaces
- locality or location-related conventions used by the current reporting contract
- hotline or emergency-contact content if the backend is expected to own or later own that data
- feature-profile differences between local, staging, and production
- environment flags that change auth mode, token mode, MFA mode, media storage, or archive behavior
- trusted integration configuration such as partner credentials, verification endpoints, timeouts, retry policy, and external identity mapping rules

If some mobile-needed configuration is not yet owned cleanly by this API, require the response to say how that should be staged without blocking Tuguegarao incident reporting.

## Rollout, Operational, And Privacy Expectations

The response must stay production-oriented.

Require coverage of:

- Tuguegarao-first rollout sequencing
- staging and production readiness checks for auth, uploads, rate limits, and public trust endpoints
- staging and production readiness checks for MyTuguegarao-to-CIRS trusted verification
- operational monitoring, audit review, and abuse detection concerns
- support expectations for failed registration, failed citizen linking, failed uploads, and invalid or expired case tokens
- privacy controls for citizen identity, exact incident location, media evidence, and public trust responses
- launch criteria for exposing public case lookup, if it is exposed at all
- coordination needed with dashboard or admin users for reference data, status workflow, and incident operations

Do not frame privacy as optional polish. Treat it as part of release readiness.

## Future Partner-City Capability And What Must Remain Configurable

Ask for a future-looking backend plan, but keep the near-term target clear.

The response should distinguish:

- what should remain shared in the core CIRS platform
- what should be configurable per city or partner LGU
- what should be deferred until there is real demand beyond Tuguegarao

At minimum, evaluate future configurability for:

- city-specific branding or client registration assumptions
- trusted external identity-provider configuration for other city apps
- city-specific categories, severity guidance, or public trust messaging
- hotline and emergency-content ownership
- locality and partner-LGU rollout rules
- incident-routing, assignment, or escalation policy differences
- feature flags controlling uploads, public trust case lookup, and auth profile selection

Avoid national-first abstractions that weaken present Tuguegarao delivery. Prefer repeatable partner-city configuration over speculative platform generalization.

## Expected Deliverables From The Recipient

Require the response to include all of the following:

1. a backend-readiness assessment for MyTuguegarao citizen incident reporting against the current CIRS API
2. a source-of-truth summary of which current endpoints and behaviors are already usable by the mobile app
3. a preserve-versus-change analysis identifying what backend behavior must remain stable, what current CIRS-native behavior exists today, and what can be adjusted safely for a future external trusted identity model
4. an auth and token-handling recommendation aligned with current feature-selection modes
5. a citizen profile-linking and self-service identity analysis aligned with current security constraints and external trusted identity support
6. an incident-reporting contract review covering payloads, responses, pre-report verification, attachments, case lookup, and feature gates
7. a reference-data and configuration plan for what the mobile app needs from the backend
8. a rollout and operations plan for Tuguegarao launch readiness
9. a future partner-city configuration model that stays additive and LGU-first
10. a gap list categorized into launch blockers, near-term hardening, optional follow-up, and future platform items
11. a concrete list of backend deliverables such as endpoint clarifications, OpenAPI updates, tests, validation changes, identity-mapping work, verification-service work, or operational runbook updates if needed

The deliverables must clearly separate:

- current CIRS behavior today
- the desired future MyTuguegarao-to-CIRS integration pattern
- the security and anti-spoofing guarantees that must remain intact

## Output Style

The response should be implementation-oriented, contract-aware, and explicit about what is real today versus what is proposed.

Avoid:

- fluffy smart-city language
- generic platform brainstorming disconnected from the repository
- assuming all mobile conveniences already exist in the API
- recommending breaking changes before checking current clients and tests

Anchor the response in:

- current CIRS behavior today
- the desired future model where MyTuguegarao is the first registration authority for mobile citizens
- trusted service-to-service verification before CIRS report acceptance
- privacy-safe linked identity handling
- partner-LGU expansion through repeatable trusted-app integration patterns
- collapsing private citizen flows and public trust flows into the same exposure model

Anchor recommendations in:

- the current Express and Prisma backend
- existing route, controller, test, and OpenAPI behavior
- Tuguegarao-first citizen reporting
- privacy-safe trust surfaces
- additive, configurable partner-LGU expansion
