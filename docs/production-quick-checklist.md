# Production Quick Checklist

Use this as the short copy-paste checklist before you boot the API in production.

## Before Build

1. Confirm the target profile.
2. Confirm `DATABASE_URL` points to the runtime production database.
3. Confirm `DIRECT_URL` points to the direct production database connection for Prisma commands.
4. Confirm `API_KEYS` or `API_KEY` is set.
5. Confirm `PASSWORD_RESET_DELIVERY_WEBHOOK_URL` is set to an `https://` endpoint.
6. Confirm `PASSWORD_RESET_DELIVERY_MODE` is unset or `webhook`.
7. If using Supabase auth, confirm `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are set.
8. If using media storage, confirm `SUPABASE_STORAGE_BUCKET` exists and `SUPABASE_STORAGE_ACCESS_MODE=signed`.
9. Confirm `RATE_LIMIT_ENABLED=true`.
10. Confirm `PUBLIC_CASE_LOOKUP_RATE_LIMIT_ENABLED=true`.

## Before Start

1. Install dependencies with `npm ci`.
2. Build the locked production profile with `npm run build:production`.
3. Confirm `dist/server.js` exists.
4. Confirm the intended feature profile was baked into `src/generated/productionFeatureProfile.ts` during build.

## Start

Preferred production start:

```bash
pm2 start ecosystem.config.cjs --env production
```

Acceptable first manual verification:

```bash
npm start
```

## After Start

1. Check local health:

```bash
curl http://127.0.0.1:3000/api/v1/health
```

2. Check external health from the expected ingress path.
3. Run the remote smoke script if you have staging or production smoke credentials.
4. Review logs for startup validation, database connection, and auth errors.

## Do Not Ship If

Do not proceed if any of these are true:

1. The app is being started with `npm run dev`.
2. `API_KEYS` or `API_KEY` is missing.
3. `PASSWORD_RESET_DELIVERY_MODE=api-response` or `console`.
4. `PASSWORD_RESET_DELIVERY_WEBHOOK_URL` is missing in production.
5. Media storage is enabled but `SUPABASE_STORAGE_ACCESS_MODE` is not `signed`.
6. The feature profile was not built with `npm run build:production`.
