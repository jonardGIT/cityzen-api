BEGIN;

CREATE TABLE IF NOT EXISTS regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  designation text
);

CREATE TABLE IF NOT EXISTS provinces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  "regionId" uuid NOT NULL REFERENCES regions(id)
);

CREATE TABLE IF NOT EXISTS cities_municipalities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  type text NOT NULL,
  "provinceId" uuid NOT NULL REFERENCES provinces(id)
);

CREATE TABLE IF NOT EXISTS barangays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  "cityMunicipalityId" uuid NOT NULL REFERENCES cities_municipalities(id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'city_municipality_type_check'
  ) THEN
    ALTER TABLE cities_municipalities
      ADD CONSTRAINT city_municipality_type_check
      CHECK (type IN ('CITY', 'MUNICIPALITY', 'HUC', 'ICC', 'CC'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_regions_archived
  ON regions ("archivedAt");

CREATE INDEX IF NOT EXISTS idx_provinces_region_id
  ON provinces ("regionId");

CREATE INDEX IF NOT EXISTS idx_provinces_region_name
  ON provinces ("regionId", name);

CREATE INDEX IF NOT EXISTS idx_cities_province_id
  ON cities_municipalities ("provinceId");

CREATE INDEX IF NOT EXISTS idx_cities_province_name
  ON cities_municipalities ("provinceId", name);

CREATE INDEX IF NOT EXISTS idx_barangays_city_municipality_id
  ON barangays ("cityMunicipalityId");

CREATE INDEX IF NOT EXISTS idx_barangays_city_name
  ON barangays ("cityMunicipalityId", name);

CREATE INDEX IF NOT EXISTS idx_regions_code_active
  ON regions (code) WHERE "archivedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_provinces_code_active
  ON provinces (code) WHERE "archivedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_cities_code_active
  ON cities_municipalities (code) WHERE "archivedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_barangays_code_active
  ON barangays (code) WHERE "archivedAt" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_regions_updated_at') THEN
      CREATE TRIGGER set_regions_updated_at
      BEFORE UPDATE ON regions
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_provinces_updated_at') THEN
      CREATE TRIGGER set_provinces_updated_at
      BEFORE UPDATE ON provinces
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_cities_municipalities_updated_at') THEN
      CREATE TRIGGER set_cities_municipalities_updated_at
      BEFORE UPDATE ON cities_municipalities
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_barangays_updated_at') THEN
      CREATE TRIGGER set_barangays_updated_at
      BEFORE UPDATE ON barangays
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    END IF;
  END IF;
END
$$;

COMMIT;