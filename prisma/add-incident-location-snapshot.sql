-- Additive migration for incident location snapshot fields.
-- Use this on existing databases when moving from a separate `locations` table to inline incident snapshot columns.

BEGIN;

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS latitude numeric(10, 7),
  ADD COLUMN IF NOT EXISTS longitude numeric(10, 7),
  ADD COLUMN IF NOT EXISTS "addressLine1" text,
  ADD COLUMN IF NOT EXISTS "addressLine2" text,
  ADD COLUMN IF NOT EXISTS barangay text,
  ADD COLUMN IF NOT EXISTS "districtName" text,
  ADD COLUMN IF NOT EXISTS "cityName" text,
  ADD COLUMN IF NOT EXISTS "provinceName" text,
  ADD COLUMN IF NOT EXISTS "regionName" text,
  ADD COLUMN IF NOT EXISTS "postalCode" text,
  ADD COLUMN IF NOT EXISTS landmark text;

ALTER TABLE incidents
  DROP COLUMN IF EXISTS "locationId";

DROP TABLE IF EXISTS locations CASCADE;

COMMIT;