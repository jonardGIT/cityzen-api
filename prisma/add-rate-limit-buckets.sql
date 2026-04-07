BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "bucketKey" text NOT NULL UNIQUE,
  count integer NOT NULL,
  "windowStart" timestamptz NOT NULL,
  "expiresAt" timestamptz NOT NULL
);

ALTER TABLE rate_limit_buckets ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE rate_limit_buckets ALTER COLUMN "createdAt" SET DEFAULT NOW();
ALTER TABLE rate_limit_buckets ALTER COLUMN "updatedAt" SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS rate_limit_buckets_expires_at_idx ON rate_limit_buckets ("expiresAt");

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_rate_limit_buckets_updated_at ON rate_limit_buckets;
CREATE TRIGGER set_rate_limit_buckets_updated_at
BEFORE UPDATE ON rate_limit_buckets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;