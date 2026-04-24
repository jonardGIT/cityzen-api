# Feature Profiles Guide

This API uses a feature selection system that controls which auth provider, token mode, MFA mode, media storage, and record deletion strategy are active at runtime.

## How It Works

The feature selection system has two modes:

1. **Runtime-env mode** (development): reads `FEATURE_*` environment variables at startup.
2. **Production-build mode** (production): uses a locked profile generated at build time by `npm run build:production`. Runtime environment variables are ignored.

The locked profile lives at `src/generated/productionFeatureProfile.ts` and is regenerated every time you run `npm run build:production`.

## Feature Groups

| Feature         | Environment Variable      | Options                                   | Default (dev) |
| --------------- | ------------------------- | ----------------------------------------- | ------------- |
| Auth provider   | `FEATURE_AUTH_PROVIDER`   | `local`, `supabase`                       | `local`       |
| Token mode      | `FEATURE_TOKEN_MODE`      | `app-jwt`, `supabase-jwt`                 | `app-jwt`     |
| MFA mode        | `FEATURE_MFA_MODE`        | `disabled`, `local-totp`, `supabase-totp` | `local-totp`  |
| Media storage   | `FEATURE_MEDIA_STORAGE`   | `disabled`, `supabase-storage`            | `disabled`    |
| Record deletion | `FEATURE_RECORD_DELETION` | `hard-delete`, `archive`                  | `archive`     |
| Profile name    | `FEATURE_PROFILE_NAME`    | any string                                | `runtime-env` |

## Constraints

Not all combinations are valid. The build and runtime enforce these rules:

- `supabase-jwt` requires `FEATURE_AUTH_PROVIDER=supabase`
- `supabase-totp` requires `FEATURE_TOKEN_MODE=supabase-jwt`
- MFA `disabled` is blocked in production when privileged roles exist

Invalid combinations fail the build or crash at startup.

## Available Profiles

### 1. Development Local (default)

Use this for local development without any Supabase dependency for auth.

```dotenv
FEATURE_PROFILE_NAME=development-local
FEATURE_AUTH_PROVIDER=local
FEATURE_TOKEN_MODE=app-jwt
FEATURE_MFA_MODE=local-totp
```

**What this means:**

- Registration and login use the API's own bcrypt password store
- The API issues its own JWT tokens (signed with `JWT_SECRET`)
- MFA uses locally encrypted TOTP secrets
- Session listing and revocation are available at `/auth/sessions`
- No Supabase Auth dependency at runtime

**When to use:** day-to-day backend development, running tests, working on features that don't involve Supabase integration.

**Required env vars:**

- `DATABASE_URL` (Supabase PostgreSQL or any PostgreSQL)
- `API_KEYS` (any value, e.g. `local-dev-key`)
- `JWT_SECRET` (any string, e.g. `test-only-jwt-secret-change-me`)
- `MFA_ENCRYPTION_KEY` (any string for encrypting TOTP seeds)

**Start command:**

```bash
npm run dev
```

---

### 2. Development with Supabase Auth

Use this to test Supabase auth integration locally.

```dotenv
FEATURE_PROFILE_NAME=development-supabase
FEATURE_AUTH_PROVIDER=supabase
FEATURE_TOKEN_MODE=supabase-jwt
FEATURE_MFA_MODE=supabase-totp
```

**What this means:**

- Registration creates users in Supabase Auth AND the local database
- Login validates credentials against Supabase Auth
- The API returns Supabase access/refresh tokens (not app-signed JWTs)
- MFA uses Supabase's built-in TOTP factors
- Session listing/revocation endpoints are disabled (Supabase manages sessions)

**When to use:** testing Supabase integration before production, verifying email confirmation flows, testing MFA with Supabase.

**Required env vars:**

- `DATABASE_URL` (Supabase PostgreSQL)
- `API_KEYS`
- `SUPABASE_URL` (your Supabase project URL)
- `SUPABASE_ANON_KEY` (from Supabase dashboard)
- `SUPABASE_SERVICE_ROLE_KEY` (from Supabase dashboard)
- `SUPABASE_AUTH_AUTO_CONFIRM_EMAIL` (set `true` for dev, `false` for production)

**Start command:**

```bash
FEATURE_AUTH_PROVIDER=supabase \
FEATURE_TOKEN_MODE=supabase-jwt \
FEATURE_MFA_MODE=supabase-totp \
FEATURE_PROFILE_NAME=development-supabase \
npm run dev
```

Or add these to `.env.development` directly and run `npm run dev`.

---

### 3. Production — Supabase Auth (no media storage)

The recommended production profile when media storage is not yet ready.

```dotenv
FEATURE_PROFILE_NAME=production-supabase-auth
FEATURE_AUTH_PROVIDER=supabase
FEATURE_TOKEN_MODE=supabase-jwt
FEATURE_MFA_MODE=supabase-totp
FEATURE_MEDIA_STORAGE=disabled
FEATURE_RECORD_DELETION=archive
```

**Build command:**

```bash
npm run build:production
```

**Run command:**

```bash
npm start
```

See [supabase-all-setup.md](supabase-all-setup.md) for the complete production deployment checklist.

---

### 4. Production — Full Supabase (with media storage)

The full production profile with all Supabase features enabled.

```dotenv
FEATURE_PROFILE_NAME=production-supabase-full
FEATURE_AUTH_PROVIDER=supabase
FEATURE_TOKEN_MODE=supabase-jwt
FEATURE_MFA_MODE=supabase-totp
FEATURE_MEDIA_STORAGE=supabase-storage
FEATURE_RECORD_DELETION=archive
```

**Additional requirements:**

- `SUPABASE_STORAGE_BUCKET` must exist in Supabase
- `SUPABASE_STORAGE_ACCESS_MODE=signed` (required in production)
- `SUPABASE_STORAGE_SCAN_WEBHOOK_URL` is optional and, when set, must be HTTPS

---

## Switching Profiles in Development

### Method 1: Override in `.env.development`

Edit the `FEATURE_*` lines in `.env.development`:

```dotenv
# Change from local to supabase
FEATURE_AUTH_PROVIDER=supabase
FEATURE_TOKEN_MODE=supabase-jwt
FEATURE_MFA_MODE=supabase-totp
```

Then restart:

```bash
npm run dev
```

### Method 2: Shell environment override

Prefix environment variables before the start command:

```bash
FEATURE_AUTH_PROVIDER=supabase \
FEATURE_TOKEN_MODE=supabase-jwt \
FEATURE_MFA_MODE=supabase-totp \
npm run dev
```

### Method 3: Inline with dotenv-cli

```bash
FEATURE_AUTH_PROVIDER=supabase \
FEATURE_TOKEN_MODE=supabase-jwt \
FEATURE_MFA_MODE=supabase-totp \
npx dotenv -o -e .env.development -- npx tsx src/server.ts
```

## Switching back to local auth

Set in `.env.development`:

```dotenv
FEATURE_AUTH_PROVIDER=local
FEATURE_TOKEN_MODE=app-jwt
FEATURE_MFA_MODE=local-totp
```

Or use shell override:

```bash
FEATURE_AUTH_PROVIDER=local \
FEATURE_TOKEN_MODE=app-jwt \
FEATURE_MFA_MODE=local-totp \
npm run dev
```

## How the Production Build Lock Works

When you run `npm run build:production`:

1. The script reads `FEATURE_*` from the environment, `ecosystem.config.cjs`, or `.env` (in that priority order)
2. Validates all required features are set and combinations are valid
3. Writes the locked profile to `src/generated/productionFeatureProfile.ts`
4. Runs `tsc` to compile TypeScript

At runtime with `NODE_ENV=production`, the app reads the locked profile directly and ignores environment `FEATURE_*` variables. This prevents accidental feature drift in production.

## Verifying the Active Profile

Check which profile is active by looking at startup logs or calling the health endpoint.

You can also inspect the generated profile directly:

```bash
cat src/generated/productionFeatureProfile.ts
```

## Important: Prisma .env Loading

Prisma Client automatically loads the root `.env` file at import time. If your `.env` has production `FEATURE_*` values but `.env.development` does not define them, Prisma will inject the production values into `process.env` during development.

**Always define all `FEATURE_*` variables in `.env.development`** to prevent this. The current `.env.development` already includes these safeguards:

```dotenv
FEATURE_PROFILE_NAME=development-local
FEATURE_AUTH_PROVIDER=local
FEATURE_TOKEN_MODE=app-jwt
FEATURE_MFA_MODE=local-totp
```

## Feature Behavior Differences

| Behavior           | Local Auth                             | Supabase Auth                                     |
| ------------------ | -------------------------------------- | ------------------------------------------------- |
| Password storage   | bcrypt in `users` table                | Supabase Auth                                     |
| Token issuer       | API (JWT_SECRET)                       | Supabase                                          |
| Token format       | Custom JWT                             | Supabase access token                             |
| Refresh tokens     | API-managed sessions                   | Supabase refresh tokens                           |
| Session listing    | `/auth/sessions` available             | Not available                                     |
| Email confirmation | Not required                           | Configurable (`SUPABASE_AUTH_AUTO_CONFIRM_EMAIL`) |
| Password reset     | Token returned in dev, webhook in prod | Supabase email flow                               |
| MFA enrollment     | Local encrypted TOTP                   | Supabase TOTP factors                             |
| MFA challenge      | Verified locally                       | Verified by Supabase (aal2 upgrade)               |
| User creation      | Local only                             | Supabase Auth + local                             |

## Troubleshooting

### "Invalid API key" on auth endpoints

This usually means the Supabase feature flags are active but the Supabase keys are wrong or point to the wrong project. Check:

- `SUPABASE_URL` matches the project that issued `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`
- The keys are not corrupted (decode the JWT payload with `echo '<payload>' | base64 -d` to verify `"role":"service_role"`)

### "Email confirmation is required before signing in"

This is expected when `SUPABASE_AUTH_AUTO_CONFIRM_EMAIL=false`. Either:

- Set it to `true` for development
- Check the email in Supabase dashboard > Authentication > Users and confirm manually

### Build fails with "FEATURE_AUTH_PROVIDER must be set"

The build script cannot find the feature variables. Make sure they are in:

- Shell environment, OR
- `ecosystem.config.cjs` (`env_production`), OR
- `.env` file

### "tokenMode=supabase-jwt requires authProvider=supabase"

You set `FEATURE_TOKEN_MODE=supabase-jwt` without also setting `FEATURE_AUTH_PROVIDER=supabase`. Both must be set together.

### MFA disabled error in production

Production requires MFA for privileged roles. Set `FEATURE_MFA_MODE` to `local-totp` or `supabase-totp`.
