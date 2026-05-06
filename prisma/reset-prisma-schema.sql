-- Baseline reset script for the current API schema.
-- Use this only for clean-room setup, disposable environments, or deliberate full resets.
-- For existing databases that must retain data, prefer the additive `prisma/add-*.sql` scripts that match the features you are enabling.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS mutual_aid_requests CASCADE;
DROP TABLE IF EXISTS incident_escalations CASCADE;
DROP TABLE IF EXISTS incident_status_history CASCADE;
DROP TABLE IF EXISTS case_tokens CASCADE;
DROP TABLE IF EXISTS barangays CASCADE;
DROP TABLE IF EXISTS cities_municipalities CASCADE;
DROP TABLE IF EXISTS provinces CASCADE;
DROP TABLE IF EXISTS regions CASCADE;
DROP TABLE IF EXISTS mobile_app_content CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS incident_media CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS responders CASCADE;
DROP TABLE IF EXISTS agencies CASCADE;
DROP TABLE IF EXISTS citizens CASCADE;
DROP TABLE IF EXISTS statuses CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS severities CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS data_subject_requests CASCADE;
DROP TABLE IF EXISTS privacy_incidents CASCADE;
DROP TABLE IF EXISTS name_backfill_reviews CASCADE;
DROP TABLE IF EXISTS auth_sessions CASCADE;
DROP TABLE IF EXISTS rate_limit_buckets CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

DROP FUNCTION IF EXISTS set_updated_at() CASCADE;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
  name text,
  "firstName" text,
  "middleName" text,
  "lastName" text,
  suffix text,
  email text NOT NULL UNIQUE,
  "privacyNoticeAcceptedAt" timestamptz,
  "privacyNoticeVersion" text,
  "mobileNumber" text UNIQUE,
  "mobileNumberVerifiedAt" timestamptz,
  "mobileAuthSubject" text UNIQUE,
  "passwordHash" text,
  "supabaseAuthUserId" uuid,
  role text NOT NULL DEFAULT 'CITIZEN_REPORTER',
  "mfaEnabled" boolean NOT NULL DEFAULT false,
  "mfaSecretEncrypted" text,
  "mfaEnabledAt" timestamptz,
  "jurisdictionType" text,
  "jurisdictionId" uuid,
  "citizenId" uuid UNIQUE,
  CONSTRAINT users_role_check CHECK (
    role IN (
      'NATIONAL_ADMIN',
      'REGIONAL_DIRECTOR',
      'PROVINCIAL_ADMIN',
      'CITY_ADMIN',
      'CITY_CONTENT_EDITOR',
      'DISPATCHER',
      'RESPONDER',
      'CITIZEN_REPORTER',
      'AUDITOR'
    )
  ),
  CONSTRAINT users_jurisdiction_type_check CHECK (
    "jurisdictionType" IS NULL
    OR "jurisdictionType" IN ('national', 'region', 'province', 'city', 'barangay')
  )
);

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "expiresAt" timestamptz NOT NULL,
  "refreshTokenHash" text NOT NULL,
  "refreshExpiresAt" timestamptz NOT NULL,
  "refreshUsedAt" timestamptz,
  "revokedAt" timestamptz,
  "lastUsedAt" timestamptz,
  "userAgent" text,
  "ipAddress" text
);

CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "tokenHash" text NOT NULL UNIQUE,
  "expiresAt" timestamptz NOT NULL,
  "usedAt" timestamptz
);

CREATE TABLE rate_limit_buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "bucketKey" text NOT NULL UNIQUE,
  count integer NOT NULL,
  "windowStart" timestamptz NOT NULL,
  "expiresAt" timestamptz NOT NULL
);

CREATE TABLE citizens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
  name text,
  "firstName" text,
  "middleName" text,
  "lastName" text,
  suffix text,
  "addressLine1" text,
  "addressLine2" text,
  "cityMunicipalityId" uuid,
  "barangayId" uuid,
  "contactInfo" text NOT NULL,
  "preferredChannel" text NOT NULL,
  "privacyNoticeAcceptedAt" timestamptz,
  "privacyNoticeVersion" text
);

CREATE TABLE name_backfill_reviews (
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

CREATE TABLE data_subject_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "requesterUserId" uuid REFERENCES users(id) ON DELETE SET NULL,
  "reviewerUserId" uuid REFERENCES users(id) ON DELETE SET NULL,
  "citizenId" uuid REFERENCES citizens(id) ON DELETE SET NULL,
  "requestType" text NOT NULL,
  status text NOT NULL DEFAULT 'SUBMITTED',
  channel text NOT NULL DEFAULT 'self-service',
  "requesterEmail" text,
  details text,
  "reviewerNotes" text,
  "resolutionSummary" text,
  "acknowledgedAt" timestamptz,
  "reviewedAt" timestamptz,
  "resolvedAt" timestamptz,
  "dueAt" timestamptz NOT NULL,
  metadata jsonb
);

CREATE TABLE privacy_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "reportedByUserId" uuid REFERENCES users(id) ON DELETE SET NULL,
  "reviewedByUserId" uuid REFERENCES users(id) ON DELETE SET NULL,
  "referenceCode" text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'REPORTED',
  severity text NOT NULL DEFAULT 'HIGH',
  "detectedAt" timestamptz NOT NULL,
  "occurredAt" timestamptz,
  summary text NOT NULL,
  details text,
  "likelyPersonalDataBreach" boolean NOT NULL DEFAULT true,
  "npcNotificationRequired" boolean NOT NULL DEFAULT false,
  "npcNotificationDueAt" timestamptz,
  "npcNotifiedAt" timestamptz,
  "npcNotificationReference" text,
  "dataSubjectNotificationRequired" boolean NOT NULL DEFAULT false,
  "dataSubjectNotifiedAt" timestamptz,
  "dataSubjectNotificationReference" text,
  "affectedRecordCount" integer,
  "affectedDataCategories" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "containmentActions" text,
  "riskAssessment" text,
  "reviewerNotes" text,
  "resolutionSummary" text,
  "closedAt" timestamptz,
  metadata jsonb
);

ALTER TABLE users
  ADD CONSTRAINT users_citizen_id_fkey
  FOREIGN KEY ("citizenId") REFERENCES citizens(id) ON DELETE SET NULL;

CREATE TABLE mobile_app_content (
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

CREATE TABLE regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  designation text
);

CREATE TABLE provinces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  "regionId" uuid NOT NULL REFERENCES regions(id)
);

CREATE TABLE cities_municipalities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  type text NOT NULL,
  "provinceId" uuid NOT NULL REFERENCES provinces(id),
  CONSTRAINT city_municipality_type_check CHECK (
    type IN ('CITY', 'MUNICIPALITY', 'HUC', 'ICC', 'CC')
  )
);

CREATE TABLE barangays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  "cityMunicipalityId" uuid NOT NULL REFERENCES cities_municipalities(id)
);

ALTER TABLE citizens
  ADD CONSTRAINT citizens_city_municipality_id_fkey
  FOREIGN KEY ("cityMunicipalityId") REFERENCES cities_municipalities(id);

ALTER TABLE citizens
  ADD CONSTRAINT citizens_barangay_id_fkey
  FOREIGN KEY ("barangayId") REFERENCES barangays(id);

CREATE TABLE agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
  name text NOT NULL,
  "contactNumber" text,
  "jurisdictionType" text,
  "jurisdictionId" uuid,
  "agencyType" text,
  "regionId" uuid REFERENCES regions(id),
  "provinceId" uuid REFERENCES provinces(id),
  "cityMunicipalityId" uuid REFERENCES cities_municipalities(id),
  "barangayId" uuid REFERENCES barangays(id),
  CONSTRAINT agencies_jurisdiction_type_check CHECK (
    "jurisdictionType" IS NULL
    OR "jurisdictionType" IN ('national', 'region', 'province', 'city', 'barangay')
  ),
  CONSTRAINT agencies_agency_type_check CHECK (
    "agencyType" IS NULL
    OR "agencyType" IN ('PNP', 'BFP', 'DRRMO', 'HEALTH', 'SOCIAL_WELFARE', 'BARANGAY_TANOD', 'OTHER')
  )
);

CREATE TABLE responders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
  name text NOT NULL,
  "agencyId" uuid NOT NULL REFERENCES agencies(id),
  role text NOT NULL,
  "contactInfo" text NOT NULL
);

CREATE TABLE statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
  name text NOT NULL
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
  name text NOT NULL,
  "subCategory" text
);

CREATE TABLE severities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
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
  "archivedAt" timestamptz,
  "publicReference" text UNIQUE,
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
  "regionId" uuid REFERENCES regions(id),
  "provinceId" uuid REFERENCES provinces(id),
  "cityMunicipalityId" uuid REFERENCES cities_municipalities(id),
  "barangayId" uuid REFERENCES barangays(id),
  "statusId" uuid NOT NULL REFERENCES statuses(id),
  "citizenId" uuid NOT NULL REFERENCES citizens(id),
  "categoryId" uuid NOT NULL REFERENCES categories(id),
  "severityId" uuid NOT NULL REFERENCES severities(id)
);

CREATE TABLE case_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
  "incidentId" uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  "tokenHash" text NOT NULL UNIQUE,
  "expiresAt" timestamptz NOT NULL,
  "revokedAt" timestamptz,
  "lastUsedAt" timestamptz
);

CREATE TABLE incident_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
  "incidentId" uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  "fromStatusId" uuid REFERENCES statuses(id),
  "toStatusId" uuid NOT NULL REFERENCES statuses(id),
  "changedByUserId" uuid REFERENCES users(id) ON DELETE SET NULL,
  note text
);

CREATE TABLE incident_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "incidentId" uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  "mediaUrl" text NOT NULL,
  "displayOrder" integer NOT NULL DEFAULT 0
);

CREATE TABLE incident_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "incidentId" uuid NOT NULL REFERENCES incidents(id),
  "sourceCityMunicipalityId" uuid REFERENCES cities_municipalities(id),
  "targetProvinceId" uuid REFERENCES provinces(id),
  "fromLevel" text NOT NULL,
  "toLevel" text NOT NULL,
  "escalatedById" uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL,
  CONSTRAINT escalation_from_level_check CHECK ("fromLevel" IN ('barangay', 'city', 'province', 'region')),
  CONSTRAINT escalation_to_level_check CHECK ("toLevel" IN ('barangay', 'city', 'province', 'region')),
  CONSTRAINT escalation_status_check CHECK (status IN ('pending', 'accepted', 'declined'))
);

CREATE TABLE mutual_aid_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "incidentId" uuid NOT NULL REFERENCES incidents(id),
  "requestingJurisdictionId" uuid NOT NULL REFERENCES cities_municipalities(id),
  "targetJurisdictionId" uuid NOT NULL REFERENCES cities_municipalities(id),
  "requestedById" uuid NOT NULL,
  status text NOT NULL,
  notes text,
  CONSTRAINT mutual_aid_status_check CHECK (status IN ('requested', 'approved', 'deployed', 'completed', 'declined'))
);

CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  "archivedAt" timestamptz,
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
CREATE INDEX incidents_region_id_idx ON incidents ("regionId");
CREATE INDEX incidents_province_id_idx ON incidents ("provinceId");
CREATE INDEX incidents_city_municipality_id_idx ON incidents ("cityMunicipalityId");
CREATE INDEX incidents_barangay_id_idx ON incidents ("barangayId");
CREATE INDEX case_tokens_incident_id_idx ON case_tokens ("incidentId");
CREATE INDEX case_tokens_expires_at_idx ON case_tokens ("expiresAt");
CREATE INDEX case_tokens_revoked_at_idx ON case_tokens ("revokedAt");
CREATE INDEX incident_status_history_incident_created_at_idx ON incident_status_history ("incidentId", "createdAt");
CREATE INDEX incident_status_history_from_status_id_idx ON incident_status_history ("fromStatusId");
CREATE INDEX incident_status_history_to_status_id_idx ON incident_status_history ("toStatusId");
CREATE INDEX incident_status_history_changed_by_user_id_idx ON incident_status_history ("changedByUserId");
CREATE INDEX incident_media_incident_id_idx ON incident_media ("incidentId");
CREATE INDEX incident_media_incident_id_display_order_idx ON incident_media ("incidentId", "displayOrder");
CREATE INDEX regions_archived_at_idx ON regions ("archivedAt");
CREATE INDEX provinces_region_id_idx ON provinces ("regionId");
CREATE INDEX provinces_region_name_idx ON provinces ("regionId", name);
CREATE INDEX cities_municipalities_province_id_idx ON cities_municipalities ("provinceId");
CREATE INDEX cities_municipalities_province_name_idx ON cities_municipalities ("provinceId", name);
CREATE INDEX barangays_city_municipality_id_idx ON barangays ("cityMunicipalityId");
CREATE INDEX barangays_city_name_idx ON barangays ("cityMunicipalityId", name);
CREATE INDEX citizens_city_municipality_id_idx ON citizens ("cityMunicipalityId");
CREATE INDEX citizens_barangay_id_idx ON citizens ("barangayId");
CREATE INDEX agencies_region_id_idx ON agencies ("regionId");
CREATE INDEX agencies_province_id_idx ON agencies ("provinceId");
CREATE INDEX agencies_city_municipality_id_idx ON agencies ("cityMunicipalityId");
CREATE INDEX agencies_barangay_id_idx ON agencies ("barangayId");
CREATE INDEX agencies_jurisdiction_idx ON agencies ("jurisdictionType", "jurisdictionId");
CREATE INDEX auth_sessions_user_id_idx ON auth_sessions ("userId");
CREATE INDEX auth_sessions_expires_at_idx ON auth_sessions ("expiresAt");
CREATE INDEX auth_sessions_refresh_token_hash_idx ON auth_sessions ("refreshTokenHash");
CREATE INDEX auth_sessions_refresh_expires_at_idx ON auth_sessions ("refreshExpiresAt");
CREATE INDEX auth_sessions_revoked_at_idx ON auth_sessions ("revokedAt");
CREATE INDEX password_reset_tokens_user_id_idx ON password_reset_tokens ("userId");
CREATE INDEX password_reset_tokens_expires_at_idx ON password_reset_tokens ("expiresAt");
CREATE INDEX password_reset_tokens_used_at_idx ON password_reset_tokens ("usedAt");
CREATE INDEX privacy_incidents_reported_by_user_id_idx ON privacy_incidents ("reportedByUserId");
CREATE INDEX privacy_incidents_reviewed_by_user_id_idx ON privacy_incidents ("reviewedByUserId");
CREATE INDEX privacy_incidents_status_idx ON privacy_incidents (status);
CREATE INDEX privacy_incidents_severity_idx ON privacy_incidents (severity);
CREATE INDEX privacy_incidents_detected_at_idx ON privacy_incidents ("detectedAt");
CREATE INDEX privacy_incidents_npc_notification_due_at_idx ON privacy_incidents ("npcNotificationDueAt");
CREATE INDEX rate_limit_buckets_expires_at_idx ON rate_limit_buckets ("expiresAt");
CREATE INDEX audit_logs_timestamp_idx ON audit_logs (timestamp);
CREATE INDEX audit_logs_actor_email_idx ON audit_logs ("actorEmail");
CREATE INDEX audit_logs_resource_idx ON audit_logs (resource);
CREATE INDEX audit_logs_action_idx ON audit_logs (action);
CREATE INDEX audit_logs_outcome_idx ON audit_logs (outcome);
CREATE INDEX audit_logs_target_id_idx ON audit_logs ("targetId");
CREATE INDEX audit_logs_request_id_idx ON audit_logs ("requestId");
CREATE INDEX responders_agency_id_idx ON responders ("agencyId");
CREATE INDEX incident_escalations_incident_id_idx ON incident_escalations ("incidentId");
CREATE INDEX incident_escalations_source_city_municipality_id_idx ON incident_escalations ("sourceCityMunicipalityId");
CREATE INDEX incident_escalations_target_province_id_idx ON incident_escalations ("targetProvinceId");
CREATE INDEX incident_escalations_escalated_by_id_idx ON incident_escalations ("escalatedById");
CREATE INDEX mutual_aid_requests_incident_id_idx ON mutual_aid_requests ("incidentId");
CREATE INDEX mutual_aid_requests_requesting_jurisdiction_id_idx ON mutual_aid_requests ("requestingJurisdictionId");
CREATE INDEX mutual_aid_requests_target_jurisdiction_id_idx ON mutual_aid_requests ("targetJurisdictionId");
CREATE INDEX assignments_incident_id_idx ON assignments ("incidentId");
CREATE INDEX assignments_responder_id_idx ON assignments ("responderId");
CREATE INDEX users_email_idx ON users (email);
CREATE UNIQUE INDEX users_supabase_auth_user_id_idx ON users ("supabaseAuthUserId");
CREATE INDEX users_role_idx ON users (role);
CREATE INDEX users_archived_at_idx ON users ("archivedAt");
CREATE INDEX users_mobile_number_idx ON users ("mobileNumber");
CREATE INDEX users_mobile_auth_subject_idx ON users ("mobileAuthSubject");
CREATE INDEX citizens_archived_at_idx ON citizens ("archivedAt");
CREATE INDEX name_backfill_reviews_resolved_at_idx ON name_backfill_reviews ("resolvedAt");
CREATE INDEX mobile_app_content_archived_at_idx ON mobile_app_content ("archivedAt");
CREATE INDEX agencies_archived_at_idx ON agencies ("archivedAt");
CREATE INDEX responders_archived_at_idx ON responders ("archivedAt");
CREATE INDEX statuses_archived_at_idx ON statuses ("archivedAt");
CREATE INDEX categories_archived_at_idx ON categories ("archivedAt");
CREATE INDEX severities_archived_at_idx ON severities ("archivedAt");
CREATE INDEX incidents_archived_at_idx ON incidents ("archivedAt");
CREATE INDEX assignments_archived_at_idx ON assignments ("archivedAt");

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

CREATE TRIGGER set_auth_sessions_updated_at
BEFORE UPDATE ON auth_sessions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_password_reset_tokens_updated_at
BEFORE UPDATE ON password_reset_tokens
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_privacy_incidents_updated_at
BEFORE UPDATE ON privacy_incidents
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_rate_limit_buckets_updated_at
BEFORE UPDATE ON rate_limit_buckets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_citizens_updated_at
BEFORE UPDATE ON citizens
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_name_backfill_reviews_updated_at
BEFORE UPDATE ON name_backfill_reviews
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_mobile_app_content_updated_at
BEFORE UPDATE ON mobile_app_content
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_regions_updated_at
BEFORE UPDATE ON regions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_provinces_updated_at
BEFORE UPDATE ON provinces
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_cities_municipalities_updated_at
BEFORE UPDATE ON cities_municipalities
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_barangays_updated_at
BEFORE UPDATE ON barangays
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

CREATE TRIGGER set_case_tokens_updated_at
BEFORE UPDATE ON case_tokens
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_incident_status_history_updated_at
BEFORE UPDATE ON incident_status_history
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_incident_media_updated_at
BEFORE UPDATE ON incident_media
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_incident_escalations_updated_at
BEFORE UPDATE ON incident_escalations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_mutual_aid_requests_updated_at
BEFORE UPDATE ON mutual_aid_requests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_assignments_updated_at
BEFORE UPDATE ON assignments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
