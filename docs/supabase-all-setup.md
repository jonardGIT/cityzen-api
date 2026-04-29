# Supabase All-Features Setup

This guide is for running the API with the full Supabase-backed feature set:

- `FEATURE_AUTH_PROVIDER=supabase`
- `FEATURE_TOKEN_MODE=supabase-jwt`
- `FEATURE_MFA_MODE=supabase-totp`
- `FEATURE_MEDIA_STORAGE=supabase-storage`
- `FEATURE_RECORD_DELETION=archive`

In this mode:

- Supabase Auth is the identity provider.
- API bearer authentication uses Supabase access tokens.
- MFA uses Supabase TOTP.
- Incident media uses Supabase Storage.
- Records are archived instead of hard-deleted.

## 1. Create and prepare the Supabase project

Create a dedicated Supabase project for the environment you want to use.

Collect these values from Supabase:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- pooled Postgres connection string for `DATABASE_URL`
- direct Postgres connection string for `DIRECT_URL`

Use a separate Supabase project or branch for:

- local development
- staging
- production

Do not reuse production credentials in development.

## 2. Configure the database

Point the API at the Supabase Postgres database.

Required variables:

```dotenv
DATABASE_URL=postgresql://postgres.<project-ref>:<url-encoded-password>@aws-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20&sslmode=require
DIRECT_URL=postgresql://postgres.<project-ref>:<url-encoded-password>@aws-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

Use `DATABASE_URL` for the running API and `DIRECT_URL` for Prisma schema and migration operations.

For droplets and other servers, prefer the Supabase pooler host for both values. Keep `DATABASE_URL` on port `6543` and use the same pooler host on port `5432` for `DIRECT_URL`.

Make sure the database password is URL-encoded before placing it into either value. For example, `$` becomes `%24`, `@` becomes `%40`, and `#` becomes `%23`.

If your production server is IPv4-only and you plan to use the direct database host instead of the pooler, make sure the Supabase project has IPv4 support enabled for that database path. In practice this may require purchasing and enabling the Supabase IPv4 add-on for the project before production rollout.

If you do not have IPv4 enabled on the direct database endpoint yet, keep Prisma schema commands on the pooler host at port `5432` and keep runtime traffic on the pooler host at port `6543`.

Apply the schema and SQL migrations before enabling traffic.

Typical sequence:

```bash
npx prisma generate
npx prisma db push
```

Use `npx prisma db push` only for a new or disposable database where destructive schema changes are acceptable.

If Supabase already contains real data, Prisma may stop and warn about dropped columns, dropped tables, or new constraints. In that case, do not force `db push` blindly. Review the diff first and apply the required SQL changes in a controlled order.

If your rollout depends on the SQL files in `prisma/`, apply those as well in the correct order for your target environment.

## 3. Configure Supabase Auth

For step-by-step Supabase dashboard setup (creating the project, finding keys, enabling email auth, MFA, SMTP, email templates), see [supabase-project-setup.md](supabase-project-setup.md).

In Supabase Auth settings, configure:

- email sign-in enabled
- redirect URL for password reset
- MFA support enabled
- any production SMTP or delivery integration needed on the Supabase side

API env:

```dotenv
SUPABASE_AUTH_ENABLED=true
SUPABASE_JWT_ENABLED=true
SUPABASE_TOTP_ENABLED=true

SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<set-supabase-service-role-key>
SUPABASE_AUTH_AUTO_CONFIRM_EMAIL=false
SUPABASE_PASSWORD_RESET_REDIRECT_URL=https://<dashboard-host>/reset-password
```

Notes:

- `SUPABASE_JWT_ENABLED=true` requires `SUPABASE_AUTH_ENABLED=true`.
- `SUPABASE_TOTP_ENABLED=true` requires `SUPABASE_JWT_ENABLED=true`.
- In pure Supabase JWT mode, `JWT_SECRET` is not required.
- In the current CIRS dashboard workspace, local dashboard testing uses `http://localhost:3001/reset-password`.

## 4. Configure Supabase Storage

Create the storage bucket used by the API.

Recommended bucket name:

```dotenv
SUPABASE_STORAGE_BUCKET=incident-media
```

Required storage env:

```dotenv
SUPABASE_STORAGE_ENABLED=true
SUPABASE_STORAGE_BUCKET=incident-media
SUPABASE_STORAGE_ACCESS_MODE=signed
SUPABASE_STORAGE_SIGNED_URL_TTL_SECONDS=900
# Optional: enable fail-closed scan callback integration when available
# SUPABASE_STORAGE_SCAN_WEBHOOK_URL=https://security.example.com/media-scan
SUPABASE_STORAGE_MAX_UPLOAD_BYTES=10485760
SUPABASE_STORAGE_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,application/pdf
SUPABASE_STORAGE_ARCHIVE_ENABLED=true
SUPABASE_STORAGE_ARCHIVE_PREFIX=archive/incidents
```

Production requirement:

- `SUPABASE_STORAGE_ACCESS_MODE` must be `signed`
- `SUPABASE_STORAGE_SCAN_WEBHOOK_URL`, when configured, must use HTTPS

## 5. Configure API feature flags

For an overview of all available profiles and how to switch between them, see [feature-profiles-guide.md](feature-profiles-guide.md).

For the full Supabase path, set:

```dotenv
FEATURE_PROFILE_NAME=production-supabase
FEATURE_AUTH_PROVIDER=supabase
FEATURE_TOKEN_MODE=supabase-jwt
FEATURE_MFA_MODE=supabase-totp
FEATURE_MEDIA_STORAGE=supabase-storage
FEATURE_RECORD_DELETION=archive
```

These feature flags are locked into the production build.

### Where to put the feature flags

The `FEATURE_*` values must exist in the environment at build time when you run `npm run build:production`.

The production build script now auto-loads `ecosystem.config.cjs` first when it exists, and falls back to `.env` when it does not.

That means either of these works:

- place the `FEATURE_*` values in PM2 `env_production` inside `ecosystem.config.cjs`
- place the `FEATURE_*` values in `.env`

Shell-exported values still win over either file because the build only fills missing env values.

Use one of these approaches:

#### Option A. Export them in the shell before building

```bash
export NODE_ENV=production
export FEATURE_PROFILE_NAME=production-supabase
export FEATURE_AUTH_PROVIDER=supabase
export FEATURE_TOKEN_MODE=supabase-jwt
export FEATURE_MFA_MODE=supabase-totp
export FEATURE_MEDIA_STORAGE=supabase-storage
export FEATURE_RECORD_DELETION=archive

npm run build:production
```

For the reduced no-storage rollout:

```bash
export NODE_ENV=production
export FEATURE_PROFILE_NAME=production-supabase-auth
export FEATURE_AUTH_PROVIDER=supabase
export FEATURE_TOKEN_MODE=supabase-jwt
export FEATURE_MFA_MODE=supabase-totp
export FEATURE_MEDIA_STORAGE=disabled
export FEATURE_RECORD_DELETION=archive

npm run build:production
```

#### Option B. Put them in `.env` and build directly

Example `.env` values:

```dotenv
NODE_ENV=production
FEATURE_PROFILE_NAME=production-supabase-auth
FEATURE_AUTH_PROVIDER=supabase
FEATURE_TOKEN_MODE=supabase-jwt
FEATURE_MFA_MODE=supabase-totp
FEATURE_MEDIA_STORAGE=disabled
FEATURE_RECORD_DELETION=archive
```

Then build directly:

```bash
npm run build:production
```

#### Option C. Put them in PM2 `ecosystem.config.cjs`

Example:

```js
module.exports = {
  apps: [
    {
      name: 'xypes-cirs-api',
      env_production: {
        NODE_ENV: 'production',
        FEATURE_PROFILE_NAME: 'production-supabase-auth',
        FEATURE_AUTH_PROVIDER: 'supabase',
        FEATURE_TOKEN_MODE: 'supabase-jwt',
        FEATURE_MFA_MODE: 'supabase-totp',
        FEATURE_MEDIA_STORAGE: 'disabled',
        FEATURE_RECORD_DELETION: 'archive',
      },
    },
  ],
};
```

Then build directly:

```bash
npm run build:production
```

#### Option D. Use an inline one-line build command

```bash
NODE_ENV=production \
FEATURE_PROFILE_NAME=production-supabase-auth \
FEATURE_AUTH_PROVIDER=supabase \
FEATURE_TOKEN_MODE=supabase-jwt \
FEATURE_MFA_MODE=supabase-totp \
FEATURE_MEDIA_STORAGE=disabled \
FEATURE_RECORD_DELETION=archive \
npm run build:production
```

#### How to verify before building

Run this first:

```bash
echo "$FEATURE_AUTH_PROVIDER"
echo "$FEATURE_TOKEN_MODE"
echo "$FEATURE_MFA_MODE"
echo "$FEATURE_MEDIA_STORAGE"
echo "$FEATURE_RECORD_DELETION"
```

If any of those print nothing and they are also missing from both `ecosystem.config.cjs` and `.env`, `npm run build:production` will fail.

## 6. Configure required non-Supabase API env

Even with all Supabase-backed features enabled, the API still needs these operational settings:

```dotenv
NODE_ENV=production
PORT=3000
API_BASE_PATH=/api/v1
CORS_ORIGIN=https://<dashboard-host>
TRUST_PROXY=true

API_KEYS=<set-production-api-key>
PASSWORD_RESET_DELIVERY_WEBHOOK_URL=https://security.example.com/password-reset
SECURITY_ALERT_WEBHOOK_URL=https://security.example.com/alerts
ARCHIVE_RECORDS_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
JSON_BODY_LIMIT=12mb
```

Notes:

- `API_KEYS` is separate from Supabase JWT. It powers the API key middleware.
- `PASSWORD_RESET_DELIVERY_WEBHOOK_URL` is required in production and must use HTTPS.
- `SECURITY_ALERT_WEBHOOK_URL` is optional, but if set it must use HTTPS.

If you do not have all webhook integrations yet:

- You may leave `SECURITY_ALERT_WEBHOOK_URL` unset.
- You may not leave `PASSWORD_RESET_DELIVERY_WEBHOOK_URL` unset in production.
- If password reset delivery is not ready yet, do not treat the deployment as production-ready.

For a reduced production rollout without Supabase storage, use:

```dotenv
FEATURE_PROFILE_NAME=production-supabase-auth
FEATURE_AUTH_PROVIDER=supabase
FEATURE_TOKEN_MODE=supabase-jwt
FEATURE_MFA_MODE=supabase-totp
FEATURE_MEDIA_STORAGE=disabled
FEATURE_RECORD_DELETION=archive

SUPABASE_STORAGE_ENABLED=false
```

## 7. Production `.env` template for full Supabase mode

Use this when building and running a pure Supabase JWT production deployment:

```dotenv
NODE_ENV=production
PORT=3000
API_BASE_PATH=/api/v1
LOG_LEVEL=info
CORS_ORIGIN=https://<dashboard-host>
TRUST_PROXY=true

FEATURE_PROFILE_NAME=production-supabase
FEATURE_AUTH_PROVIDER=supabase
FEATURE_TOKEN_MODE=supabase-jwt
FEATURE_MFA_MODE=supabase-totp
FEATURE_MEDIA_STORAGE=supabase-storage
FEATURE_RECORD_DELETION=archive

DATABASE_URL=postgresql://postgres:<password>@aws-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20
DIRECT_URL=postgresql://postgres.<project-ref>:<url-encoded-password>@aws-<region>.pooler.supabase.com:5432/postgres?sslmode=require

SUPABASE_AUTH_ENABLED=true
SUPABASE_JWT_ENABLED=true
SUPABASE_TOTP_ENABLED=true
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<set-supabase-service-role-key>
SUPABASE_AUTH_AUTO_CONFIRM_EMAIL=false
SUPABASE_PASSWORD_RESET_REDIRECT_URL=https://<dashboard-host>/reset-password

SUPABASE_STORAGE_ENABLED=true
SUPABASE_STORAGE_BUCKET=incident-media
SUPABASE_STORAGE_ACCESS_MODE=signed
SUPABASE_STORAGE_SIGNED_URL_TTL_SECONDS=900
# Optional: enable fail-closed scan callback integration when available
# SUPABASE_STORAGE_SCAN_WEBHOOK_URL=https://security.example.com/media-scan
SUPABASE_STORAGE_MAX_UPLOAD_BYTES=10485760
SUPABASE_STORAGE_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,application/pdf
SUPABASE_STORAGE_ARCHIVE_ENABLED=true
SUPABASE_STORAGE_ARCHIVE_PREFIX=archive/incidents

API_KEYS=<set-production-api-key>

For the current dashboard deployment model, the browser reaches these backend auth flows through the dashboard's same-origin `/api/auth/*` proxy, while the API continues serving its own `/api/v1/auth/*` routes.
ARCHIVE_RECORDS_ENABLED=true
PASSWORD_RESET_DELIVERY_WEBHOOK_URL=https://security.example.com/password-reset
SECURITY_ALERT_WEBHOOK_URL=https://security.example.com/alerts

RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
JSON_BODY_LIMIT=12mb
```

`JWT_SECRET` is intentionally omitted from this template because the deployment uses `FEATURE_TOKEN_MODE=supabase-jwt`.

## 8. Build and deploy

Build the locked production profile:

```bash
npm run build:production
```

If you get an error like `FEATURE_AUTH_PROVIDER must be set`, it means the value was missing from the shell environment, from `ecosystem.config.cjs`, and from the project `.env` file.

Start the API:

```bash
npm start
```

The production build writes the locked feature profile into `src/generated/productionFeatureProfile.ts`.

### PM2 deployment without `.env`

If you prefer PM2-managed environment variables on the droplet instead of a `.env` file, copy `ecosystem.config.example.cjs` to `ecosystem.config.cjs` on the server and fill in the real production values there.

The deploy workflow is set up to:

- require `ecosystem.config.cjs` on the droplet
- load build-time `FEATURE_*` values from that PM2 config
- run `npm run build:production`
- restart PM2 with `pm2 startOrRestart ecosystem.config.cjs --env production`

Keep `ecosystem.config.cjs` out of git because it contains live secrets. Only commit the example file.

### Bootstrap the first admin safely

Do not run `prisma/seed-data.sql` on a production or production-like database. That seed truncates core tables and loads demo records.

Instead, create the first admin with the bootstrap script:

```bash
NODE_ENV=production \
ENV_FILE=.env \
npm run bootstrap:admin -- \
  --name="System Admin" \
  --email="admin@example.com" \
  --password="replace-with-a-strong-password" \
  --role=SYSTEM_ADMIN
```

If `FEATURE_AUTH_PROVIDER=supabase`, the script creates the Supabase Auth user and the local `users` row together. If the local row already exists, it promotes or updates that row without truncating any data.

## 9. Dashboard setup

If the dashboard talks to this API, make sure it is configured with:

- the correct production API base URL
- the correct production API key for `x-api-key`
- any Supabase frontend config it directly uses

Minimum dashboard checks:

- login succeeds
- bearer token is stored and reused
- `/auth/me` works
- capability and protected resource fetches include the API key
- MFA enrollment and challenge flow work end-to-end
- media upload and media fetch work against signed URLs

## 10. Recommended rollout order

1. Create a staging Supabase project or branch.
2. Apply database schema and SQL changes there first.
3. Enable the full Supabase feature flags in staging.
4. Validate login, refresh, MFA, password reset, media upload, and media access.
5. Configure the dashboard against staging and retest end-to-end.
6. Promote the same env shape to production.
7. Build the production artifact with `npm run build:production`.

## 11. Common failure cases

- `SUPABASE_AUTH_ENABLED must be true when SUPABASE_JWT_ENABLED=true`
- `SUPABASE_JWT_ENABLED must be true when SUPABASE_TOTP_ENABLED=true`
- `SUPABASE_SERVICE_ROLE_KEY` missing or too weak
- `SUPABASE_STORAGE_ACCESS_MODE` not set to `signed`
- `SUPABASE_STORAGE_SCAN_WEBHOOK_URL` missing or not HTTPS
- `PASSWORD_RESET_DELIVERY_WEBHOOK_URL` missing or not HTTPS
- dashboard sends bearer token but not `x-api-key`
- production build is still locked to an older feature profile

## 12. When integrations are not ready yet

If you are still waiting on webhook integrations, use this decision rule:

- No `SUPABASE_STORAGE_SCAN_WEBHOOK_URL` yet: disable Supabase storage in production.
- No `SECURITY_ALERT_WEBHOOK_URL` yet: leave it unset and continue.
- No `PASSWORD_RESET_DELIVERY_WEBHOOK_URL` yet: production startup will fail, so either delay production rollout or stand up a temporary HTTPS webhook receiver first.
