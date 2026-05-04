BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "middleName" text,
  ADD COLUMN IF NOT EXISTS suffix text,
  ALTER COLUMN name DROP NOT NULL;

ALTER TABLE citizens
  ADD COLUMN IF NOT EXISTS "middleName" text,
  ADD COLUMN IF NOT EXISTS suffix text,
  ALTER COLUMN name DROP NOT NULL;

CREATE TABLE IF NOT EXISTS name_backfill_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "entityType" text NOT NULL,
  "entityId" uuid NOT NULL,
  "legacyName" text NOT NULL,
  "suggestedFirstName" text,
  "suggestedMiddleName" text,
  "suggestedLastName" text,
  "suggestedSuffix" text,
  reason text NOT NULL,
  "resolvedAt" timestamptz,
  CONSTRAINT name_backfill_reviews_entity_type_check CHECK (
    "entityType" IN ('user', 'citizen')
  ),
  CONSTRAINT name_backfill_reviews_entity_unique UNIQUE ("entityType", "entityId")
);

CREATE INDEX IF NOT EXISTS name_backfill_reviews_resolved_at_idx
  ON name_backfill_reviews ("resolvedAt");

WITH user_candidates AS (
  SELECT
    u.id,
    normalized_name,
    raw_tokens,
    CASE
      WHEN raw_tokens[array_length(raw_tokens, 1)] ~* '^(JR|JR\\.|SR|SR\\.|II|III|IV|V)$'
        THEN regexp_replace(upper(raw_tokens[array_length(raw_tokens, 1)]), '\\.$', '')
      ELSE NULL
    END AS detected_suffix,
    CASE
      WHEN raw_tokens[array_length(raw_tokens, 1)] ~* '^(JR|JR\\.|SR|SR\\.|II|III|IV|V)$'
        THEN raw_tokens[1:array_length(raw_tokens, 1) - 1]
      ELSE raw_tokens
    END AS name_tokens
  FROM (
    SELECT
      id,
      regexp_replace(btrim(name), '\\s+', ' ', 'g') AS normalized_name,
      regexp_split_to_array(regexp_replace(btrim(name), '\\s+', ' ', 'g'), ' ') AS raw_tokens
    FROM users
    WHERE name IS NOT NULL
      AND btrim(name) <> ''
      AND COALESCE(NULLIF(btrim("firstName"), ''), NULLIF(btrim("middleName"), ''), NULLIF(btrim("lastName"), ''), NULLIF(btrim(suffix), '')) IS NULL
  ) AS u
),
user_classified AS (
  SELECT
    id,
    normalized_name,
    detected_suffix,
    name_tokens,
    array_length(name_tokens, 1) AS token_count,
    CASE
      WHEN array_length(name_tokens, 1) = 2 THEN 'safe_two_token'
      WHEN array_length(name_tokens, 1) = 3 AND name_tokens[2] ~ '^[[:alpha:]]\\.?$' THEN 'safe_middle_initial'
      WHEN array_length(name_tokens, 1) = 1 THEN 'single_token_name'
      WHEN array_length(name_tokens, 1) = 3 THEN 'three_token_non_initial_middle'
      WHEN array_length(name_tokens, 1) > 3 THEN 'too_many_tokens'
      ELSE 'unrecognized_name_shape'
    END AS classification
  FROM user_candidates
),
user_safe_updates AS (
  UPDATE users AS target
  SET
    "firstName" = source.name_tokens[1],
    "middleName" = CASE WHEN source.classification = 'safe_middle_initial' THEN source.name_tokens[2] ELSE NULL END,
    "lastName" = CASE
      WHEN source.classification = 'safe_two_token' THEN source.name_tokens[2]
      WHEN source.classification = 'safe_middle_initial' THEN source.name_tokens[3]
      ELSE target."lastName"
    END,
    suffix = source.detected_suffix
  FROM user_classified AS source
  WHERE target.id = source.id
    AND source.classification IN ('safe_two_token', 'safe_middle_initial')
  RETURNING target.id
)
INSERT INTO name_backfill_reviews (
  "entityType",
  "entityId",
  "legacyName",
  "suggestedSuffix",
  reason
)
SELECT
  'user',
  source.id,
  source.normalized_name,
  source.detected_suffix,
  source.classification
FROM user_classified AS source
WHERE source.classification NOT IN ('safe_two_token', 'safe_middle_initial')
ON CONFLICT ("entityType", "entityId") DO NOTHING;

WITH citizen_candidates AS (
  SELECT
    c.id,
    normalized_name,
    raw_tokens,
    CASE
      WHEN raw_tokens[array_length(raw_tokens, 1)] ~* '^(JR|JR\\.|SR|SR\\.|II|III|IV|V)$'
        THEN regexp_replace(upper(raw_tokens[array_length(raw_tokens, 1)]), '\\.$', '')
      ELSE NULL
    END AS detected_suffix,
    CASE
      WHEN raw_tokens[array_length(raw_tokens, 1)] ~* '^(JR|JR\\.|SR|SR\\.|II|III|IV|V)$'
        THEN raw_tokens[1:array_length(raw_tokens, 1) - 1]
      ELSE raw_tokens
    END AS name_tokens
  FROM (
    SELECT
      id,
      regexp_replace(btrim(name), '\\s+', ' ', 'g') AS normalized_name,
      regexp_split_to_array(regexp_replace(btrim(name), '\\s+', ' ', 'g'), ' ') AS raw_tokens
    FROM citizens
    WHERE name IS NOT NULL
      AND btrim(name) <> ''
      AND COALESCE(NULLIF(btrim("firstName"), ''), NULLIF(btrim("middleName"), ''), NULLIF(btrim("lastName"), ''), NULLIF(btrim(suffix), '')) IS NULL
  ) AS c
),
citizen_classified AS (
  SELECT
    id,
    normalized_name,
    detected_suffix,
    name_tokens,
    array_length(name_tokens, 1) AS token_count,
    CASE
      WHEN array_length(name_tokens, 1) = 2 THEN 'safe_two_token'
      WHEN array_length(name_tokens, 1) = 3 AND name_tokens[2] ~ '^[[:alpha:]]\\.?$' THEN 'safe_middle_initial'
      WHEN array_length(name_tokens, 1) = 1 THEN 'single_token_name'
      WHEN array_length(name_tokens, 1) = 3 THEN 'three_token_non_initial_middle'
      WHEN array_length(name_tokens, 1) > 3 THEN 'too_many_tokens'
      ELSE 'unrecognized_name_shape'
    END AS classification
  FROM citizen_candidates
),
citizen_safe_updates AS (
  UPDATE citizens AS target
  SET
    "firstName" = source.name_tokens[1],
    "middleName" = CASE WHEN source.classification = 'safe_middle_initial' THEN source.name_tokens[2] ELSE NULL END,
    "lastName" = CASE
      WHEN source.classification = 'safe_two_token' THEN source.name_tokens[2]
      WHEN source.classification = 'safe_middle_initial' THEN source.name_tokens[3]
      ELSE target."lastName"
    END,
    suffix = source.detected_suffix
  FROM citizen_classified AS source
  WHERE target.id = source.id
    AND source.classification IN ('safe_two_token', 'safe_middle_initial')
  RETURNING target.id
)
INSERT INTO name_backfill_reviews (
  "entityType",
  "entityId",
  "legacyName",
  "suggestedSuffix",
  reason
)
SELECT
  'citizen',
  source.id,
  source.normalized_name,
  source.detected_suffix,
  source.classification
FROM citizen_classified AS source
WHERE source.classification NOT IN ('safe_two_token', 'safe_middle_initial')
ON CONFLICT ("entityType", "entityId") DO NOTHING;

COMMIT;