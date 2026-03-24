BEGIN;

-- Drop legacy and current tables to guarantee a clean Prisma-aligned schema.
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS responders CASCADE;
DROP TABLE IF EXISTS agencies CASCADE;
DROP TABLE IF EXISTS citizens CASCADE;
DROP TABLE IF EXISTS statuses CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS severities CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

DROP TABLE IF EXISTS "Assignment" CASCADE;
DROP TABLE IF EXISTS "CitizenIncident" CASCADE;
DROP TABLE IF EXISTS "Responder" CASCADE;
DROP TABLE IF EXISTS "Agency" CASCADE;
DROP TABLE IF EXISTS "Citizen" CASCADE;
DROP TABLE IF EXISTS "Status" CASCADE;
DROP TABLE IF EXISTS "Category" CASCADE;
DROP TABLE IF EXISTS "Severity" CASCADE;
DROP TABLE IF EXISTS "Location" CASCADE;

-- Recreate schema exactly as expected by Prisma mappings.
CREATE TABLE "User" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'VIEWER',
  CONSTRAINT user_role_check CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'RESPONDER', 'VIEWER'))
);

CREATE TABLE citizens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "contactInfo" TEXT NOT NULL,
  "preferredChannel" TEXT NOT NULL
);

CREATE TABLE agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  "contactNumber" VARCHAR(20)
);

CREATE TABLE responders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "agencyId" uuid NOT NULL REFERENCES agencies(id),
  role TEXT NOT NULL,
  "contactInfo" TEXT NOT NULL
);

CREATE TABLE statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  "subCategory" TEXT
);

CREATE TABLE severities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL UNIQUE,
  definition TEXT
);

CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  region TEXT NOT NULL
);

CREATE TABLE incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  "mediaUrl" TEXT,
  "dateReported" TIMESTAMP NOT NULL DEFAULT NOW(),
  "statusId" uuid NOT NULL REFERENCES statuses(id),
  "citizenId" uuid NOT NULL REFERENCES citizens(id),
  "locationId" uuid NOT NULL REFERENCES locations(id),
  "categoryId" uuid NOT NULL REFERENCES categories(id),
  "severityId" uuid NOT NULL REFERENCES severities(id)
);

CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "incidentId" uuid NOT NULL REFERENCES incidents(id),
  "responderId" uuid NOT NULL REFERENCES responders(id),
  "assignedDate" TIMESTAMP NOT NULL DEFAULT NOW(),
  "responseStart" TIMESTAMP,
  "responseEnd" TIMESTAMP,
  outcome TEXT,
  notes TEXT
);

COMMIT;
