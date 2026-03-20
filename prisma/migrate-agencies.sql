BEGIN;

CREATE TABLE IF NOT EXISTS agencies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

ALTER TABLE responders ADD COLUMN IF NOT EXISTS "agencyId" INTEGER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'responders'
      AND column_name = 'agency'
  ) THEN
    INSERT INTO agencies (name)
    SELECT DISTINCT agency
    FROM responders
    WHERE agency IS NOT NULL
      AND btrim(agency) <> ''
    ON CONFLICT (name) DO NOTHING;

    UPDATE responders responder_row
    SET "agencyId" = agency_row.id
    FROM agencies agency_row
    WHERE responder_row."agencyId" IS NULL
      AND responder_row.agency = agency_row.name;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'responders_agencyId_fkey'
  ) THEN
    ALTER TABLE responders
    ADD CONSTRAINT "responders_agencyId_fkey"
    FOREIGN KEY ("agencyId") REFERENCES agencies(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM responders
    WHERE "agencyId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot finalize agencies migration: one or more responders still have NULL agencyId values';
  END IF;
END $$;

ALTER TABLE responders ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE responders DROP COLUMN IF EXISTS agency;

COMMIT;