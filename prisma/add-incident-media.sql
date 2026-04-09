-- Additive migration for multi-file incident media support.
-- Use this on existing databases that still rely on the legacy single `incidents.mediaUrl` field.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS incident_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "incidentId" uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  "mediaUrl" text NOT NULL,
  "displayOrder" integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS incident_media_incident_id_idx ON incident_media ("incidentId");
CREATE INDEX IF NOT EXISTS incident_media_incident_id_display_order_idx ON incident_media ("incidentId", "displayOrder");

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_incident_media_updated_at') THEN
    CREATE TRIGGER set_incident_media_updated_at
    BEFORE UPDATE ON incident_media
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

INSERT INTO incident_media ("incidentId", "mediaUrl", "displayOrder")
-- Migrate existing single-file incident references into the new `incident_media` table.
SELECT incidents.id, incidents."mediaUrl", 0
FROM incidents
WHERE incidents."mediaUrl" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM incident_media
    WHERE incident_media."incidentId" = incidents.id
      AND incident_media."displayOrder" = 0
  );

COMMIT;