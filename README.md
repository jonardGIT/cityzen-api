# xypes-cirs-api

Citizen Incident Reporting System (CIRS) API for incident intake, operational routing, response coordination, and administrative management.

## What This App Does

The API powers a local-government-focused incident reporting platform. It supports citizen-submitted reports, internal operations workflows, assignment handling, reference data management, and authenticated administrative actions.

Primary functional areas include:

- authentication and access control
- incident reporting and lifecycle management
- assignment and responder coordination
- audit-aware administrative operations
- geography and reference-data resources
- citizen and mobile-facing API support

Password reset uses public request and confirm endpoints. In non-production, reset delivery can stay local for operator testing. In production, the API fails closed unless password reset delivery is configured through an HTTPS webhook receiver.

## Deployment

Droplet deployment through GitHub Actions is documented in [docs/droplet-deploy-setup.md](docs/droplet-deploy-setup.md).
