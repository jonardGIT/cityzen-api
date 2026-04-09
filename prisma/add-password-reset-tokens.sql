-- Additive migration for one-time password reset token storage.
-- Use this on existing databases that need password reset support without a full schema reset.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "tokenHash" text NOT NULL UNIQUE,
  "expiresAt" timestamptz NOT NULL,
  "usedAt" timestamptz
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
  ON password_reset_tokens ("userId");

CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx
  ON password_reset_tokens ("expiresAt");

CREATE INDEX IF NOT EXISTS password_reset_tokens_used_at_idx
  ON password_reset_tokens ("usedAt");

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_password_reset_tokens_updated_at ON password_reset_tokens;

CREATE TRIGGER set_password_reset_tokens_updated_at
BEFORE UPDATE ON password_reset_tokens
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;