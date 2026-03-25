BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT NOW();

ALTER TABLE citizens
  ADD COLUMN IF NOT EXISTS "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT NOW();

ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT NOW();

ALTER TABLE responders
  ADD COLUMN IF NOT EXISTS "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT NOW();

ALTER TABLE statuses
  ADD COLUMN IF NOT EXISTS "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT NOW();

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT NOW();

ALTER TABLE severities
  ADD COLUMN IF NOT EXISTS "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT NOW();

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT NOW();

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT NOW();

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT NOW();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_citizens_updated_at ON citizens;
CREATE TRIGGER set_citizens_updated_at
BEFORE UPDATE ON citizens
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_agencies_updated_at ON agencies;
CREATE TRIGGER set_agencies_updated_at
BEFORE UPDATE ON agencies
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_responders_updated_at ON responders;
CREATE TRIGGER set_responders_updated_at
BEFORE UPDATE ON responders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_statuses_updated_at ON statuses;
CREATE TRIGGER set_statuses_updated_at
BEFORE UPDATE ON statuses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_categories_updated_at ON categories;
CREATE TRIGGER set_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_severities_updated_at ON severities;
CREATE TRIGGER set_severities_updated_at
BEFORE UPDATE ON severities
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_locations_updated_at ON locations;
CREATE TRIGGER set_locations_updated_at
BEFORE UPDATE ON locations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_incidents_updated_at ON incidents;
CREATE TRIGGER set_incidents_updated_at
BEFORE UPDATE ON incidents
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_assignments_updated_at ON assignments;
CREATE TRIGGER set_assignments_updated_at
BEFORE UPDATE ON assignments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
