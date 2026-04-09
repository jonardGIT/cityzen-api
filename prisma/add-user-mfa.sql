-- Additive migration for privileged-user MFA columns.
-- Use this on existing databases before enabling local TOTP MFA or production MFA enforcement.

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "mfaEnabled" boolean NOT NULL DEFAULT false;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "mfaSecretEncrypted" text;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "mfaEnabledAt" timestamptz;

COMMIT;