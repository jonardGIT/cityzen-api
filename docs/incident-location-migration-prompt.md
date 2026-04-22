Incident location migration status for the Xypes CIRS API.

Current state:

- Full migration is complete.
- `locationId` is removed from the backend contract.
- The standalone `locations` resource is removed.
- Incident records store coordinates and address snapshot fields directly.
- Reverse geocoding, if used, is a client-side responsibility.

Current incident payload fields:

- `latitude`
- `longitude`
- `addressLine1`
- `addressLine2`
- `barangay`
- `districtName`
- `cityName`
- `provinceName`
- `regionName`
- `postalCode`
- `landmark`

Affected flows:

- `POST /api/v1/incidents`
- `PATCH /api/v1/incidents/{id}`
- `POST /api/v1/incidents/report`

Frontend follow-up:

1. Remove any `locationId` field from incident forms and clients.
2. Remove any `/locations` dashboard page or lookup dependency.
3. Send incident-owned location snapshot fields directly.
4. Keep using JWT-protected incident flows; viewer users can only work with their own incidents, while broader incident access remains role-controlled by the backend.
