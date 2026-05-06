ALTER TABLE citizens ADD COLUMN IF NOT EXISTS "addressLine1" text;
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS "addressLine2" text;
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS "cityMunicipalityId" uuid;
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS "barangayId" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'citizens_city_municipality_id_fkey'
  ) THEN
    ALTER TABLE citizens
    ADD CONSTRAINT citizens_city_municipality_id_fkey
    FOREIGN KEY ("cityMunicipalityId") REFERENCES cities_municipalities(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'citizens_barangay_id_fkey'
  ) THEN
    ALTER TABLE citizens
    ADD CONSTRAINT citizens_barangay_id_fkey
    FOREIGN KEY ("barangayId") REFERENCES barangays(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS citizens_city_municipality_id_idx ON citizens ("cityMunicipalityId");
CREATE INDEX IF NOT EXISTS citizens_barangay_id_idx ON citizens ("barangayId");