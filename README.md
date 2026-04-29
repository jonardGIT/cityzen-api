# xypes-cirs-api

Citizen Incident Reporting System (CIRS) REST API built with TypeScript, Express, Prisma, and PostgreSQL.

## Quick Links

- Setup and deployment: `docs/api-setup-guide.md`
- Detailed repository guide: `docs/README.md`
- Production checklist: `docs/production-quick-checklist.md`
- Production env templates: `docs/production-env-templates.md`
- Production runtime runbook: `docs/production-service-runbook.md`

## Development

```bash
npm install
npm run dev
```

## Production

Build the locked production profile first, then run the compiled server:

```bash
npm ci
npm run build:production
npm start
```

Use PM2 or systemd for the real production runtime instead of an interactive shell session.
