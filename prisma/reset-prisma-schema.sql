BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS responders CASCADE;
DROP TABLE IF EXISTS agencies CASCADE;
DROP TABLE IF EXISTS citizens CASCADE;
DROP TABLE IF EXISTS statuses CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS severities CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

DROP FUNCTION IF EXISTS set_updated_at() CASCADE;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  "passwordHash" text NOT NULL,
  role text NOT NULL DEFAULT 'VIEWER',
  CONSTRAINT users_role_check CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'RESPONDER', 'VIEWER'))
);

CREATE TABLE citizens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  name text NOT NULL,
  "contactInfo" text NOT NULL,
  "preferredChannel" text NOT NULL
);

CREATE TABLE agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  name text NOT NULL,
  "contactNumber" text
);

CREATE TABLE responders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  name text NOT NULL,
  "agencyId" uuid NOT NULL REFERENCES agencies(id),
  role text NOT NULL,
  "contactInfo" text NOT NULL
);

CREATE TABLE statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  name text NOT NULL
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  name text NOT NULL,
  "subCategory" text
);

CREATE TABLE severities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  level text NOT NULL UNIQUE,
  definition text
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  timestamp timestamptz NOT NULL DEFAULT NOW(),
  action text NOT NULL,
  summary text NOT NULL,
  outcome text NOT NULL,
  "actorUserId" uuid,
  "actorEmail" text,
  "actorRole" text,
  resource text NOT NULL,
  method text NOT NULL,
  path text NOT NULL,
  "statusCode" integer,
  "targetId" text,
  "ipAddress" text,
  "userAgent" text,
  "requestId" text,
  metadata jsonb
);

CREATE TABLE incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  description text NOT NULL,
  "mediaUrl" text,
  "dateReported" timestamptz NOT NULL DEFAULT NOW(),
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  "addressLine1" text,
  "addressLine2" text,
  barangay text,
  "districtName" text,
  "cityName" text,
  "provinceName" text,
  "regionName" text,
  "postalCode" text,
  landmark text,
  "statusId" uuid NOT NULL REFERENCES statuses(id),
  "citizenId" uuid NOT NULL REFERENCES citizens(id),
  "categoryId" uuid NOT NULL REFERENCES categories(id),
  "severityId" uuid NOT NULL REFERENCES severities(id)
);

CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "incidentId" uuid NOT NULL REFERENCES incidents(id),
  "responderId" uuid NOT NULL REFERENCES responders(id),
  "assignedDate" timestamptz NOT NULL DEFAULT NOW(),
  "responseStart" timestamptz,
  "responseEnd" timestamptz,
  outcome text,
  notes text
);

CREATE INDEX incidents_status_id_idx ON incidents ("statusId");
CREATE INDEX incidents_citizen_id_idx ON incidents ("citizenId");
CREATE INDEX incidents_category_id_idx ON incidents ("categoryId");
CREATE INDEX incidents_severity_id_idx ON incidents ("severityId");
CREATE INDEX audit_logs_timestamp_idx ON audit_logs (timestamp);
CREATE INDEX audit_logs_actor_email_idx ON audit_logs ("actorEmail");
CREATE INDEX audit_logs_resource_idx ON audit_logs (resource);
CREATE INDEX audit_logs_action_idx ON audit_logs (action);
CREATE INDEX audit_logs_outcome_idx ON audit_logs (outcome);
CREATE INDEX audit_logs_target_id_idx ON audit_logs ("targetId");
CREATE INDEX audit_logs_request_id_idx ON audit_logs ("requestId");
CREATE INDEX responders_agency_id_idx ON responders ("agencyId");
CREATE INDEX assignments_incident_id_idx ON assignments ("incidentId");
CREATE INDEX assignments_responder_id_idx ON assignments ("responderId");
CREATE INDEX users_email_idx ON users (email);
CREATE INDEX users_role_idx ON users (role);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_citizens_updated_at
BEFORE UPDATE ON citizens
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_agencies_updated_at
BEFORE UPDATE ON agencies
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_responders_updated_at
BEFORE UPDATE ON responders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_statuses_updated_at
BEFORE UPDATE ON statuses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_severities_updated_at
BEFORE UPDATE ON severities
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_audit_logs_updated_at
BEFORE UPDATE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_incidents_updated_at
BEFORE UPDATE ON incidents
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_assignments_updated_at
BEFORE UPDATE ON assignments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
