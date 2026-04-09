-- Additive migration for server-side auth sessions and refresh-token rotation support.
-- This script is idempotent and is intended for existing databases that are being upgraded without a full reset.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "expiresAt" timestamptz NOT NULL,
  "refreshTokenHash" text NOT NULL DEFAULT '',
  "refreshExpiresAt" timestamptz NOT NULL DEFAULT NOW(),
  "refreshUsedAt" timestamptz,
  "revokedAt" timestamptz,
  "lastUsedAt" timestamptz,
  "userAgent" text,
  "ipAddress" text
);

ALTER TABLE auth_sessions
  ADD COLUMN IF NOT EXISTS "refreshTokenHash" text NOT NULL DEFAULT '';

ALTER TABLE auth_sessions
  ADD COLUMN IF NOT EXISTS "refreshExpiresAt" timestamptz NOT NULL DEFAULT NOW();

ALTER TABLE auth_sessions
  ADD COLUMN IF NOT EXISTS "refreshUsedAt" timestamptz;

-- The refresh columns above are added defensively so older deployments can adopt
-- session-backed JWT refresh flows without running the full reset script.

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions ("userId");
CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions ("expiresAt");
CREATE INDEX IF NOT EXISTS auth_sessions_refresh_expires_at_idx ON auth_sessions ("refreshExpiresAt");
CREATE INDEX IF NOT EXISTS auth_sessions_revoked_at_idx ON auth_sessions ("revokedAt");

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_auth_sessions_updated_at ON auth_sessions;
CREATE TRIGGER set_auth_sessions_updated_at
BEFORE UPDATE ON auth_sessions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;