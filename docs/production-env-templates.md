# Production Environment Templates

These are sample production templates for the API.

Do not commit real values.
Replace every placeholder before use.

## How To Use These Templates

1. Pick the production profile you are actually deploying.
2. Copy the matching block into your secure server env file or secret manager.
3. Replace every placeholder.
4. Build with `npm run build:production`.
5. Start the compiled app with PM2, systemd, or `npm start` for a first manual check.

Use these templates with the current dashboard deployment model in mind:

- `CORS_ORIGIN` should be the dashboard origin for the matching environment
- the dashboard owns browser cookies on its own origin through its same-origin `/api/auth/*` proxy
- the API should continue exposing `/api/v1/auth/*` and should not be documented as if it were setting dashboard browser cookies directly
- production dashboard runtime should use checked-in CRUD config, not live `/api/v1/openapi.json`

## Template A: Production Supabase Auth, No Media Storage

Use this when you want Supabase auth in production but do not want Supabase Storage incident uploads yet.

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
API_BASE_PATH=/api/v1
CORS_ORIGIN=https://your-dashboard.example.gov
TRUST_PROXY=true
LOG_LEVEL=info
JSON_BODY_LIMIT=12mb

DATABASE_URL=postgresql://postgres:password@your-runtime-db-host:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20
DIRECT_URL=postgresql://postgres:password@your-direct-db-host:5432/postgres

API_KEYS=replace-with-a-long-random-api-key

RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORE=database
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

PUBLIC_CASE_LOOKUP_RATE_LIMIT_ENABLED=true
PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS=600000
PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS=20
INCIDENT_CASE_TOKEN_TTL_DAYS=30

PASSWORD_RESET_DELIVERY_WEBHOOK_URL=https://security.example.gov/password-reset

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=replace-with-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=replace-with-supabase-service-role-key
SUPABASE_AUTH_AUTO_CONFIRM_EMAIL=false
SUPABASE_PASSWORD_RESET_REDIRECT_URL=https://your-dashboard.example.gov/reset-password

FEATURE_PROFILE_NAME=production-supabase-auth
FEATURE_AUTH_PROVIDER=supabase
FEATURE_TOKEN_MODE=supabase-jwt
FEATURE_MFA_MODE=supabase-totp
FEATURE_MEDIA_STORAGE=disabled
FEATURE_RECORD_DELETION=archive
```

## Template B: Full Production Supabase With Media Storage

Use this when incident media uploads are enabled.

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
API_BASE_PATH=/api/v1
CORS_ORIGIN=https://your-dashboard.example.gov
TRUST_PROXY=true
LOG_LEVEL=info
JSON_BODY_LIMIT=12mb

DATABASE_URL=postgresql://postgres:password@your-runtime-db-host:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20
DIRECT_URL=postgresql://postgres:password@your-direct-db-host:5432/postgres

API_KEYS=replace-with-a-long-random-api-key

RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORE=database
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

PUBLIC_CASE_LOOKUP_RATE_LIMIT_ENABLED=true
PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS=600000
PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS=20
INCIDENT_CASE_TOKEN_TTL_DAYS=30

PASSWORD_RESET_DELIVERY_WEBHOOK_URL=https://security.example.gov/password-reset

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=replace-with-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=replace-with-supabase-service-role-key
SUPABASE_AUTH_AUTO_CONFIRM_EMAIL=false
SUPABASE_PASSWORD_RESET_REDIRECT_URL=https://your-dashboard.example.gov/reset-password

SUPABASE_STORAGE_ENABLED=true
SUPABASE_STORAGE_BUCKET=incident-media
SUPABASE_STORAGE_ACCESS_MODE=signed
SUPABASE_STORAGE_SIGNED_URL_TTL_SECONDS=900
SUPABASE_STORAGE_MAX_UPLOAD_BYTES=10485760
SUPABASE_STORAGE_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,application/pdf
SUPABASE_STORAGE_ARCHIVE_ENABLED=true
SUPABASE_STORAGE_ARCHIVE_PREFIX=archive/incidents
SUPABASE_STORAGE_SCAN_WEBHOOK_URL=https://security.example.gov/media-scan

FEATURE_PROFILE_NAME=production-supabase-full
FEATURE_AUTH_PROVIDER=supabase
FEATURE_TOKEN_MODE=supabase-jwt
FEATURE_MFA_MODE=supabase-totp
FEATURE_MEDIA_STORAGE=supabase-storage
FEATURE_RECORD_DELETION=archive
```

## Template C: Production Local Auth

Use this only if you intentionally want the API to keep issuing its own JWTs in production.

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
API_BASE_PATH=/api/v1
CORS_ORIGIN=https://your-dashboard.example.gov
TRUST_PROXY=true
LOG_LEVEL=info
JSON_BODY_LIMIT=12mb

DATABASE_URL=postgresql://postgres:password@your-runtime-db-host:5432/postgres
DIRECT_URL=postgresql://postgres:password@your-direct-db-host:5432/postgres

API_KEYS=replace-with-a-long-random-api-key
JWT_SECRET=replace-with-a-long-random-jwt-secret
MFA_ENCRYPTION_KEY=replace-with-a-long-random-mfa-secret

RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORE=database
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

PUBLIC_CASE_LOOKUP_RATE_LIMIT_ENABLED=true
PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS=600000
PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS=20
INCIDENT_CASE_TOKEN_TTL_DAYS=30

PASSWORD_RESET_DELIVERY_WEBHOOK_URL=https://security.example.gov/password-reset

FEATURE_PROFILE_NAME=production-local
FEATURE_AUTH_PROVIDER=local
FEATURE_TOKEN_MODE=app-jwt
FEATURE_MFA_MODE=local-totp
FEATURE_MEDIA_STORAGE=disabled
FEATURE_RECORD_DELETION=archive
```

## Variables You Should Not Use Unsafely In Production

Do not use these values or modes in production:

1. Placeholder or short `API_KEYS` values.
2. Placeholder `JWT_SECRET`, `MFA_ENCRYPTION_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` values.
3. `PASSWORD_RESET_DELIVERY_MODE=api-response`.
4. `PASSWORD_RESET_DELIVERY_MODE=console`.
5. `SUPABASE_STORAGE_ACCESS_MODE=public` when media storage is enabled.
