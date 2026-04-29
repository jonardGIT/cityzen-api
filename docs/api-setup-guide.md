# API Setup Guide

This guide explains how to set up the API properly, which environment variables are required, how the different feature profiles change the setup, and how to run the API in development and production.

Use this document as the practical operator guide.

## Dashboard Integration Contract

The current CIRS dashboard is a Next.js app that runs locally on `http://localhost:3001` and, in production, should be hosted on its own HTTPS origin.

For API operators, the important integration rules are:

- the API remains the source of truth for auth, authorization, validation, rate limiting, and audit behavior
- the dashboard now fronts browser auth through its own same-origin `/api/auth/*` proxy routes
- the dashboard stores browser session state in `HttpOnly` cookies on the dashboard origin, not on the API origin
- the API must still expose its normal auth routes under `/api/v1/auth/*`
- `CORS_ORIGIN` must allow the real dashboard origin or origins for the environment being deployed
- production dashboard runtime should not depend on live `/api/v1/openapi.json`

## 1. Setup Order

Set the API up in this order:

1. Install dependencies.
2. Prepare the database connection.
3. Decide which feature profile you are using.
4. Set the required environment variables for that profile.
5. Build the app if you are preparing a production release.
6. Start the API with the correct runtime command.
7. Verify health and authentication after boot.

If you skip the profile decision and set environment variables first, you will usually end up with the wrong auth or MFA configuration.

## 2. Core Rule: Development vs Production

This API behaves differently in development and production.

### Development

- The app reads `FEATURE_*` variables directly from the runtime environment.
- You can switch profiles by editing `.env.development` or by prefixing variables on the command line.
- Start command is usually `npm run dev`.

### Production

- The feature profile is locked at build time by `npm run build:production`.
- Runtime `FEATURE_*` variables are ignored after that build.
- Production startup is strict and fails closed if required security variables are missing or unsafe.
- Start command is usually `npm start` or a process manager running `dist/server.js`.

## 3. What You Need Before Anything Else

These are the first things to decide before configuring the app.

### Database

You need PostgreSQL.

Minimum database variables:

- `DATABASE_URL`
- `DIRECT_URL`

Use `DATABASE_URL` for runtime.
Use `DIRECT_URL` for Prisma schema and migration commands.

### API Key Policy

The API is protected by API key middleware.

Valid variables:

- `API_KEYS`
- `API_KEY`

In production, at least one of them must be configured or startup fails.

### Base Security Variables

Depending on the profile, you may also need:

- `JWT_SECRET`
- `MFA_ENCRYPTION_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PASSWORD_RESET_DELIVERY_WEBHOOK_URL`

## 4. Environment Variables By Priority

The easiest way to think about the environment is by priority.

### A. Always Needed In Real Deployments

These should be treated as baseline variables:

- `NODE_ENV`
- `PORT`
- `API_BASE_PATH`
- `HOST`
- `DATABASE_URL`
- `DIRECT_URL`
- `CORS_ORIGIN`
- `TRUST_PROXY`
- `API_KEYS` or `API_KEY`

Recommended baseline operational variables:

- `RATE_LIMIT_ENABLED`
- `RATE_LIMIT_STORE`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`
- `LOG_LEVEL`
- `JSON_BODY_LIMIT`

### B. Required For Local Auth Profiles

Use these when the token mode is `app-jwt` and MFA is local.

- `JWT_SECRET`
- `MFA_ENCRYPTION_KEY`

### C. Required For Supabase Auth Profiles

Use these when the auth provider or token mode depends on Supabase.

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Usually also set:

- `SUPABASE_AUTH_AUTO_CONFIRM_EMAIL`
- `SUPABASE_PASSWORD_RESET_REDIRECT_URL`

### D. Required For Production Password Reset Delivery

Production now requires webhook-based password reset delivery.

- `PASSWORD_RESET_DELIVERY_WEBHOOK_URL`

Optional in development only:

- `PASSWORD_RESET_DELIVERY_MODE`

Important:

- In production, `PASSWORD_RESET_DELIVERY_MODE` must be unset or set to `webhook`.
- In production, `PASSWORD_RESET_DELIVERY_WEBHOOK_URL` must be `https://`.

### E. Required When Media Storage Is Enabled

If `FEATURE_MEDIA_STORAGE=supabase-storage`, set:

- `SUPABASE_STORAGE_ENABLED=true`
- `SUPABASE_STORAGE_BUCKET`
- `SUPABASE_STORAGE_ACCESS_MODE`

Optional but common:

- `SUPABASE_STORAGE_SIGNED_URL_TTL_SECONDS`
- `SUPABASE_STORAGE_SCAN_WEBHOOK_URL`
- `SUPABASE_STORAGE_MAX_UPLOAD_BYTES`
- `SUPABASE_STORAGE_ALLOWED_MIME_TYPES`
- `SUPABASE_STORAGE_ARCHIVE_ENABLED`
- `SUPABASE_STORAGE_ARCHIVE_PREFIX`

Important:

- In production, `SUPABASE_STORAGE_ACCESS_MODE` must be `signed`.

## 5. Feature Profiles

This repo supports these feature groups:

- Auth provider: `local` or `supabase`
- Token mode: `app-jwt` or `supabase-jwt`
- MFA mode: `disabled`, `local-totp`, or `supabase-totp`
- Media storage: `disabled` or `supabase-storage`
- Record deletion: `hard-delete` or `archive`

The practical profiles below are the ones you should actually use.

## 6. Recommended Profiles

### Profile 1: Local Development

Use this for normal backend development.

Feature variables:

```env
FEATURE_PROFILE_NAME=development-local
FEATURE_AUTH_PROVIDER=local
FEATURE_TOKEN_MODE=app-jwt
FEATURE_MFA_MODE=local-totp
FEATURE_MEDIA_STORAGE=disabled
FEATURE_RECORD_DELETION=archive
```

Required env variables:

```env
NODE_ENV=development
PORT=3000
API_BASE_PATH=/api/v1
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3001
TRUST_PROXY=false
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
API_KEYS=<set-local-api-key>
JWT_SECRET=<set-long-random-jwt-secret>
MFA_ENCRYPTION_KEY=<set-long-random-mfa-encryption-key>
RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORE=memory
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

Start command:

```bash
npm run dev
```

### Profile 2: Development With Supabase Auth

Use this when testing real Supabase auth behavior locally.

Feature variables:

```env
FEATURE_PROFILE_NAME=development-supabase
FEATURE_AUTH_PROVIDER=supabase
FEATURE_TOKEN_MODE=supabase-jwt
FEATURE_MFA_MODE=supabase-totp
FEATURE_MEDIA_STORAGE=disabled
FEATURE_RECORD_DELETION=archive
```

Required env variables:

```env
NODE_ENV=development
PORT=3000
API_BASE_PATH=/api/v1
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3001
TRUST_PROXY=false
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
API_KEYS=<set-local-api-key>
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_AUTH_AUTO_CONFIRM_EMAIL=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORE=memory
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

Start command:

```bash
npm run dev
```

### Profile 3: Production With Supabase Auth, No Media Storage

Use this when you want production auth hardening without enabling incident uploads through Supabase Storage yet.

Feature variables before build:

```env
FEATURE_PROFILE_NAME=production-supabase-auth
FEATURE_AUTH_PROVIDER=supabase
FEATURE_TOKEN_MODE=supabase-jwt
FEATURE_MFA_MODE=supabase-totp
FEATURE_MEDIA_STORAGE=disabled
FEATURE_RECORD_DELETION=archive
```

Required env variables:

```env
NODE_ENV=production
PORT=3000
API_BASE_PATH=/api/v1
HOST=0.0.0.0
CORS_ORIGIN=https://your-dashboard.example.gov
TRUST_PROXY=true
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
API_KEYS=<set-production-api-key>
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PASSWORD_RESET_DELIVERY_WEBHOOK_URL=https://security.example.gov/password-reset
RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORE=database
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
PUBLIC_CASE_LOOKUP_RATE_LIMIT_ENABLED=true
PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS=600000
PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS=20
INCIDENT_CASE_TOKEN_TTL_DAYS=30
```

Build command:

```bash
npm run build:production
```

Run command:

```bash
npm start
```

### Profile 4: Full Production With Supabase Auth And Media Storage

Use this when the full media pipeline is ready.

Feature variables before build:

```env
FEATURE_PROFILE_NAME=production-supabase-full
FEATURE_AUTH_PROVIDER=supabase
FEATURE_TOKEN_MODE=supabase-jwt
FEATURE_MFA_MODE=supabase-totp
FEATURE_MEDIA_STORAGE=supabase-storage
FEATURE_RECORD_DELETION=archive
```

Additional required env variables:

```env
SUPABASE_STORAGE_ENABLED=true
SUPABASE_STORAGE_BUCKET=incident-media
SUPABASE_STORAGE_ACCESS_MODE=signed
```

Recommended additional variables:

```env
SUPABASE_STORAGE_SIGNED_URL_TTL_SECONDS=900
SUPABASE_STORAGE_SCAN_WEBHOOK_URL=https://security.example.gov/media-scan
SUPABASE_STORAGE_MAX_UPLOAD_BYTES=10485760
SUPABASE_STORAGE_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,video/mp4,application/pdf
SUPABASE_STORAGE_ARCHIVE_ENABLED=true
SUPABASE_STORAGE_ARCHIVE_PREFIX=archive/incidents
```

Build command:

```bash
npm run build:production
```

Run command:

```bash
npm start
```

## 7. Production Build And Run Flow

This is the correct order for a production release.

### Step 1: Put production env vars in the environment

You can load them from:

- a real `.env` file on the server
- PM2 ecosystem env loading
- systemd environment file
- CI/CD secret injection

### Step 2: Build the locked production profile

Run:

```bash
npm ci
npm run build:production
```

This does two things:

1. Writes `src/generated/productionFeatureProfile.ts`
2. Runs TypeScript build to create `dist/`

### Step 3: Start the compiled server

Run:

```bash
npm start
```

That starts:

```bash
node dist/server.js
```

## 8. Do You Run It In A Server Terminal?

Short answer: not as the final production operating model.

### For testing or first boot

Yes, you can run it in a server terminal to verify that:

- environment variables are correct
- startup validation passes
- database connection works
- `GET /api/v1/health` returns `200`

That is fine for manual verification.

### For actual production

Do not rely on a plain interactive terminal session that closes when you disconnect.

Use one of these:

1. PM2
2. systemd
3. Docker or a container platform
4. another supervised process manager

This repo already includes an example PM2 config in `ecosystem.config.example.cjs`.

Recommended production model:

1. SSH into the server only for deployment or diagnostics.
2. Build the app on the server or ship the built artifact.
3. Start or restart the API using PM2 or systemd.
4. Verify health from outside the app process.

## 9. Example Production Command Flow On A Server

If you are deploying directly to a Linux server:

```bash
cd /var/www/xypes-cirs-api
npm ci
npm run build:production
npm start
```

That is acceptable for a first manual test.

For a proper PM2-based run:

```bash
cd /var/www/xypes-cirs-api
npm ci
npm run build:production
pm2 start ecosystem.config.cjs --env production
```

Then verify:

```bash
curl http://127.0.0.1:3000/api/v1/health
```

## 10. Minimum Production Checklist

Before you call the API properly set up in production, confirm these are true:

1. `DATABASE_URL` and `DIRECT_URL` point to the correct production database.
2. `API_KEYS` or `API_KEY` is configured.
3. `PASSWORD_RESET_DELIVERY_WEBHOOK_URL` is configured and uses HTTPS.
4. `PASSWORD_RESET_DELIVERY_MODE` is not set to `api-response` or `console`.
5. `RATE_LIMIT_ENABLED=true`.
6. `PUBLIC_CASE_LOOKUP_RATE_LIMIT_ENABLED=true`.
7. If media storage is enabled, `SUPABASE_STORAGE_ACCESS_MODE=signed`.
8. You built with `npm run build:production` using the intended `FEATURE_*` profile.
9. You are starting `dist/server.js`, not the TypeScript dev server.
10. Health check passes after boot.
11. `CORS_ORIGIN` matches the real dashboard origin for this environment.
12. The paired dashboard deployment is using server-only API keys and same-origin `/api/auth/*` proxy routes rather than exposing backend keys to the browser.

## 11. Commands Summary

### Local development

```bash
npm install
npm run dev
```

### Test database and tests

```bash
npm test
```

### Standard TypeScript build

```bash
npm run build
```

### Production profile build

```bash
npm run build:production
```

### Start compiled server

```bash
npm start
```

## 12. Related Docs

- `docs/feature-profiles-guide.md`
- `docs/production-quick-checklist.md`
- `docs/production-env-templates.md`
- `docs/production-service-runbook.md`
- `docs/production-readiness-checklist.md`
- `docs/supabase-all-setup.md`
- `README.md`
