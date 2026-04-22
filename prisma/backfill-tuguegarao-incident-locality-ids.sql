BEGIN;

-- Backfill canonical locality references for existing active Tuguegarao incidents.
-- This keeps city-scoped reads from failing closed while preserving existing data.
WITH target_city AS (
  SELECT
    city.id AS "cityMunicipalityId",
    province.id AS "provinceId",
    region.id AS "regionId"
  FROM cities_municipalities city
  JOIN provinces province
    ON province.id = city."provinceId"
  JOIN regions region
    ON region.id = province."regionId"
  WHERE city."archivedAt" IS NULL
    AND province."archivedAt" IS NULL
    AND region."archivedAt" IS NULL
    AND city.code = '021528000'
    AND province.code = '021500000'
    AND region.code = '020000000'
),
unique_barangays AS (
  SELECT
    btrim(lower(barangay.name)) AS normalized_name,
    MIN(barangay.id::text)::uuid AS barangay_id,
    COUNT(*) AS barangay_count
  FROM barangays barangay
  JOIN target_city city
    ON city."cityMunicipalityId" = barangay."cityMunicipalityId"
  WHERE barangay."archivedAt" IS NULL
  GROUP BY btrim(lower(barangay.name))
),
incident_matches AS (
  SELECT
    incident.id,
    city."regionId",
    city."provinceId",
    city."cityMunicipalityId",
    barangay.barangay_id AS "barangayId"
  FROM incidents incident
  CROSS JOIN target_city city
  LEFT JOIN unique_barangays barangay
    ON barangay.barangay_count = 1
   AND barangay.normalized_name = btrim(lower(COALESCE(incident.barangay, '')))
  WHERE incident."archivedAt" IS NULL
    AND incident."cityName" = 'Tuguegarao City'
    AND incident."provinceName" = 'Cagayan'
    AND incident."regionName" = 'Cagayan Valley'
)
UPDATE incidents incident
SET
  "regionId" = COALESCE(incident."regionId", matched."regionId"),
  "provinceId" = COALESCE(incident."provinceId", matched."provinceId"),
  "cityMunicipalityId" = COALESCE(incident."cityMunicipalityId", matched."cityMunicipalityId"),
  "barangayId" = COALESCE(incident."barangayId", matched."barangayId")
FROM incident_matches matched
WHERE incident.id = matched.id
  AND (
    incident."regionId" IS NULL
    OR incident."provinceId" IS NULL
    OR incident."cityMunicipalityId" IS NULL
    OR (incident."barangayId" IS NULL AND matched."barangayId" IS NOT NULL)
  );

COMMIT;