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
  await prisma.$executeRawUnsafe(
    'CREATE TRIGGER set_auth_sessions_updated_at BEFORE UPDATE ON auth_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TRIGGER set_password_reset_tokens_updated_at BEFORE UPDATE ON password_reset_tokens FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "mfaEnabled" boolean NOT NULL DEFAULT false',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "mfaSecretEncrypted" text',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "mfaEnabledAt" timestamptz',
  );
});

afterAll(async () => {
  const { default: prisma } = await import('../lib/prisma.js');
  await prisma.$disconnect();
});
