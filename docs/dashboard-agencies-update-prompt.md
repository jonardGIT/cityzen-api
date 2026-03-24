Apply only the latest backend update related to responder agencies.

Primary input files:
- docs/dashboard-crud-config.flat.json

Goal:
Update the dashboard so responders are no longer created with a freeform agency string. Responders must now select an agency from the new agencies resource and submit agencyId.

What changed in the API:
1. New resource: agencies
- GET /api/v1/agencies
- GET /api/v1/agencies/{id}
- POST /api/v1/agencies
- PATCH /api/v1/agencies/{id}
- DELETE /api/v1/agencies/{id}

2. Responders payload changed
- Old create/update field: agency
- New create/update field: agencyId

3. Responders response shape changed
- Responder objects now include:
  - id
  - name
  - agencyId
  - agency: { id, name }
  - role
  - contactInfo

Dashboard implementation requirements:
1. Add Agencies to navigation
- Render Agencies as a normal CRUD resource from config.
- Use label "Agencies".

2. Update responder create/edit forms
- Remove free-text agency input.
- Add an agency selector bound to agencyId.
- Populate options from GET /api/v1/agencies.
- Submit agencyId as a number.
- Do not send agency in request payload anymore.

3. Update responder list/details UI
- Show agency name from responder.agency.name when available.
- Keep agencyId available in state for editing.

4. Validation/error handling
- If agencies list fails to load, disable responder submit and show a retry action.
- If responder create/update returns 422 for agencyId, show the field error on the agency selector.

5. Permission handling
- Agencies uses the same admin-only write permissions as other lookup resources.
- Respect allowedRoles from docs/dashboard-crud-config.flat.json.

6. Typing changes
- Update responder client types from:
  - agency: string
- To:
  - agencyId: number
  - agency?: { id: number; name: string }

7. Suggested field config update
- agencies: name
- responders: name, agencyId, role, contactInfo

Acceptance criteria:
1. Agencies appears in dashboard navigation.
2. Agencies CRUD works from config-driven UI.
3. Responder create/edit uses agencyId selector, not a text field.
4. Responder list/details displays agency name correctly.
5. No dashboard code still sends agency as a string.

Output format requested from AI:
1. Files to update
2. Type changes
3. Form changes
4. Data-loading changes for agency options
5. Final verification checklist