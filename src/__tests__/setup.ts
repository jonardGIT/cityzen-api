jest.setTimeout(60000);
jest.retryTimes(3, { logErrorsBeforeRetry: true });

process.env.MFA_ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY ?? 'test-only-mfa-encryption-key';

beforeAll(async () => {
  const { default: prisma } = await import('../lib/prisma.js');

  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), name text NOT NULL, email text NOT NULL UNIQUE, "passwordHash" text NOT NULL, role text NOT NULL DEFAULT 'CITIZEN_REPORTER')`,
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS auth_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, "expiresAt" timestamptz NOT NULL, "refreshTokenHash" text NOT NULL DEFAULT \'\', "refreshExpiresAt" timestamptz NOT NULL DEFAULT NOW(), "refreshUsedAt" timestamptz, "revokedAt" timestamptz, "lastUsedAt" timestamptz, "userAgent" text, "ipAddress" text)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS password_reset_tokens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, "tokenHash" text NOT NULL UNIQUE, "expiresAt" timestamptz NOT NULL, "usedAt" timestamptz)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS rate_limit_buckets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "bucketKey" text NOT NULL UNIQUE, count integer NOT NULL, "windowStart" timestamptz NOT NULL, "expiresAt" timestamptz NOT NULL)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS statuses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), name text NOT NULL)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS citizens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), name text NOT NULL, "contactInfo" text NOT NULL, "preferredChannel" text NOT NULL)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS agencies (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), name text NOT NULL, "contactNumber" text)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS responders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), name text NOT NULL, "agencyId" uuid NOT NULL REFERENCES agencies(id), role text NOT NULL, "contactInfo" text NOT NULL)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), name text NOT NULL, "subCategory" text)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS severities (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), level text NOT NULL UNIQUE, definition text)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS incidents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), description text NOT NULL, "mediaUrl" text, "dateReported" timestamptz NOT NULL DEFAULT NOW(), latitude numeric(10, 7), longitude numeric(10, 7), "addressLine1" text, "addressLine2" text, barangay text, "districtName" text, "cityName" text, "provinceName" text, "regionName" text, "postalCode" text, landmark text, "statusId" uuid NOT NULL REFERENCES statuses(id), "citizenId" uuid NOT NULL REFERENCES citizens(id), "categoryId" uuid NOT NULL REFERENCES categories(id), "severityId" uuid NOT NULL REFERENCES severities(id))',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS incident_media (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "incidentId" uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, "mediaUrl" text NOT NULL, "displayOrder" integer NOT NULL DEFAULT 0)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS assignments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "incidentId" uuid NOT NULL REFERENCES incidents(id), "responderId" uuid NOT NULL REFERENCES responders(id), "assignedDate" timestamptz NOT NULL DEFAULT NOW(), "responseStart" timestamptz, "responseEnd" timestamptz, outcome text, notes text)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), timestamp timestamptz NOT NULL DEFAULT NOW(), action text NOT NULL, summary text NOT NULL, outcome text NOT NULL, "actorUserId" uuid, "actorEmail" text, "actorRole" text, resource text NOT NULL, method text NOT NULL, path text NOT NULL, "statusCode" integer, "targetId" text, "ipAddress" text, "userAgent" text, "requestId" text, metadata jsonb)',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS latitude numeric(10, 7)',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS longitude numeric(10, 7)',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "addressLine1" text',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "addressLine2" text',
  );
  await prisma.$executeRawUnsafe('ALTER TABLE incidents ADD COLUMN IF NOT EXISTS barangay text');
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "districtName" text',
  );
  await prisma.$executeRawUnsafe('ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "cityName" text');
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "provinceName" text',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "regionName" text',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "postalCode" text',
  );
  await prisma.$executeRawUnsafe('ALTER TABLE incidents ADD COLUMN IF NOT EXISTS landmark text');
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE citizens ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE agencies ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE responders ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE statuses ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE categories ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE severities ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE assignments ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS "refreshTokenHash" text NOT NULL DEFAULT \'\'',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS "refreshExpiresAt" timestamptz NOT NULL DEFAULT NOW()',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS "refreshUsedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions ("userId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS incident_media_incident_id_idx ON incident_media ("incidentId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS incident_media_incident_id_display_order_idx ON incident_media ("incidentId", "displayOrder")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS users_archived_at_idx ON users ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS citizens_archived_at_idx ON citizens ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS agencies_archived_at_idx ON agencies ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS responders_archived_at_idx ON responders ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS statuses_archived_at_idx ON statuses ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS categories_archived_at_idx ON categories ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS severities_archived_at_idx ON severities ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS incidents_archived_at_idx ON incidents ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS assignments_archived_at_idx ON assignments ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions ("expiresAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS auth_sessions_refresh_expires_at_idx ON auth_sessions ("refreshExpiresAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS auth_sessions_revoked_at_idx ON auth_sessions ("revokedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens ("userId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx ON password_reset_tokens ("expiresAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS password_reset_tokens_used_at_idx ON password_reset_tokens ("usedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS rate_limit_buckets_expires_at_idx ON rate_limit_buckets ("expiresAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW."updatedAt" = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql',
  );
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_auth_sessions_updated_at') THEN
        CREATE TRIGGER set_auth_sessions_updated_at
        BEFORE UPDATE ON auth_sessions
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_password_reset_tokens_updated_at') THEN
        CREATE TRIGGER set_password_reset_tokens_updated_at
        BEFORE UPDATE ON password_reset_tokens
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_rate_limit_buckets_updated_at') THEN
        CREATE TRIGGER set_rate_limit_buckets_updated_at
        BEFORE UPDATE ON rate_limit_buckets
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_statuses_updated_at') THEN
        CREATE TRIGGER set_statuses_updated_at
        BEFORE UPDATE ON statuses
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_citizens_updated_at') THEN
        CREATE TRIGGER set_citizens_updated_at
        BEFORE UPDATE ON citizens
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_agencies_updated_at') THEN
        CREATE TRIGGER set_agencies_updated_at
        BEFORE UPDATE ON agencies
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_responders_updated_at') THEN
        CREATE TRIGGER set_responders_updated_at
        BEFORE UPDATE ON responders
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_categories_updated_at') THEN
        CREATE TRIGGER set_categories_updated_at
        BEFORE UPDATE ON categories
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_severities_updated_at') THEN
        CREATE TRIGGER set_severities_updated_at
        BEFORE UPDATE ON severities
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_incidents_updated_at') THEN
        CREATE TRIGGER set_incidents_updated_at
        BEFORE UPDATE ON incidents
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_incident_media_updated_at') THEN
        CREATE TRIGGER set_incident_media_updated_at
        BEFORE UPDATE ON incident_media
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_assignments_updated_at') THEN
        CREATE TRIGGER set_assignments_updated_at
        BEFORE UPDATE ON assignments
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_audit_logs_updated_at') THEN
        CREATE TRIGGER set_audit_logs_updated_at
        BEFORE UPDATE ON audit_logs
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;
    END
    $$;
  `);
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "mfaEnabled" boolean NOT NULL DEFAULT false',
  );
  await prisma.$executeRawUnsafe('ALTER TABLE users ALTER COLUMN "passwordHash" DROP NOT NULL');
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "supabaseAuthUserId" uuid',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS users_supabase_auth_user_id_idx ON users ("supabaseAuthUserId") WHERE "supabaseAuthUserId" IS NOT NULL',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "mfaSecretEncrypted" text',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "mfaEnabledAt" timestamptz',
  );
  await prisma.$executeRawUnsafe('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
  await prisma.$executeRawUnsafe(
    "ALTER TABLE users ALTER COLUMN role SET DEFAULT 'CITIZEN_REPORTER'",
  );
  await prisma.$executeRawUnsafe(
    `UPDATE users
     SET role = CASE
       WHEN LOWER(role) IN ('super_admin', 'system_admin', 'admin') THEN 'SYSTEM_ADMIN'
       WHEN LOWER(role) IN ('department_manager', 'manager') THEN 'DEPARTMENT_MANAGER'
       WHEN LOWER(role) = 'editor' THEN 'DISPATCHER'
       WHEN LOWER(role) = 'supervisor' THEN 'SUPERVISOR'
       WHEN LOWER(role) = 'dispatcher' THEN 'DISPATCHER'
       WHEN LOWER(role) = 'responder' THEN 'RESPONDER'
       WHEN LOWER(role) = 'auditor' THEN 'AUDITOR'
       WHEN LOWER(role) IN ('viewer', 'citizen', 'citizen_reporter', 'reporter') THEN 'CITIZEN_REPORTER'
       ELSE 'CITIZEN_REPORTER'
     END`,
  );
  await prisma.$executeRawUnsafe(
    `UPDATE users
     SET role = CASE
       WHEN LOWER(email) = 'admin@xypes.local' THEN 'SYSTEM_ADMIN'
       WHEN LOWER(email) = 'ops.lead@xypes.local' THEN 'DEPARTMENT_MANAGER'
       WHEN LOWER(email) = 'dispatcher@xypes.local' THEN 'DISPATCHER'
       WHEN LOWER(email) = 'analyst@xypes.local' THEN 'CITIZEN_REPORTER'
       WHEN LOWER(email) = 'supervisor@xypes.local' THEN 'SUPERVISOR'
       WHEN LOWER(email) = 'responder@xypes.local' THEN 'RESPONDER'
       WHEN LOWER(email) = 'auditor@xypes.local' THEN 'AUDITOR'
       ELSE role
     END`,
  );
  await prisma.$executeRawUnsafe(
    'UPDATE users SET "mfaEnabled" = false, "mfaSecretEncrypted" = NULL, "mfaEnabledAt" = NULL',
  );
  await prisma.$executeRawUnsafe(
    `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1
         FROM pg_constraint
         WHERE conname = 'users_role_check'
           AND conrelid = 'users'::regclass
       ) THEN
         ALTER TABLE users
         ADD CONSTRAINT users_role_check CHECK (
           role IN (
             'SYSTEM_ADMIN',
             'DEPARTMENT_MANAGER',
             'SUPERVISOR',
             'DISPATCHER',
             'RESPONDER',
             'CITIZEN_REPORTER',
             'AUDITOR'
           )
         );
       END IF;
     END $$`,
  );
  await prisma.$executeRawUnsafe(
    "INSERT INTO statuses (name) SELECT 'Reported' WHERE NOT EXISTS (SELECT 1 FROM statuses WHERE name = 'Reported')",
  );
  await prisma.$executeRawUnsafe(
    "INSERT INTO statuses (name) SELECT 'In Progress' WHERE NOT EXISTS (SELECT 1 FROM statuses WHERE name = 'In Progress')",
  );
});

afterAll(async () => {
  const { default: prisma } = await import('../lib/prisma.js');
  await prisma.$disconnect();
});
