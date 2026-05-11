# MyTuguegarao mobile agent prompt

Update the mobile app for backend contract changes already live in CIRS API.

Citizen registration no longer requires `firstName`, `lastName`, or `name` for signup. This applies to both email and mobile citizen registration. Successful auth responses may legally return `user.name`, `user.firstName`, `user.middleName`, `user.lastName`, and `user.suffix` as `null`.

Do not treat null name fields as login or registration failure. After a successful citizen login or registration, detect whether the citizen profile is incomplete and route the user into a profile-completion screen or gating step. The canonical completion endpoint is `PATCH /api/v1/mobile/profile`.

Scope this change to citizen self-service only. Do not add or expand staff, responder, dispatcher, or admin registration paths. Names entered later are self-asserted profile data and must not be presented as verified identity.

This address-selection flow is Cagayan-only. Keep `locality` as the generalized UI label for city or municipality. Do not hardcode locality or barangay lists.

Required endpoint list:

- `GET /api/v1/mobile/reference-data/geography/meta`
- `GET /api/v1/mobile/cagayan/localities`
- `GET /api/v1/mobile/cagayan/localities/{localityId}/barangays`
- `PATCH /api/v1/mobile/profile`

Address flow:

1. After login or registration, detect whether the citizen still needs profile completion.
2. Fetch `GET /api/v1/mobile/reference-data/geography/meta` and compare `geographyVersion` or `lastUpdatedAt` against the cached geography bundle before deciding whether to refresh localities and barangays.
3. Show a locality picker labeled `locality`.
4. Fetch locality options from `GET /api/v1/mobile/cagayan/localities` when the cache is missing or stale.
5. After the user selects a locality, fetch barangay options from `GET /api/v1/mobile/cagayan/localities/{localityId}/barangays`.
6. Submit `addressLine1`, `addressLine2`, `cityMunicipalityId`, and `barangayId` through `PATCH /api/v1/mobile/profile`.
7. Use the returned `locality` and `barangay` objects as the saved canonical selections.

`GET /api/v1/mobile/reference-data/geography/meta` success:

```json
{
  "scope": {
    "pilotScope": "tuguegarao-first",
    "provinceCode": "021500000"
  },
  "geographyVersion": "021500000:2026-05-11T02:30:00.000Z",
  "lastUpdatedAt": "2026-05-11T02:30:00.000Z"
}
```

API examples:

`GET /api/v1/mobile/cagayan/localities` success:

```json
{
  "province": {
    "code": "021500000",
    "name": "Cagayan"
  },
  "localities": [
    {
      "id": "7d3f6dc5-4d0d-4f4b-83f9-2c8b0c92c001",
      "code": "021518000",
      "name": "Amulung",
      "type": "MUNICIPALITY"
    },
    {
      "id": "7d3f6dc5-4d0d-4f4b-83f9-2c8b0c92c002",
      "code": "021529000",
      "name": "Tuguegarao City",
      "type": "CITY"
    }
  ]
}
```

`GET /api/v1/mobile/cagayan/localities/{localityId}/barangays` success:

```json
{
  "locality": {
    "id": "7d3f6dc5-4d0d-4f4b-83f9-2c8b0c92c002",
    "code": "021529000",
    "name": "Tuguegarao City",
    "type": "CITY"
  },
  "barangays": [
    {
      "id": "3c2fdb87-9c90-49f0-b4f2-0dca6c7f1001",
      "code": "021529001",
      "name": "Centro 01"
    },
    {
      "id": "3c2fdb87-9c90-49f0-b4f2-0dca6c7f1002",
      "code": "021529002",
      "name": "Centro 02"
    }
  ]
}
```

`PATCH /api/v1/mobile/profile` request:

```json
{
  "addressLine1": "Door 4, Rizal Street",
  "addressLine2": "Near plaza",
  "cityMunicipalityId": "7d3f6dc5-4d0d-4f4b-83f9-2c8b0c92c002",
  "barangayId": "3c2fdb87-9c90-49f0-b4f2-0dca6c7f1001"
}
```

`PATCH /api/v1/mobile/profile` success:

```json
{
  "id": "9b3dc4d9-5f56-4b51-b3f1-8c4f5ff22001",
  "addressLine1": "Door 4, Rizal Street",
  "addressLine2": "Near plaza",
  "cityMunicipalityId": "7d3f6dc5-4d0d-4f4b-83f9-2c8b0c92c002",
  "barangayId": "3c2fdb87-9c90-49f0-b4f2-0dca6c7f1001",
  "locality": {
    "id": "7d3f6dc5-4d0d-4f4b-83f9-2c8b0c92c002",
    "code": "021529000",
    "name": "Tuguegarao City",
    "type": "CITY"
  },
  "barangay": {
    "id": "3c2fdb87-9c90-49f0-b4f2-0dca6c7f1001",
    "code": "021529001",
    "name": "Centro 01"
  }
}
```

Error-handling notes:

- If `barangayId` is submitted without `cityMunicipalityId`, expect `422` with `{"message":"cityMunicipalityId is required when barangayId is provided"}`.
- If geography metadata or Cagayan localities are misconfigured server-side, expect `503` from `GET /api/v1/mobile/reference-data/geography/meta` or `GET /api/v1/mobile/cagayan/localities` with `{"message":"Mobile Cagayan locality reference is unavailable: active Cagayan province geography is not configured on the server."}`.
- If the selected locality is invalid for the route, expect `404` from `GET /api/v1/mobile/cagayan/localities/{localityId}/barangays` with `{"message":"Active Cagayan locality not found"}`.
- If the `cityMunicipalityId` and `barangayId` pairing is invalid during `PATCH /api/v1/mobile/profile`, expect `404` with `{"message":"Active Cagayan barangay not found for the selected locality"}`. Treat invalid locality or barangay combinations as failed submissions; if backend validation is expanded later, equivalent `422` handling is also acceptable at the client layer.
- If Cagayan localities are misconfigured server-side, expect `503` from `GET /api/v1/mobile/cagayan/localities` with `{"message":"Mobile Cagayan locality reference is unavailable: active Cagayan province geography is not configured on the server."}`.

Update the mobile app in these areas:

- Validation for citizen signup so name fields are optional.
- Onboarding and post-auth flow so incomplete profiles are detected and guided to completion.
- Null-safe rendering anywhere user display names or profile headers are shown.
- Any profile-completion gating logic that currently assumes names are present immediately after auth.
- Address profile-completion UI so locality and barangay both use dropdowns backed by the public Cagayan reference endpoints.
- Address persistence so selected locality, selected barangay, `addressLine1`, and `addressLine2` are saved through `PATCH /api/v1/mobile/profile`.

Acceptance checklist:

- Email and mobile citizen signup succeed without name fields.
- Successful auth with null name fields is handled as authenticated, not as an error state.
- Users with incomplete profiles are routed to profile completion after login or registration.
- Profile completion checks `GET /api/v1/mobile/reference-data/geography/meta` before refetching cached locality and barangay reference data.
- Profile completion fetches localities from `GET /api/v1/mobile/cagayan/localities` and fetches barangays from `GET /api/v1/mobile/cagayan/localities/{localityId}/barangays` only after locality selection.
- Profile completion keeps `locality` as the UI label for city or municipality.
- Profile completion uses dropdowns for locality and barangay instead of hardcoded lists.
- Profile completion saves selected locality, selected barangay, `addressLine1`, and `addressLine2` through `PATCH /api/v1/mobile/profile`.
- Saved profile state reflects the returned `locality` and `barangay` objects from the API response.
- Screens that render user names remain stable and readable when some or all name fields are `null`.
- No staff or admin registration flow is introduced by this change.
