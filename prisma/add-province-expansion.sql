-- ============================================================================
-- Province Expansion Migration
-- ============================================================================
-- Adds geographic hierarchy (Region → Province → CityMunicipality → Barangay)
-- with PSA PSGC codes, jurisdiction binding for Users and Agencies,
-- incident escalation tracking, and mutual aid requests.
--
-- All new FK columns are nullable so existing data is unaffected.
-- Run AFTER `npx prisma db push` has created the tables/columns.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Geographic Hierarchy Tables
-- --------------------------------------------------------------------------

-- regions: created by Prisma (no extra constraints needed)

-- provinces: created by Prisma (FK index on region_id added by schema)

-- cities_municipalities: CHECK constraint on type column
ALTER TABLE cities_municipalities
  ADD CONSTRAINT city_municipality_type_check
  CHECK (type IN ('CITY', 'MUNICIPALITY', 'HUC', 'ICC', 'CC'));

-- barangays: created by Prisma (FK index on city_municipality_id added by schema)

-- --------------------------------------------------------------------------
-- 2. User jurisdiction binding
-- --------------------------------------------------------------------------

-- CHECK constraint for jurisdiction type on users
ALTER TABLE users
  ADD CONSTRAINT users_jurisdiction_type_check
  CHECK (
    "jurisdictionType" IS NULL
    OR "jurisdictionType" IN ('national', 'region', 'province', 'city', 'barangay')
  );

-- --------------------------------------------------------------------------
-- 3. Agency jurisdiction & type
-- --------------------------------------------------------------------------

-- CHECK constraint for agency jurisdiction type
ALTER TABLE agencies
  ADD CONSTRAINT agencies_jurisdiction_type_check
  CHECK (
    "jurisdictionType" IS NULL
    OR "jurisdictionType" IN ('national', 'region', 'province', 'city', 'barangay')
  );

-- CHECK constraint for agency type
ALTER TABLE agencies
  ADD CONSTRAINT agencies_agency_type_check
  CHECK (
    "agencyType" IS NULL
    OR "agencyType" IN ('PNP', 'BFP', 'DRRMO', 'HEALTH', 'SOCIAL_WELFARE', 'BARANGAY_TANOD', 'OTHER')
  );

-- --------------------------------------------------------------------------
-- 4. Incident Escalation
-- --------------------------------------------------------------------------

-- CHECK constraint for escalation levels
ALTER TABLE incident_escalations
  ADD CONSTRAINT escalation_from_level_check
  CHECK ("fromLevel" IN ('barangay', 'city', 'province', 'region'));

ALTER TABLE incident_escalations
  ADD CONSTRAINT escalation_to_level_check
  CHECK ("toLevel" IN ('barangay', 'city', 'province', 'region'));

-- CHECK constraint for escalation status
ALTER TABLE incident_escalations
  ADD CONSTRAINT escalation_status_check
  CHECK (status IN ('pending', 'accepted', 'declined'));

-- --------------------------------------------------------------------------
-- 5. Mutual Aid Request
-- --------------------------------------------------------------------------

-- CHECK constraint for mutual aid request status
ALTER TABLE mutual_aid_requests
  ADD CONSTRAINT mutual_aid_status_check
  CHECK (status IN ('requested', 'approved', 'deployed', 'completed', 'declined'));

-- --------------------------------------------------------------------------
-- 6. Composite Indexes for common query patterns
-- --------------------------------------------------------------------------

-- Region + archived status lookup (for filtering active regions)
CREATE INDEX IF NOT EXISTS idx_regions_archived
  ON regions ("archivedAt");

-- Province name lookup within a region
CREATE INDEX IF NOT EXISTS idx_provinces_region_name
  ON provinces ("regionId", name);

-- City/Municipality name lookup within a province
CREATE INDEX IF NOT EXISTS idx_cities_province_name
  ON cities_municipalities ("provinceId", name);

-- Barangay name lookup within a city/municipality
CREATE INDEX IF NOT EXISTS idx_barangays_city_name
  ON barangays ("cityMunicipalityId", name);

-- Incidents by geographic area (for jurisdiction-filtered dashboards)
CREATE INDEX IF NOT EXISTS idx_incidents_region
  ON incidents ("regionId") WHERE "regionId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_province
  ON incidents ("provinceId") WHERE "provinceId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_city
  ON incidents ("cityMunicipalityId") WHERE "cityMunicipalityId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_barangay
  ON incidents ("barangayId") WHERE "barangayId" IS NOT NULL;

-- Agencies by jurisdiction for routing lookups
CREATE INDEX IF NOT EXISTS idx_agencies_jurisdiction
  ON agencies ("jurisdictionType", "jurisdictionId")
  WHERE "jurisdictionType" IS NOT NULL;

-- Escalations by status for pending-escalation dashboards
CREATE INDEX IF NOT EXISTS idx_escalations_status
  ON incident_escalations (status)
  WHERE status = 'pending';

-- Mutual aid requests by status for pending-request dashboards
CREATE INDEX IF NOT EXISTS idx_mutual_aid_status
  ON mutual_aid_requests (status)
  WHERE status = 'requested';

-- PSGC code lookups (unique indexes already created by Prisma, but add
-- partial indexes for non-archived records for faster active-record queries)
CREATE INDEX IF NOT EXISTS idx_regions_code_active
  ON regions (code) WHERE "archivedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_provinces_code_active
  ON provinces (code) WHERE "archivedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_cities_code_active
  ON cities_municipalities (code) WHERE "archivedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_barangays_code_active
  ON barangays (code) WHERE "archivedAt" IS NULL;
