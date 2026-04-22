# Prompt: Integrate The Existing MyTuguegarao App With The CIRS API For Citizen Incident Reporting

Use this prompt when asking an AI or an engineering team to produce a practical implementation plan for connecting the existing **MyTuguegarao** mobile app, which already lives in a sibling repository, to this **CIRS API** so Tuguegarao citizens can start reporting incidents through the current backend.

This is not a prompt to invent a brand-new civic app from scratch. The main job is to explain how to integrate the existing mobile app with the current CIRS capabilities, close the remaining delivery gaps, and prepare the rollout path for future partner LGUs.

This prompt must treat the **MyTuguegarao citizen account system** as a separate authority from CIRS. The response should design the integration pattern needed for that architecture rather than assuming it already exists end to end.

## Primary Goal

Produce a production-oriented integration and implementation proposal for enabling **citizen incident reporting from the existing MyTuguegarao mobile app** against this CIRS backend under `/api/v1`, where **citizens register first in the MyTuguegarao platform**, not directly in CIRS.

The proposal must stay:

- LGU-first
- Tuguegarao-first
- practical for a real city rollout
- compatible with how this API already works today
- extensible for future city and platform expansion without forcing national-first abstractions now

## Main Question To Answer

How should the existing MyTuguegarao mobile app use its own **mobile-number-based registration and account system**, then integrate with the current CIRS API so a verified MyTuguegarao citizen can submit incident reports, monitor their own cases, optionally use public-safe case lookup where appropriate, and later participate in a broader partner-city citizen service platform?

## Current Mobile App Context

Assume:

- MyTuguegarao already exists in a separate sibling repository
- the mobile team does not need a greenfield app concept or generic app-design exercise
- the immediate objective is to turn the existing app into a working citizen entry point for CIRS incident reporting
- the app may already contain or plan to contain other civic surfaces such as announcements, service information, emergency contacts, and hotline listings
- the mobile app is expected to own citizen registration based on **mobile number** and its own user or account records

Keep the center of gravity on **CIRS integration and incident-reporting enablement**, while still accounting for the broader mobile-app context.

## Current CIRS Behavior Today

The response must explicitly acknowledge the current backend behavior as the starting point, not pretend the desired integration already exists.

Today, the repository appears to support a CIRS-native citizen flow such as:

1. citizen account registration through `POST /api/v1/auth/register`
2. authenticated citizen-profile link or self-profile creation through `POST /api/v1/citizens/link-me`
3. authenticated incident submission through `POST /api/v1/incidents/report`
4. authenticated citizen incident list retrieval through `GET /api/v1/incidents`
5. authenticated citizen incident detail retrieval through `GET /api/v1/incidents/{id}`

Also account for adjacent or optional flows already present in the backend:

- optional public case lookup through `GET /api/v1/cases/{caseToken}` when the product wants a privacy-safe trust layer for status visibility
- optional media upload through `POST /api/v1/incidents/media/upload` when incident media storage is enabled
- authenticated media access resolution through `GET /api/v1/incidents/{id}/media/{mediaId}` when stored media needs backend-gated retrieval

The response should explicitly discuss the fact that some capabilities are **feature-gated** and environment-dependent, especially:

- auth mode and token mode differences
- optional MFA behavior
- optional incident media upload and storage behavior
- archive-oriented backend behavior for managed records
- production safety requirements around public case lookup rate limiting and privacy

Treat that current behavior as **what CIRS does today**, not automatically as the desired mobile onboarding model for MyTuguegarao.

## Desired Future Integration Pattern

The response must explicitly design the future pattern below as an **integration and implementation target**:

1. a citizen registers first in the separate **MyTuguegarao API** using the mobile app's own account system, centered on **mobile-number-based registration**
2. MyTuguegarao becomes the first registration authority for those mobile users
3. when the citizen later submits an incident report through the mobile app, CIRS must verify through a **trusted service-to-service call** to the MyTuguegarao API that the requesting citizen is a real registered mobile user
4. CIRS must decide what stable external identifier it should trust, link, and store for that citizen relationship
5. the design must avoid spoofable client-supplied identity such as arbitrary citizen IDs, phone numbers, or claimed external-account identifiers coming directly from the device without server verification
6. the pattern should be designed so it can later support **future city apps** that act as other trusted citizen identity sources without forcing a national-first rewrite now

The prompt recipient should compare:

- what CIRS does today
- what MyTuguegarao-first citizen onboarding should become
- what additive backend and integration work is needed to bridge the two safely

## Important Backend Realities To Respect

The proposal must reflect how this API behaves today.

Call out at minimum that:

- citizen reporting is tied to the authenticated `CITIZEN_REPORTER` role
- `POST /api/v1/citizens/link-me` and `POST /api/v1/incidents/report` derive identity from the authenticated account rather than trusting client-supplied actor IDs
- the citizen must have a linked citizen profile before incident reporting succeeds
- incident list and detail access for citizens are scoped to their own records
- public case lookup is intentionally redacted and should remain privacy-safe and rate-limited
- incident media support may be unavailable unless the storage feature is enabled in the environment

Also require the response to preserve the following in the future integration design:

- CIRS must not accept a report solely because the mobile client claims a phone number, citizen ID, or external account ID
- the trusted identity assertion must come from a secure server-to-server verification path between CIRS and MyTuguegarao
- the mobile app must not become a spoofable identity bridge into CIRS
- any citizen-to-CIRS linkage must remain privacy-safe, auditable, and fail-closed

Do not propose changes that weaken fail-closed behavior, identity derivation, privacy boundaries, or LGU operational controls.

## What The Recipient Should Produce

Produce a concrete integration proposal suitable for engineering planning and phased delivery.

The response should cover:

- how the existing MyTuguegarao app should use its own API for mobile-number-based registration, login, and account verification before incident reporting is attempted against CIRS
- how the app should authenticate against CIRS for reporting-related operations once MyTuguegarao identity has been established and trusted
- how CIRS should create, link, or reconcile the citizen's CIRS-side profile based on a verified external mobile identity rather than direct first-registration in CIRS
- how the app should structure the reporting UX around the current incident-report endpoint
- how the app should display the citizen's own incidents, statuses, details, and any trust-safe timeline or case visibility surfaces
- what backend gaps, contract clarifications, or coordination work remain before launch
- what should be shipped for Tuguegarao first versus deferred until after initial adoption

## Incident Reporting Integration Scope

Treat the incident-reporting feature as the day-one anchor capability.

Ask the recipient to define:

- the mobile-side screen flow for MyTuguegarao mobile-number registration, sign in, identity verification state, any required CIRS-side citizen linkage step, incident report creation, submission confirmation, incident history, and incident detail
- the payload mapping between MyTuguegarao forms, MyTuguegarao account identity, and the current or proposed CIRS incident-report contract
- how categories, severities, locality inputs, coordinates, attachments, and case visibility should be handled in the app
- how the app should behave when the citizen exists in MyTuguegarao but does not yet have an accepted or linked CIRS citizen record
- how CIRS should verify the MyTuguegarao citizen before accepting a report
- what identifier CIRS should trust or persist for the linked citizen identity, such as an external user ID, account subject, verified mobile number reference, or a dedicated partner-app citizen key
- how the app should behave when media upload is disabled
- how the app should behave when case lookup is enabled or intentionally withheld from the initial launch
- what validation should live in the mobile app versus what must remain backend-enforced
- what error states, retries, and offline-tolerant patterns are needed for real field conditions in Tuguegarao

The response should distinguish:

- minimum launch scope needed to make citizen reporting real
- near-term hardening and trust improvements
- later platform capabilities that should not block the first rollout

It should also distinguish:

- current CIRS-native onboarding behavior today
- the future MyTuguegarao-first registration and trusted-verification model
- what migration or coexistence approach should be used while both patterns may temporarily exist

## Emergency Tab And Hotline Context

Include the MyTuguegarao **Emergency** tab and hotline capability as part of the mobile context, but do not let it overshadow the incident-reporting integration work.

The proposal should explain how the Emergency area should complement CIRS reporting, including:

- emergency hotline listings for police, fire, rescue, medical, disaster response, women and children protection, and similar city services
- direct-call behavior from supported devices
- emergency guidance, service scope, and fallback instructions
- when to route citizens to a hotline versus when to route them into an incident-report flow
- how hotline and emergency information should eventually be managed, published, and localized per city

If the current backend does not yet fully own hotline content, the response should say how that should be staged without blocking citizen incident-report launch.

## Architecture And Integration Expectations

The response must stay grounded in the current CIRS backend and explain how to integrate with it safely.

Address at minimum:

- mobile-to-API integration architecture for the existing MyTuguegarao codebase, including the boundary between the MyTuguegarao API and the CIRS API
- API client patterns, token handling, refresh behavior, and session handling appropriate to the configured auth mode in both systems if separate tokens or trust exchanges are involved
- citizen identity boundaries and why the app must not send spoofable identity fields for self-reporting flows
- service-to-service verification patterns CIRS should use before accepting a report from a MyTuguegarao user
- endpoint-by-endpoint integration sequencing for MyTuguegarao registration, MyTuguegarao login, trusted identity verification, CIRS citizen linkage or reconciliation, report, list, detail, optional media upload, and optional public case lookup
- privacy-safe handling of attachments, case tokens, redacted public responses, and incident details
- observability, audit sensitivity, abuse prevention, and rollout safeguards
- environment and feature-profile awareness between local, staging, and production deployments
- coordination needed with dashboard or admin surfaces for reference data, content management, and operational support

Require the response to evaluate whether CIRS should trust and store:

- a MyTuguegarao external user ID
- a partner-app scoped subject or account key
- a verified mobile-number reference without storing raw phone data as the primary trust key
- a mapping table or linked identity record designed for future city-app expansion

Require the response to explain why raw client-supplied mobile numbers alone are not sufficient proof of identity.

## Tuguegarao-First Delivery Plan

Ask for a realistic phased rollout plan.

The plan should include:

- phase 1: enable MyTuguegarao mobile-number registration in the separate mobile platform, trusted CIRS verification of registered users, incident reporting, and citizen incident tracking for Tuguegarao
- phase 2: harden trust, identifier-linking, attachments, emergency-content management, and citizen experience quality
- phase 3: extract shared external-identity patterns for partner-city rollout and platform controls

For each phase, require:

- scope
- dependencies
- backend coordination needs
- mobile engineering needs
- operational readiness needs inside the LGU
- technical and privacy risks
- launch or exit criteria

## Future City And Platform Expansion

The response should still describe the future platform direction beyond Tuguegarao.

Explain what this service can eventually support over time, such as:

- additional city-branded citizen apps or a shared multi-city citizen platform
- multiple trusted city-app identity providers that can each register citizens outside CIRS and then integrate into the same incident-reporting trust layer
- city-specific hotlines, advisories, emergency workflows, and service catalogs
- configurable incident-routing policies by city, barangay, or partner-LGU operating model
- broader citizen-service modules such as requests, complaints, appointments, announcements, and notifications
- province-aware escalation and partner-city coordination where the backend already supports locality-aware operations
- multilingual content, configurable branding, and city-specific feature availability
- operational analytics, adoption measurement, and service-level monitoring
- stronger citizen identity verification tiers only when justified by service sensitivity

Make the future-state plan concrete by separating:

- what should stay shared in the platform
- what should be configurable per city
- what should be deferred until there is real partner-LGU demand

Require the response to explain how the MyTuguegarao-first identity pattern can scale to future city apps without letting arbitrary client apps self-assert identity into CIRS.

## Required Deliverables From The Recipient

Require the response to include all of the following:

1. an integration-first product definition for MyTuguegarao incident reporting using the current CIRS backend
2. a proposed mobile user flow aligned to MyTuguegarao mobile-number registration first, then trusted CIRS integration for citizen linkage, `incidents/report`, `incidents` list and detail, and any optional trust-layer flows
3. an endpoint-level and integration-boundary plan identifying what is ready now in CIRS, what the desired future MyTuguegarao verification pattern requires, what is feature-gated, and what needs clarification or follow-up work
4. a production-oriented architecture recommendation for the existing mobile app's CIRS integration
5. a privacy, security, and operational-risk assessment for citizen reporting, external identity verification, case lookup, attachments, and emergency surfaces
6. a phased Tuguegarao rollout plan with realistic implementation sequencing
7. a future partner-city and service-platform expansion model
8. a list of open questions, assumptions, and proposed decisions before build-out starts

The deliverables must clearly separate:

- current CIRS behavior today
- the desired future integration pattern
- the security properties that must be preserved through the transition

## Output Style

The response should be practical, implementation-oriented, and explicit about tradeoffs.

Avoid:

- generic app brainstorming
- abstract smart-city language
- national-first platform framing
- pretending every capability already exists in the backend

Anchor recommendations in:

- the current CIRS API behavior
- the fact that MyTuguegarao mobile registration should happen outside CIRS first
- Tuguegarao launch reality
- citizen reporting enablement
- privacy-safe trust surfaces
- emergency reliability
- partner-LGU expansion without premature over-engineering
