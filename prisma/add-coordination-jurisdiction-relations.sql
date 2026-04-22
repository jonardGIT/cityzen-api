BEGIN;

ALTER TABLE incident_escalations
ADD COLUMN IF NOT EXISTS "sourceCityMunicipalityId" uuid;

ALTER TABLE incident_escalations
ADD COLUMN IF NOT EXISTS "targetProvinceId" uuid;

UPDATE incident_escalations AS escalation
SET
  "sourceCityMunicipalityId" = incident."cityMunicipalityId",
  "targetProvinceId" = incident."provinceId"
FROM incidents AS incident
WHERE escalation."incidentId" = incident.id
  AND escalation."fromLevel" = 'city'
  AND escalation."toLevel" = 'province'
  AND (
    escalation."sourceCityMunicipalityId" IS NULL
    OR escalation."targetProvinceId" IS NULL
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'incident_escalations_source_city_municipality_id_fkey'
      AND conrelid = 'incident_escalations'::regclass
  ) THEN
    ALTER TABLE incident_escalations
    ADD CONSTRAINT incident_escalations_source_city_municipality_id_fkey
    FOREIGN KEY ("sourceCityMunicipalityId") REFERENCES cities_municipalities(id)
    ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'incident_escalations_target_province_id_fkey'
      AND conrelid = 'incident_escalations'::regclass
  ) THEN
    ALTER TABLE incident_escalations
    ADD CONSTRAINT incident_escalations_target_province_id_fkey
    FOREIGN KEY ("targetProvinceId") REFERENCES provinces(id)
    ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mutual_aid_requests_requesting_jurisdiction_id_fkey'
      AND conrelid = 'mutual_aid_requests'::regclass
  ) THEN
    ALTER TABLE mutual_aid_requests
    ADD CONSTRAINT mutual_aid_requests_requesting_jurisdiction_id_fkey
    FOREIGN KEY ("requestingJurisdictionId") REFERENCES cities_municipalities(id)
    NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mutual_aid_requests_target_jurisdiction_id_fkey'
      AND conrelid = 'mutual_aid_requests'::regclass
  ) THEN
    ALTER TABLE mutual_aid_requests
    ADD CONSTRAINT mutual_aid_requests_target_jurisdiction_id_fkey
    FOREIGN KEY ("targetJurisdictionId") REFERENCES cities_municipalities(id)
    NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS incident_escalations_source_city_municipality_id_idx
ON incident_escalations ("sourceCityMunicipalityId");

CREATE INDEX IF NOT EXISTS incident_escalations_target_province_id_idx
ON incident_escalations ("targetProvinceId");

CREATE UNIQUE INDEX IF NOT EXISTS incident_escalations_pending_city_to_province_unique_idx
ON incident_escalations ("incidentId")
WHERE "fromLevel" = 'city'
  AND "toLevel" = 'province'
  AND status = 'pending';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mutual_aid_requests_requesting_jurisdiction_id_fkey'
      AND conrelid = 'mutual_aid_requests'::regclass
      AND NOT convalidated
  )
  AND NOT EXISTS (
    SELECT 1
    FROM mutual_aid_requests AS request
    LEFT JOIN cities_municipalities AS city
      ON city.id = request."requestingJurisdictionId"
    WHERE city.id IS NULL
  ) THEN
    ALTER TABLE mutual_aid_requests
    VALIDATE CONSTRAINT mutual_aid_requests_requesting_jurisdiction_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mutual_aid_requests_target_jurisdiction_id_fkey'
      AND conrelid = 'mutual_aid_requests'::regclass
      AND NOT convalidated
  )
  AND NOT EXISTS (
    SELECT 1
    FROM mutual_aid_requests AS request
    LEFT JOIN cities_municipalities AS city
      ON city.id = request."targetJurisdictionId"
    WHERE city.id IS NULL
  ) THEN
    ALTER TABLE mutual_aid_requests
    VALIDATE CONSTRAINT mutual_aid_requests_target_jurisdiction_id_fkey;
  END IF;
END $$;

COMMIT;