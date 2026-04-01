jest.setTimeout(60000);
jest.retryTimes(3, { logErrorsBeforeRetry: true });

process.env.MFA_ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY ?? 'test-only-mfa-encryption-key';

beforeAll(async () => {
  const { default: prisma } = await import('../lib/prisma.js');

  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS auth_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, "expiresAt" timestamptz NOT NULL, "refreshTokenHash" text NOT NULL DEFAULT \'\', "refreshExpiresAt" timestamptz NOT NULL DEFAULT NOW(), "refreshUsedAt" timestamptz, "revokedAt" timestamptz, "lastUsedAt" timestamptz, "userAgent" text, "ipAddress" text)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS password_reset_tokens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, "tokenHash" text NOT NULL UNIQUE, "expiresAt" timestamptz NOT NULL, "usedAt" timestamptz)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS statuses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), name text NOT NULL)',
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
    'CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW."updatedAt" = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql',
  );
  await prisma.$executeRawUnsafe(
    'DROP TRIGGER IF EXISTS set_auth_sessions_updated_at ON auth_sessions',
  );
  await prisma.$executeRawUnsafe(
    'DROP TRIGGER IF EXISTS set_password_reset_tokens_updated_at ON password_reset_tokens',
  );
  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS set_statuses_updated_at ON statuses');
  await prisma.$executeRawUnsafe(
    'CREATE TRIGGER set_auth_sessions_updated_at BEFORE UPDATE ON auth_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TRIGGER set_password_reset_tokens_updated_at BEFORE UPDATE ON password_reset_tokens FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TRIGGER set_statuses_updated_at BEFORE UPDATE ON statuses FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
  );
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
  await prisma.$executeRawUnsafe('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
  await prisma.$executeRawUnsafe(
    "ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'SUPERVISOR', 'DISPATCHER', 'RESPONDER', 'CITIZEN_REPORTER', 'AUDITOR'))",
  );
});

afterAll(async () => {
  const { default: prisma } = await import('../lib/prisma.js');
  await prisma.$disconnect();
});
