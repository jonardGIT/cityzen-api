# Supabase Project Setup Guide

Step-by-step guide for creating and configuring a Supabase project to work with this API.

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **New Project**.
3. Choose your organization (or create one).
4. Fill in:
   - **Project name**: e.g. `xypes-cirs-dev` or `xypes-cirs-prod`
   - **Database password**: use a strong password. Save it — you will need it for `DATABASE_URL`.
   - **Region**: pick the closest region to your server (e.g. `ap-northeast-1` for Asia, `us-east-1` for US).
5. Click **Create new project** and wait for provisioning (~2 minutes).

**Important:** Create separate projects for development, staging, and production. Never reuse production credentials in development.

## 2. Collect Your Project Credentials

After the project is created, go to **Project Settings > API** (left sidebar > Settings > API).

You need these values:

| Value             | Where to Find                                                                                           | Env Variable                |
| ----------------- | ------------------------------------------------------------------------------------------------------- | --------------------------- |
| Project URL       | Settings > API > Project URL                                                                            | `SUPABASE_URL`              |
| Anon (public) key | Settings > API > Project API keys > `anon` `public`                                                     | `SUPABASE_ANON_KEY`         |
| Service role key  | Settings > API > Project API keys > `service_role` `secret`                                             | `SUPABASE_SERVICE_ROLE_KEY` |
| Project ref       | The subdomain in your project URL (e.g. `abcdefghijklmnop` from `https://abcdefghijklmnop.supabase.co`) | Used in `DATABASE_URL`      |

**Security warning:** The `service_role` key has full admin access to your project. Never expose it in frontend code or public repositories.

## 3. Get Database Connection Strings

Go to **Project Settings > Database** (left sidebar > Settings > Database).

### Transaction Pooler (for API runtime)

Under **Connection string > Transaction pooler**:

```
postgresql://postgres.[project-ref]:[password]@aws-[region].pooler.supabase.com:6543/postgres
```

Add PgBouncer parameters for the API:

```dotenv
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20
```

### Direct Connection (for Prisma migrations)

Under **Connection string > Direct connection**:

```dotenv
DIRECT_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

### Password Encoding

If your database password contains special characters, URL-encode them:

| Character | Encoded |
| --------- | ------- |
| `$`       | `%24`   |
| `@`       | `%40`   |
| `#`       | `%23`   |
| `!`       | `%21`   |
| `&`       | `%26`   |
| `=`       | `%3D`   |
| space     | `%20`   |

Example: password `My$ecret#1` becomes `My%24ecret%231` in the connection string.

## 4. Enable Email Authentication

Go to **Authentication > Providers** (left sidebar > Authentication > Providers).

1. Ensure **Email** provider is enabled (it is by default).
2. Configure these settings:

### For Development

Go to **Authentication > Settings**:

- **Enable email confirmations**: Turn OFF (so users can sign in immediately)
  - Or set `SUPABASE_AUTH_AUTO_CONFIRM_EMAIL=true` in your API env
- **Minimum password length**: 8 (matches API validation)

### For Production

Go to **Authentication > Settings**:

- **Enable email confirmations**: Turn ON
  - Set `SUPABASE_AUTH_AUTO_CONFIRM_EMAIL=false` in your API env
- **Minimum password length**: 8
- **Enable double confirm changes**: Recommended ON

### Custom SMTP (Production)

By default, Supabase uses its built-in email service (rate-limited to ~3 emails/hour in free tier).

For production, configure custom SMTP under **Authentication > Settings > SMTP Settings**:

1. Toggle **Enable Custom SMTP** ON
2. Fill in:
   - **Sender email**: e.g. `noreply@yourdomain.com`
   - **Sender name**: e.g. `CIRS System`
   - **Host**: your SMTP host (e.g. `smtp.sendgrid.net`, `email-smtp.us-east-1.amazonaws.com`)
   - **Port**: typically `587` (TLS) or `465` (SSL)
   - **Username**: SMTP username
   - **Password**: SMTP password
3. Save and test by creating a user that requires email confirmation.

**Recommended SMTP providers:**

- SendGrid (free tier: 100 emails/day)
- Amazon SES (very cheap, reliable)
- Mailgun
- Postmark

## 5. Configure Email Templates (Optional)

Go to **Authentication > Email Templates**.

Customize these templates:

- **Confirm signup**: Sent when a user registers (if email confirmation is enabled)
- **Reset password**: Sent for password recovery
- **Magic link**: Not used by this API (can leave default)

For password reset, the email template should link to your dashboard's reset page. Set the redirect URL:

```dotenv
SUPABASE_PASSWORD_RESET_REDIRECT_URL=https://your-dashboard.com/reset-password
```

Also configure the redirect URL in Supabase: **Authentication > URL Configuration > Redirect URLs**.

Add your dashboard URL:

```
https://your-dashboard.com/reset-password
```

For development:

```
http://localhost:5173/reset-password
http://localhost:3001/reset-password
```

## 6. Enable MFA (TOTP)

Go to **Authentication > Multi-Factor Authentication**.

1. Toggle **Enable MFA** ON
2. Under **Factors**:
   - Enable **TOTP** (Time-based One-Time Password)
   - Phone-based MFA is optional and not used by this API

This enables the Supabase-side TOTP factor management. The API handles enrollment and verification through its own endpoints:

- `POST /auth/mfa/setup` — generates a TOTP secret and QR code
- `POST /auth/mfa/enable` — verifies the first code and activates MFA
- `POST /auth/mfa/disable` — removes MFA from the account
- `POST /auth/login` with `mfaCode` — upgrades the session to aal2

Users can use any authenticator app:

- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password
- Bitwarden

## 7. Configure Row Level Security (RLS)

The API uses the `service_role` key to bypass RLS for all database operations. This means:

- You do NOT need to create RLS policies for the API tables
- The API handles authorization through its own middleware (role-based access control)

However, if you want defense-in-depth, you can apply the policies from `prisma/add-rls-policies.sql` in the Supabase SQL Editor.

## 8. Set Up Storage Bucket (Optional)

Skip this if `FEATURE_MEDIA_STORAGE=disabled`.

Go to **Storage** (left sidebar > Storage):

1. Click **New Bucket**
2. Name it: `incident-media`
3. Set to **Private** (for signed URL access in production)
4. Click **Create bucket**

Configure in your env:

```dotenv
SUPABASE_STORAGE_ENABLED=true
SUPABASE_STORAGE_BUCKET=incident-media
SUPABASE_STORAGE_ACCESS_MODE=signed
```

### Storage RLS Policies

Create these policies in the SQL Editor for the `incident-media` bucket:

```sql
-- Allow the service role to manage all objects
CREATE POLICY "Service role full access"
ON storage.objects
FOR ALL
USING (bucket_id = 'incident-media')
WITH CHECK (bucket_id = 'incident-media');
```

The API uses the `service_role` key for all storage operations, so minimal policies are needed.

## 9. Apply Database Schema

Connect to your Supabase database and apply the schema.

### Option A: Prisma Push (new database)

```bash
npx dotenv -e .env.development -- npx prisma generate
npx dotenv -e .env.development -- npx prisma db push
```

### Option B: SQL Scripts (existing database or controlled migration)

Run these in the Supabase SQL Editor (**SQL Editor** in left sidebar):

1. `prisma/reset-prisma-schema.sql` (full reset — only for new databases)
2. `prisma/seed-data.sql` (sample data — only for development)

For existing databases, use the additive scripts:

```
prisma/add-timestamps.sql
prisma/add-audit-logs.sql
prisma/add-auth-sessions.sql
prisma/add-password-reset-tokens.sql
prisma/add-rate-limit-buckets.sql
prisma/add-user-mfa.sql
prisma/add-supabase-auth.sql
prisma/add-archived-at.sql
prisma/add-contact-number.sql
prisma/add-incident-location-snapshot.sql
prisma/add-incident-media.sql
prisma/add-rls-policies.sql
```

## 10. Backfill Existing Users to Supabase Auth

If you have existing users in the database from seed data and want to enable Supabase auth:

```bash
npm run supabase:backfill-seed -- --password=Password123!
```

This creates corresponding Supabase Auth users for each local user and stores the `supabaseAuthUserId` link.

For specific users only:

```bash
npm run supabase:backfill-seed -- --password=YourPassword1! --emails=admin@example.com,editor@example.com
```

## 11. Bootstrap Admin User (Production)

For production, never use seed data. Create the first admin with:

```bash
NODE_ENV=production \
ENV_FILE=.env \
npm run bootstrap:admin -- \
  --name="System Admin" \
  --email="admin@yourdomain.com" \
  --password="a-very-strong-password" \
  --role=SYSTEM_ADMIN
```

If Supabase auth is enabled, this also creates the Supabase Auth user.

Important:

- The bootstrap script creates the Supabase Auth account through the Admin API.
- It does not send the "Confirm signup" email automatically.
- If `SUPABASE_AUTH_AUTO_CONFIRM_EMAIL=false`, the user will stay unconfirmed until you either confirm them manually in Supabase Dashboard, or use a separate invite or confirmation-email flow.
- If you want the user to receive Supabase's confirmation email automatically, create the account through the normal registration flow instead of `npm run bootstrap:admin`.

## 12. Verify the Setup

### Health check

```bash
curl http://localhost:3000/api/v1/health
# Expected: {"status":"ok"}
```

### Register a test user

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"name":"Test User","email":"test@example.com","password":"Str0ngP@ss1"}'
```

**With `SUPABASE_AUTH_AUTO_CONFIRM_EMAIL=true`** (development):

- Returns a token immediately
- User can sign in right away

**With `SUPABASE_AUTH_AUTO_CONFIRM_EMAIL=false`** (production):

- Returns `{"message":"Registration succeeded. Confirm your email before signing in.","emailConfirmationRequired":true}`
- User must click the confirmation link in their email
- You can manually confirm in Supabase dashboard: Authentication > Users > click user > Confirm email

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"email":"test@example.com","password":"Str0ngP@ss1"}'
```

### Check profile

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <token-from-login>" \
  -H "x-api-key: <your-api-key>"
```

## 13. Managing Users in Supabase Dashboard

Go to **Authentication > Users** to:

- View all registered users
- Manually confirm email addresses
- Delete users (this only removes them from Supabase Auth, not the API database)
- See last sign-in timestamps
- Check MFA enrollment status

**Important:** Deleting a user in the Supabase dashboard does NOT remove them from the API's `users` table. The API will show errors when that user tries to log in. To properly remove a user, use the API's delete endpoint.

## 14. Supabase Free Tier Limits

Be aware of these limits on the free tier:

| Resource             | Free Tier Limit         |
| -------------------- | ----------------------- |
| Database size        | 500 MB                  |
| Storage              | 1 GB                    |
| Bandwidth            | 2 GB                    |
| Edge functions       | 500K invocations        |
| Auth emails          | ~3/hour (built-in SMTP) |
| Realtime connections | 200 concurrent          |
| API requests         | No hard limit           |

For production, upgrade to at least the Pro plan ($25/month) for:

- 8 GB database
- 100 GB storage
- Custom SMTP (unlimited emails)
- Daily backups
- No pausing after inactivity

## 15. Environment Variable Quick Reference

### Minimum for local development (Supabase auth)

```dotenv
DATABASE_URL=postgresql://postgres.[ref]:[pass]@aws-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20
DIRECT_URL=postgresql://postgres:[pass]@db.[ref].supabase.co:5432/postgres
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_ANON_KEY=<from-dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from-dashboard>
SUPABASE_AUTH_AUTO_CONFIRM_EMAIL=true
API_KEYS=local-dev-key
FEATURE_AUTH_PROVIDER=supabase
FEATURE_TOKEN_MODE=supabase-jwt
FEATURE_MFA_MODE=supabase-totp
```

### Minimum for production

```dotenv
DATABASE_URL=<pooled-connection-string>
DIRECT_URL=<direct-connection-string>
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_ANON_KEY=<from-dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from-dashboard>
SUPABASE_AUTH_AUTO_CONFIRM_EMAIL=false
SUPABASE_AUTH_ENABLED=true
SUPABASE_JWT_ENABLED=true
SUPABASE_TOTP_ENABLED=true
API_KEYS=<long-random-key>
PASSWORD_RESET_DELIVERY_WEBHOOK_URL=https://<your-webhook>
FEATURE_AUTH_PROVIDER=supabase
FEATURE_TOKEN_MODE=supabase-jwt
FEATURE_MFA_MODE=supabase-totp
FEATURE_MEDIA_STORAGE=disabled
FEATURE_RECORD_DELETION=archive
MFA_ENCRYPTION_KEY=<strong-random-secret>
```

## Troubleshooting

### "Invalid API key" from Supabase

- The `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY` does not match your `SUPABASE_URL` project
- Decode the JWT to verify: `echo '<middle-part-of-jwt>' | base64 -d`
- The `ref` in the decoded payload should match your project ref

### Database connection refused

- Check that the password in `DATABASE_URL` is URL-encoded
- Verify the region in the connection string matches your project
- For IPv4-only servers, you may need the Supabase IPv4 add-on

### Email confirmation not sending

- Free tier is limited to ~3 emails/hour
- Configure custom SMTP for production (see step 4)
- Check **Authentication > Logs** in Supabase dashboard for delivery errors
- `npm run bootstrap:admin` does not send a signup confirmation email; it only creates the user account
- When `SUPABASE_AUTH_AUTO_CONFIRM_EMAIL=false`, bootstrap-created users must be confirmed manually or created through a separate invite or registration flow

### User exists in Supabase but can't log in via API

- The user may not have a corresponding row in the API's `users` table
- Run the backfill script or bootstrap the user through the API's register endpoint

### MFA not working

- Verify MFA is enabled in Supabase dashboard (Authentication > Multi-Factor Authentication)
- Make sure `FEATURE_MFA_MODE=supabase-totp` is set
- The user must complete `/auth/mfa/setup` and `/auth/mfa/enable` before MFA challenges work
