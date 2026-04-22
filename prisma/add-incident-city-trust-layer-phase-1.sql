BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS "publicReference" text;

CREATE UNIQUE INDEX IF NOT EXISTS incidents_public_reference_key
ON incidents ("publicReference")
WHERE "publicReference" IS NOT NULL;

CREATE TABLE IF NOT EXISTS case_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
  "incidentId" uuid NOT NULL,
  "tokenHash" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "revokedAt" timestamptz,
  "lastUsedAt" timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'case_tokens_incident_id_fkey'
  ) THEN
    ALTER TABLE case_tokens
    ADD CONSTRAINT case_tokens_incident_id_fkey
    FOREIGN KEY ("incidentId") REFERENCES incidents(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'case_tokens_token_hash_key'
  ) THEN
    ALTER TABLE case_tokens
    ADD CONSTRAINT case_tokens_token_hash_key UNIQUE ("tokenHash");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'case_tokens_token_hash_sha256_hex_check'
  ) THEN
    ALTER TABLE case_tokens
    ADD CONSTRAINT case_tokens_token_hash_sha256_hex_check
    CHECK (
      char_length("tokenHash") = 64
      AND "tokenHash" ~ '^[0-9a-fA-F]{64}$'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'case_tokens_expiry_sanity_check'
  ) THEN
    ALTER TABLE case_tokens
    ADD CONSTRAINT case_tokens_expiry_sanity_check
    CHECK ("expiresAt" > "createdAt");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS case_tokens_incident_id_idx ON case_tokens ("incidentId");
CREATE INDEX IF NOT EXISTS case_tokens_expires_at_idx ON case_tokens ("expiresAt");
CREATE INDEX IF NOT EXISTS case_tokens_revoked_at_idx ON case_tokens ("revokedAt");

CREATE TABLE IF NOT EXISTS incident_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
  "incidentId" uuid NOT NULL,
  "fromStatusId" uuid,
  "toStatusId" uuid NOT NULL,
  "changedByUserId" uuid,
  note text
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'incident_status_history_incident_id_fkey'
  ) THEN
    ALTER TABLE incident_status_history
    ADD CONSTRAINT incident_status_history_incident_id_fkey
    FOREIGN KEY ("incidentId") REFERENCES incidents(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'incident_status_history_from_status_id_fkey'
  ) THEN
    ALTER TABLE incident_status_history
    ADD CONSTRAINT incident_status_history_from_status_id_fkey
    FOREIGN KEY ("fromStatusId") REFERENCES statuses(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'incident_status_history_to_status_id_fkey'
  ) THEN
    ALTER TABLE incident_status_history
    ADD CONSTRAINT incident_status_history_to_status_id_fkey
    FOREIGN KEY ("toStatusId") REFERENCES statuses(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'incident_status_history_changed_by_user_id_fkey'
  ) THEN
    ALTER TABLE incident_status_history
    ADD CONSTRAINT incident_status_history_changed_by_user_id_fkey
    FOREIGN KEY ("changedByUserId") REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'incident_status_history_change_direction_check'
  ) THEN
    ALTER TABLE incident_status_history
    ADD CONSTRAINT incident_status_history_change_direction_check
    CHECK ("fromStatusId" IS NULL OR "fromStatusId" <> "toStatusId");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS incident_status_history_incident_id_created_at_idx
ON incident_status_history ("incidentId", "createdAt");

CREATE INDEX IF NOT EXISTS incident_status_history_from_status_id_idx
ON incident_status_history ("fromStatusId");

CREATE INDEX IF NOT EXISTS incident_status_history_to_status_id_idx
ON incident_status_history ("toStatusId");

CREATE INDEX IF NOT EXISTS incident_status_history_changed_by_user_id_idx
ON incident_status_history ("changedByUserId");

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_case_tokens_updated_at ON case_tokens;
CREATE TRIGGER set_case_tokens_updated_at
BEFORE UPDATE ON case_tokens
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_incident_status_history_updated_at ON incident_status_history;
CREATE TRIGGER set_incident_status_history_updated_at
BEFORE UPDATE ON incident_status_history
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;