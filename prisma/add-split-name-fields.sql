BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "firstName" text,
  ADD COLUMN IF NOT EXISTS "lastName" text;

ALTER TABLE citizens
  ADD COLUMN IF NOT EXISTS "firstName" text,
  ADD COLUMN IF NOT EXISTS "lastName" text;

COMMIT;