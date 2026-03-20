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
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'VIEWER',
  CONSTRAINT user_role_check CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'RESPONDER', 'VIEWER'))
);

CREATE TABLE citizens (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  "contactInfo" TEXT NOT NULL,
  "preferredChannel" TEXT NOT NULL
);

CREATE TABLE agencies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  "contactNumber" VARCHAR(20)
);

CREATE TABLE responders (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  "agencyId" INTEGER NOT NULL REFERENCES agencies(id),
  role TEXT NOT NULL,
  "contactInfo" TEXT NOT NULL
);

CREATE TABLE statuses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  "subCategory" TEXT
);

CREATE TABLE severities (
  id SERIAL PRIMARY KEY,
  level TEXT NOT NULL UNIQUE,
  definition TEXT
);

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  district TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  region TEXT NOT NULL
);

CREATE TABLE incidents (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  "mediaUrl" TEXT,
  "dateReported" TIMESTAMP NOT NULL DEFAULT NOW(),
  "statusId" INTEGER NOT NULL REFERENCES statuses(id),
  "citizenId" INTEGER NOT NULL REFERENCES citizens(id),
  "locationId" INTEGER NOT NULL REFERENCES locations(id),
  "categoryId" INTEGER NOT NULL REFERENCES categories(id),
  "severityId" INTEGER NOT NULL REFERENCES severities(id)
);

CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  "incidentId" INTEGER NOT NULL REFERENCES incidents(id),
  "responderId" INTEGER NOT NULL REFERENCES responders(id),
  "assignedDate" TIMESTAMP NOT NULL DEFAULT NOW(),
  "responseStart" TIMESTAMP,
  "responseEnd" TIMESTAMP,
  outcome TEXT,
  notes TEXT
);

COMMIT;
