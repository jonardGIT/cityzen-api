# xypes-cirs-api

Citizen Incident Reporting System (CIRS) REST API built with TypeScript, Express, Prisma, and PostgreSQL.

## Quick Links

- Setup and deployment: `docs/api-setup-guide.md`
- Current pilot readiness status: `docs/pilot-readiness-status.md`
- Developer guide microsite: `docs/cirs-developer-site/index.html`
- Detailed repository guide: `docs/README.md`
- Privacy management program: `docs/privacy-management-program.md`
- Privacy management program Word copy: `docs/privacy-management-program.docx`
- Privacy management program memo: `docs/privacy-management-program-memo.md`
- Privacy management program memo Word copy: `docs/privacy-management-program-memo.docx`
- Pilot privacy impact assessment: `docs/privacy-impact-assessment-pilot.md`
- Pilot privacy impact assessment Word copy: `docs/privacy-impact-assessment-pilot.docx`
- Pilot privacy impact assessment memo: `docs/privacy-impact-assessment-pilot-memo.md`
- Pilot privacy impact assessment memo Word copy: `docs/privacy-impact-assessment-pilot-memo.docx`
- Data processing system description: `docs/data-processing-system-description.md`
- Data processing system description Word copy: `docs/data-processing-system-description.docx`
- Data processing system description memo: `docs/data-processing-system-description-memo.md`
- Data processing system description memo Word copy: `docs/data-processing-system-description-memo.docx`
- Lawful basis register: `docs/lawful-basis-register.md`
- Anonymous reporting policy brief: `docs/CIRS-Anonymous-Reporting-Policy-Brief.docx`
- Production checklist: `docs/production-quick-checklist.md`
- Production env templates: `docs/production-env-templates.md`
- Production runtime runbook: `docs/production-service-runbook.md`

## Development

```bash
npm install
npm run dev
```

When backend routes, auth surfaces, or allowed-role contract metadata change, regenerate the checked-in dashboard contract artifacts before pushing:

```bash
npm run docs:dashboard-config
npm run docs:dashboard-config:check
```

`src/docs/dashboardCrudContract.ts` is the source of truth. Do not hand-edit `docs/dashboard-crud-config.json` or `docs/dashboard-crud-config.flat.json`; CI treats drift in those generated files as a real failure.

## Production

Build the locked production profile first, then run the bundled server output:

```bash
npm ci
npm run build:production
npm start
```

Use PM2 or systemd for the real production runtime instead of an interactive shell session.
