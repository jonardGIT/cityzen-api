BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "mobileNumber" text,
  ADD COLUMN IF NOT EXISTS "mobileNumberVerifiedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "mobileAuthSubject" text,
  ADD COLUMN IF NOT EXISTS "citizenId" uuid;

CREATE UNIQUE INDEX IF NOT EXISTS users_mobile_number_idx
ON users ("mobileNumber")
WHERE "mobileNumber" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_mobile_auth_subject_idx
ON users ("mobileAuthSubject")
WHERE "mobileAuthSubject" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_citizen_id_idx
ON users ("citizenId")
WHERE "citizenId" IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_citizen_id_fkey'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_citizen_id_fkey
      FOREIGN KEY ("citizenId") REFERENCES citizens(id)
      ON DELETE SET NULL;
  END IF;
END $$;

WITH unique_legacy_matches AS (
  SELECT
    u.id AS user_id,
    MIN(c.id::text)::uuid AS citizen_id
  FROM users u
  JOIN citizens c
    ON c."contactInfo" = u.email
   AND c."archivedAt" IS NULL
  WHERE u."archivedAt" IS NULL
    AND u."citizenId" IS NULL
  GROUP BY u.id
  HAVING COUNT(*) = 1
),
claimable_legacy_matches AS (
  SELECT
    match.user_id,
    match.citizen_id
  FROM unique_legacy_matches match
  WHERE NOT EXISTS (
    SELECT 1
    FROM users existing_user
    WHERE existing_user."citizenId" = match.citizen_id
      AND existing_user.id <> match.user_id
  )
)
UPDATE users u
SET
  "citizenId" = claimable_legacy_matches.citizen_id,
  "updatedAt" = NOW()
FROM claimable_legacy_matches
WHERE u.id = claimable_legacy_matches.user_id;

CREATE TABLE IF NOT EXISTS mobile_app_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  body text NOT NULL,
  "contentType" text NOT NULL DEFAULT 'announcement',
  placement text NOT NULL DEFAULT 'home',
  audience text,
  "imageUrl" text,
  "ctaLabel" text,
  "ctaUrl" text,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "isPublished" boolean NOT NULL DEFAULT false,
  "publishedAt" timestamptz,
  "startsAt" timestamptz,
  "endsAt" timestamptz,
  metadata jsonb
);

ALTER TABLE mobile_app_content ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE mobile_app_content ALTER COLUMN "createdAt" SET DEFAULT NOW();
ALTER TABLE mobile_app_content ALTER COLUMN "updatedAt" SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS mobile_app_content_archived_at_idx
ON mobile_app_content ("archivedAt");

CREATE INDEX IF NOT EXISTS mobile_app_content_is_published_idx
ON mobile_app_content ("isPublished");

CREATE INDEX IF NOT EXISTS mobile_app_content_placement_idx
ON mobile_app_content (placement);

CREATE INDEX IF NOT EXISTS mobile_app_content_audience_idx
ON mobile_app_content (audience);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_mobile_app_content_updated_at ON mobile_app_content;
CREATE TRIGGER set_mobile_app_content_updated_at
BEFORE UPDATE ON mobile_app_content
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;