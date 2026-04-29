import bcrypt from 'bcryptjs';
import { resetFeatureSelectionCache } from '../featureSelection.js';
import { resetRateLimitStateForTests } from '../middleware/rateLimit.js';

jest.setTimeout(60000);
jest.retryTimes(3, { logErrorsBeforeRetry: true });

function clearAmbientFeatureFlags(): void {
  delete process.env.API_KEYS;
  delete process.env.API_KEY;
  delete process.env.FEATURE_AUTH_PROVIDER;
  delete process.env.FEATURE_TOKEN_MODE;
  delete process.env.FEATURE_MFA_MODE;
  delete process.env.FEATURE_MEDIA_STORAGE;
  delete process.env.FEATURE_RECORD_DELETION;
  delete process.env.FEATURE_PROFILE_NAME;
  delete process.env.SUPABASE_AUTH_ENABLED;
  delete process.env.SUPABASE_JWT_ENABLED;
  delete process.env.SUPABASE_TOTP_ENABLED;
  delete process.env.SUPABASE_STORAGE_ENABLED;
}

process.env.MFA_ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY ?? 'test-only-mfa-encryption-key';
clearAmbientFeatureFlags();

const TEST_PASSWORD = 'Password123!';

async function ensureDefaultGeographyFixtures() {
  const { default: prisma } = await import('../lib/prisma.js');

  const region = await prisma.region.upsert({
    where: { code: '020000000' },
    update: { name: 'Cagayan Valley', designation: 'Region II', archivedAt: null },
    create: { code: '020000000', name: 'Cagayan Valley', designation: 'Region II' },
    select: { id: true },
  });

  const [isabelaProvince, cagayanProvince] = await Promise.all([
    prisma.province.upsert({
      where: { code: '023100000' },
      update: { name: 'Isabela', regionId: region.id, archivedAt: null },
      create: { code: '023100000', name: 'Isabela', regionId: region.id },
      select: { id: true },
    }),
    prisma.province.upsert({
      where: { code: '021500000' },
      update: { name: 'Cagayan', regionId: region.id, archivedAt: null },
      create: { code: '021500000', name: 'Cagayan', regionId: region.id },
      select: { id: true },
    }),
  ]);

  const [ilaganCity, tuguegaraoCity] = await Promise.all([
    prisma.cityMunicipality.upsert({
      where: { code: '023101000' },
      update: {
        name: 'Ilagan City',
        type: 'CITY',
        provinceId: isabelaProvince.id,
        archivedAt: null,
      },
      create: {
        code: '023101000',
        name: 'Ilagan City',
        type: 'CITY',
        provinceId: isabelaProvince.id,
      },
      select: { id: true },
    }),
    prisma.cityMunicipality.upsert({
      where: { code: '021529000' },
      update: {
        name: 'Tuguegarao City',
        type: 'CITY',
        provinceId: cagayanProvince.id,
        archivedAt: null,
      },
      create: {
        code: '021529000',
        name: 'Tuguegarao City',
        type: 'CITY',
        provinceId: cagayanProvince.id,
      },
      select: { id: true },
    }),
  ]);

  await Promise.all([
    prisma.barangay.upsert({
      where: { code: '023101001' },
      update: { name: 'San Felipe', cityMunicipalityId: ilaganCity.id, archivedAt: null },
      create: { code: '023101001', name: 'San Felipe', cityMunicipalityId: ilaganCity.id },
      select: { id: true },
    }),
    prisma.barangay.upsert({
      where: { code: '021529001' },
      update: { name: 'Centro 01', cityMunicipalityId: tuguegaraoCity.id, archivedAt: null },
      create: { code: '021529001', name: 'Centro 01', cityMunicipalityId: tuguegaraoCity.id },
      select: { id: true },
    }),
  ]);

  return {
    isabelaProvinceId: isabelaProvince.id,
    ilaganCityId: ilaganCity.id,
    tuguegaraoCityId: tuguegaraoCity.id,
  };
}

async function seedTestUsers(): Promise<void> {
  const { default: prisma } = await import('../lib/prisma.js');
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const { isabelaProvinceId, ilaganCityId, tuguegaraoCityId } =
    await ensureDefaultGeographyFixtures();

  const users = [
    { name: 'System Admin', email: 'admin@xypes.local', role: 'NATIONAL_ADMIN' },
    {
      name: 'Ops Lead',
      email: 'ops.lead@xypes.local',
      role: 'CITY_ADMIN',
      jurisdictionType: 'city',
      jurisdictionId: ilaganCityId,
    },
    {
      name: 'City Content Editor',
      email: 'content.editor@xypes.local',
      role: 'CITY_CONTENT_EDITOR',
      jurisdictionType: 'city',
      jurisdictionId: ilaganCityId,
    },
    {
      name: 'Dispatcher',
      email: 'dispatcher@xypes.local',
      role: 'DISPATCHER',
      jurisdictionType: 'city',
      jurisdictionId: ilaganCityId,
    },
    {
      name: 'Tuguegarao City Admin',
      email: 'tuguegarao.city.admin@xypes.local',
      role: 'CITY_ADMIN',
      jurisdictionType: 'city',
      jurisdictionId: tuguegaraoCityId,
    },
    {
      name: 'Provincial Admin',
      email: 'provincial.admin@xypes.local',
      role: 'PROVINCIAL_ADMIN',
      jurisdictionType: 'province',
      jurisdictionId: isabelaProvinceId,
    },
    { name: 'Responder', email: 'responder@xypes.local', role: 'RESPONDER' },
    { name: 'Analyst', email: 'analyst@xypes.local', role: 'CITIZEN_REPORTER' },
    { name: 'Auditor', email: 'auditor@xypes.local', role: 'AUDITOR' },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash,
        archivedAt: null,
        jurisdictionType: user.jurisdictionType ?? null,
        jurisdictionId: user.jurisdictionId ?? null,
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaEnabledAt: null,
      },
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash,
        jurisdictionType: user.jurisdictionType ?? null,
        jurisdictionId: user.jurisdictionId ?? null,
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaEnabledAt: null,
      },
    });
  }
}

beforeAll(async () => {
  const { default: prisma } = await import('../lib/prisma.js');

  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), name text NOT NULL, email text NOT NULL UNIQUE, "passwordHash" text NOT NULL, role text NOT NULL DEFAULT 'CITIZEN_REPORTER')`,
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "privacyNoticeAcceptedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "privacyNoticeVersion" text',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS auth_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, "expiresAt" timestamptz NOT NULL, "refreshTokenHash" text NOT NULL DEFAULT \'\', "refreshExpiresAt" timestamptz NOT NULL DEFAULT NOW(), "refreshUsedAt" timestamptz, "revokedAt" timestamptz, "lastUsedAt" timestamptz, "userAgent" text, "ipAddress" text)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS password_reset_tokens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, "tokenHash" text NOT NULL UNIQUE, "expiresAt" timestamptz NOT NULL, "usedAt" timestamptz)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS rate_limit_buckets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "bucketKey" text NOT NULL UNIQUE, count integer NOT NULL, "windowStart" timestamptz NOT NULL, "expiresAt" timestamptz NOT NULL)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS statuses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), name text NOT NULL)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS citizens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), name text NOT NULL, "contactInfo" text NOT NULL, "preferredChannel" text NOT NULL)',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE citizens ADD COLUMN IF NOT EXISTS "privacyNoticeAcceptedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE citizens ADD COLUMN IF NOT EXISTS "privacyNoticeVersion" text',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS data_subject_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "requesterUserId" uuid REFERENCES users(id) ON DELETE SET NULL, "reviewerUserId" uuid REFERENCES users(id) ON DELETE SET NULL, "citizenId" uuid REFERENCES citizens(id) ON DELETE SET NULL, "requestType" text NOT NULL, status text NOT NULL DEFAULT \'SUBMITTED\', channel text NOT NULL DEFAULT \'self-service\', "requesterEmail" text, details text, "reviewerNotes" text, "resolutionSummary" text, "acknowledgedAt" timestamptz, "reviewedAt" timestamptz, "resolvedAt" timestamptz, "dueAt" timestamptz NOT NULL, metadata jsonb)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS privacy_incidents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "reportedByUserId" uuid REFERENCES users(id) ON DELETE SET NULL, "reviewedByUserId" uuid REFERENCES users(id) ON DELETE SET NULL, "referenceCode" text NOT NULL UNIQUE, status text NOT NULL DEFAULT \'REPORTED\', severity text NOT NULL DEFAULT \'HIGH\', "detectedAt" timestamptz NOT NULL, "occurredAt" timestamptz, summary text NOT NULL, details text, "likelyPersonalDataBreach" boolean NOT NULL DEFAULT true, "npcNotificationRequired" boolean NOT NULL DEFAULT false, "npcNotificationDueAt" timestamptz, "npcNotifiedAt" timestamptz, "npcNotificationReference" text, "dataSubjectNotificationRequired" boolean NOT NULL DEFAULT false, "dataSubjectNotifiedAt" timestamptz, "dataSubjectNotificationReference" text, "affectedRecordCount" integer, "affectedDataCategories" text[] NOT NULL DEFAULT ARRAY[]::text[], "containmentActions" text, "riskAssessment" text, "reviewerNotes" text, "resolutionSummary" text, "closedAt" timestamptz, metadata jsonb)',
  );
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS mobile_app_content (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "archivedAt" timestamptz, slug text NOT NULL UNIQUE, title text NOT NULL, summary text, body text NOT NULL, "contentType" text NOT NULL DEFAULT 'announcement', placement text NOT NULL DEFAULT 'home', audience text, "imageUrl" text, "ctaLabel" text, "ctaUrl" text, "sortOrder" integer NOT NULL DEFAULT 0, "isPublished" boolean NOT NULL DEFAULT false, "publishedAt" timestamptz, "startsAt" timestamptz, "endsAt" timestamptz, metadata jsonb)`,
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS regions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), code text NOT NULL UNIQUE, name text NOT NULL, designation text)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS provinces (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), code text NOT NULL UNIQUE, name text NOT NULL, "regionId" uuid NOT NULL REFERENCES regions(id))',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS cities_municipalities (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), code text NOT NULL UNIQUE, name text NOT NULL, type text NOT NULL, "provinceId" uuid NOT NULL REFERENCES provinces(id))',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS barangays (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), code text NOT NULL UNIQUE, name text NOT NULL, "cityMunicipalityId" uuid NOT NULL REFERENCES cities_municipalities(id))',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS agencies (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), name text NOT NULL, "contactNumber" text)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS responders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), name text NOT NULL, "agencyId" uuid NOT NULL REFERENCES agencies(id), role text NOT NULL, "contactInfo" text NOT NULL)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), name text NOT NULL, "subCategory" text)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS severities (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), level text NOT NULL UNIQUE, definition text)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS incidents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), description text NOT NULL, "mediaUrl" text, "dateReported" timestamptz NOT NULL DEFAULT NOW(), latitude numeric(10, 7), longitude numeric(10, 7), "addressLine1" text, "addressLine2" text, barangay text, "districtName" text, "cityName" text, "provinceName" text, "regionName" text, "postalCode" text, landmark text, "statusId" uuid NOT NULL REFERENCES statuses(id), "citizenId" uuid NOT NULL REFERENCES citizens(id), "categoryId" uuid NOT NULL REFERENCES categories(id), "severityId" uuid NOT NULL REFERENCES severities(id))',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS incident_media (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "incidentId" uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, "mediaUrl" text NOT NULL, "displayOrder" integer NOT NULL DEFAULT 0)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS assignments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "incidentId" uuid NOT NULL REFERENCES incidents(id), "responderId" uuid NOT NULL REFERENCES responders(id), "assignedDate" timestamptz NOT NULL DEFAULT NOW(), "responseStart" timestamptz, "responseEnd" timestamptz, outcome text, notes text)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS case_tokens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "archivedAt" timestamptz, "incidentId" uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, "tokenHash" text NOT NULL UNIQUE, "expiresAt" timestamptz NOT NULL, "revokedAt" timestamptz, "lastUsedAt" timestamptz)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS incident_status_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "archivedAt" timestamptz, "incidentId" uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, "fromStatusId" uuid REFERENCES statuses(id), "toStatusId" uuid NOT NULL REFERENCES statuses(id), "changedByUserId" uuid REFERENCES users(id) ON DELETE SET NULL, note text)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS incident_escalations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "incidentId" uuid NOT NULL REFERENCES incidents(id), "fromLevel" text NOT NULL, "toLevel" text NOT NULL, "escalatedById" uuid NOT NULL, reason text NOT NULL, status text NOT NULL)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS mutual_aid_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "incidentId" uuid NOT NULL REFERENCES incidents(id), "requestingJurisdictionId" uuid NOT NULL, "targetJurisdictionId" uuid NOT NULL, "requestedById" uuid NOT NULL, status text NOT NULL, notes text)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), timestamp timestamptz NOT NULL DEFAULT NOW(), action text NOT NULL, summary text NOT NULL, outcome text NOT NULL, "actorUserId" uuid, "actorEmail" text, "actorRole" text, resource text NOT NULL, method text NOT NULL, path text NOT NULL, "statusCode" integer, "targetId" text, "ipAddress" text, "userAgent" text, "requestId" text, metadata jsonb)',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS latitude numeric(10, 7)',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "publicReference" text',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS longitude numeric(10, 7)',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "addressLine1" text',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "addressLine2" text',
  );
  await prisma.$executeRawUnsafe('ALTER TABLE incidents ADD COLUMN IF NOT EXISTS barangay text');
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "districtName" text',
  );
  await prisma.$executeRawUnsafe('ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "cityName" text');
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "provinceName" text',
  );
  await prisma.$executeRawUnsafe('ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "regionId" uuid');
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "provinceId" uuid',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "cityMunicipalityId" uuid',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "barangayId" uuid',
  );
  await prisma.$executeRawUnsafe('ALTER TABLE agencies ADD COLUMN IF NOT EXISTS "regionId" uuid');
  await prisma.$executeRawUnsafe('ALTER TABLE agencies ADD COLUMN IF NOT EXISTS "provinceId" uuid');
  await prisma.$executeRawUnsafe(
    'ALTER TABLE agencies ADD COLUMN IF NOT EXISTS "cityMunicipalityId" uuid',
  );
  await prisma.$executeRawUnsafe('ALTER TABLE agencies ADD COLUMN IF NOT EXISTS "barangayId" uuid');
  await prisma.$executeRawUnsafe(
    'ALTER TABLE agencies ADD COLUMN IF NOT EXISTS "jurisdictionType" text',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE agencies ADD COLUMN IF NOT EXISTS "jurisdictionId" uuid',
  );
  await prisma.$executeRawUnsafe('ALTER TABLE agencies ADD COLUMN IF NOT EXISTS "agencyType" text');
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "regionName" text',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "postalCode" text',
  );
  await prisma.$executeRawUnsafe('ALTER TABLE incidents ADD COLUMN IF NOT EXISTS landmark text');
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE citizens ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE mobile_app_content ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE mobile_app_content ADD COLUMN IF NOT EXISTS summary text',
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE mobile_app_content ADD COLUMN IF NOT EXISTS "contentType" text NOT NULL DEFAULT 'announcement'`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE mobile_app_content ADD COLUMN IF NOT EXISTS placement text NOT NULL DEFAULT 'home'`,
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE mobile_app_content ADD COLUMN IF NOT EXISTS audience text',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE mobile_app_content ADD COLUMN IF NOT EXISTS "imageUrl" text',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE mobile_app_content ADD COLUMN IF NOT EXISTS "ctaLabel" text',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE mobile_app_content ADD COLUMN IF NOT EXISTS "ctaUrl" text',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE mobile_app_content ADD COLUMN IF NOT EXISTS "sortOrder" integer NOT NULL DEFAULT 0',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE mobile_app_content ADD COLUMN IF NOT EXISTS "isPublished" boolean NOT NULL DEFAULT false',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE mobile_app_content ADD COLUMN IF NOT EXISTS "publishedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE mobile_app_content ADD COLUMN IF NOT EXISTS "startsAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE mobile_app_content ADD COLUMN IF NOT EXISTS "endsAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE mobile_app_content ADD COLUMN IF NOT EXISTS metadata jsonb',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE regions ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE provinces ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE cities_municipalities ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE barangays ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE agencies ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE responders ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE statuses ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE categories ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE severities ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incidents ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE assignments ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE case_tokens ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incident_status_history ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incident_escalations ADD COLUMN IF NOT EXISTS "sourceCityMunicipalityId" uuid',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE incident_escalations ADD COLUMN IF NOT EXISTS "targetProvinceId" uuid',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS "refreshTokenHash" text NOT NULL DEFAULT \'\'',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS "refreshExpiresAt" timestamptz NOT NULL DEFAULT NOW()',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS "refreshUsedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions ("userId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS incident_media_incident_id_idx ON incident_media ("incidentId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS incident_media_incident_id_display_order_idx ON incident_media ("incidentId", "displayOrder")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS users_archived_at_idx ON users ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS citizens_archived_at_idx ON citizens ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS data_subject_requests_requester_user_id_idx ON data_subject_requests ("requesterUserId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS data_subject_requests_reviewer_user_id_idx ON data_subject_requests ("reviewerUserId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS data_subject_requests_citizen_id_idx ON data_subject_requests ("citizenId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS data_subject_requests_status_idx ON data_subject_requests (status)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS data_subject_requests_due_at_idx ON data_subject_requests ("dueAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS privacy_incidents_reported_by_user_id_idx ON privacy_incidents ("reportedByUserId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS privacy_incidents_reviewed_by_user_id_idx ON privacy_incidents ("reviewedByUserId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS privacy_incidents_status_idx ON privacy_incidents (status)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS privacy_incidents_severity_idx ON privacy_incidents (severity)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS privacy_incidents_detected_at_idx ON privacy_incidents ("detectedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS privacy_incidents_npc_notification_due_at_idx ON privacy_incidents ("npcNotificationDueAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS mobile_app_content_archived_at_idx ON mobile_app_content ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS mobile_app_content_is_published_idx ON mobile_app_content ("isPublished")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS mobile_app_content_placement_idx ON mobile_app_content (placement)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS mobile_app_content_audience_idx ON mobile_app_content (audience)',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS agencies_archived_at_idx ON agencies ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS regions_archived_at_idx ON regions ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS provinces_archived_at_idx ON provinces ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS cities_municipalities_archived_at_idx ON cities_municipalities ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS barangays_archived_at_idx ON barangays ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS responders_archived_at_idx ON responders ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS provinces_region_id_idx ON provinces ("regionId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS cities_municipalities_province_id_idx ON cities_municipalities ("provinceId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS barangays_city_municipality_id_idx ON barangays ("cityMunicipalityId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS statuses_archived_at_idx ON statuses ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS categories_archived_at_idx ON categories ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS severities_archived_at_idx ON severities ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS incidents_archived_at_idx ON incidents ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS assignments_archived_at_idx ON assignments ("archivedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS incidents_public_reference_idx ON incidents ("publicReference") WHERE "publicReference" IS NOT NULL',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS case_tokens_incident_id_idx ON case_tokens ("incidentId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS case_tokens_expires_at_idx ON case_tokens ("expiresAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS case_tokens_revoked_at_idx ON case_tokens ("revokedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS incident_status_history_incident_id_created_at_idx ON incident_status_history ("incidentId", "createdAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS incident_escalations_incident_id_idx ON incident_escalations ("incidentId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS incident_escalations_source_city_municipality_id_idx ON incident_escalations ("sourceCityMunicipalityId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS incident_escalations_target_province_id_idx ON incident_escalations ("targetProvinceId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS incident_escalations_escalated_by_id_idx ON incident_escalations ("escalatedById")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS mutual_aid_requests_incident_id_idx ON mutual_aid_requests ("incidentId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS mutual_aid_requests_requesting_jurisdiction_id_idx ON mutual_aid_requests ("requestingJurisdictionId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS mutual_aid_requests_target_jurisdiction_id_idx ON mutual_aid_requests ("targetJurisdictionId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS incident_status_history_from_status_id_idx ON incident_status_history ("fromStatusId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS incident_status_history_to_status_id_idx ON incident_status_history ("toStatusId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS incident_status_history_changed_by_user_id_idx ON incident_status_history ("changedByUserId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions ("expiresAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS auth_sessions_refresh_expires_at_idx ON auth_sessions ("refreshExpiresAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS auth_sessions_revoked_at_idx ON auth_sessions ("revokedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens ("userId")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx ON password_reset_tokens ("expiresAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS password_reset_tokens_used_at_idx ON password_reset_tokens ("usedAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS rate_limit_buckets_expires_at_idx ON rate_limit_buckets ("expiresAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW."updatedAt" = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql',
  );
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_auth_sessions_updated_at') THEN
        CREATE TRIGGER set_auth_sessions_updated_at
        BEFORE UPDATE ON auth_sessions
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_password_reset_tokens_updated_at') THEN
        CREATE TRIGGER set_password_reset_tokens_updated_at
        BEFORE UPDATE ON password_reset_tokens
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_privacy_incidents_updated_at') THEN
        CREATE TRIGGER set_privacy_incidents_updated_at
        BEFORE UPDATE ON privacy_incidents
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_rate_limit_buckets_updated_at') THEN
        CREATE TRIGGER set_rate_limit_buckets_updated_at
        BEFORE UPDATE ON rate_limit_buckets
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_statuses_updated_at') THEN
        CREATE TRIGGER set_statuses_updated_at
        BEFORE UPDATE ON statuses
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_citizens_updated_at') THEN
        CREATE TRIGGER set_citizens_updated_at
        BEFORE UPDATE ON citizens
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_mobile_app_content_updated_at') THEN
        CREATE TRIGGER set_mobile_app_content_updated_at
        BEFORE UPDATE ON mobile_app_content
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_regions_updated_at') THEN
        CREATE TRIGGER set_regions_updated_at
        BEFORE UPDATE ON regions
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_provinces_updated_at') THEN
        CREATE TRIGGER set_provinces_updated_at
        BEFORE UPDATE ON provinces
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_cities_municipalities_updated_at') THEN
        CREATE TRIGGER set_cities_municipalities_updated_at
        BEFORE UPDATE ON cities_municipalities
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_barangays_updated_at') THEN
        CREATE TRIGGER set_barangays_updated_at
        BEFORE UPDATE ON barangays
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_agencies_updated_at') THEN
        CREATE TRIGGER set_agencies_updated_at
        BEFORE UPDATE ON agencies
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_responders_updated_at') THEN
        CREATE TRIGGER set_responders_updated_at
        BEFORE UPDATE ON responders
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_categories_updated_at') THEN
        CREATE TRIGGER set_categories_updated_at
        BEFORE UPDATE ON categories
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_severities_updated_at') THEN
        CREATE TRIGGER set_severities_updated_at
        BEFORE UPDATE ON severities
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_incidents_updated_at') THEN
        CREATE TRIGGER set_incidents_updated_at
        BEFORE UPDATE ON incidents
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_incident_media_updated_at') THEN
        CREATE TRIGGER set_incident_media_updated_at
        BEFORE UPDATE ON incident_media
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_assignments_updated_at') THEN
        CREATE TRIGGER set_assignments_updated_at
        BEFORE UPDATE ON assignments
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_case_tokens_updated_at') THEN
        CREATE TRIGGER set_case_tokens_updated_at
        BEFORE UPDATE ON case_tokens
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_incident_status_history_updated_at') THEN
        CREATE TRIGGER set_incident_status_history_updated_at
        BEFORE UPDATE ON incident_status_history
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_incident_escalations_updated_at') THEN
        CREATE TRIGGER set_incident_escalations_updated_at
        BEFORE UPDATE ON incident_escalations
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_mutual_aid_requests_updated_at') THEN
        CREATE TRIGGER set_mutual_aid_requests_updated_at
        BEFORE UPDATE ON mutual_aid_requests
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_audit_logs_updated_at') THEN
        CREATE TRIGGER set_audit_logs_updated_at
        BEFORE UPDATE ON audit_logs
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;
    END
    $$;
  `);
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "mfaEnabled" boolean NOT NULL DEFAULT false',
  );
  await prisma.$executeRawUnsafe('ALTER TABLE users ALTER COLUMN "passwordHash" DROP NOT NULL');
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "supabaseAuthUserId" uuid',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "jurisdictionType" text',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "jurisdictionId" uuid',
  );
  await prisma.$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS "mobileNumber" text');
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "mobileNumberVerifiedAt" timestamptz',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "mobileAuthSubject" text',
  );
  await prisma.$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS "citizenId" uuid');
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS users_supabase_auth_user_id_idx ON users ("supabaseAuthUserId") WHERE "supabaseAuthUserId" IS NOT NULL',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS users_mobile_number_idx ON users ("mobileNumber") WHERE "mobileNumber" IS NOT NULL',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS users_mobile_auth_subject_idx ON users ("mobileAuthSubject") WHERE "mobileAuthSubject" IS NOT NULL',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS users_citizen_id_idx ON users ("citizenId") WHERE "citizenId" IS NOT NULL',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "mfaSecretEncrypted" text',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS "mfaEnabledAt" timestamptz',
  );
  await prisma.$executeRawUnsafe('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
  await prisma.$executeRawUnsafe(
    "ALTER TABLE users ALTER COLUMN role SET DEFAULT 'CITIZEN_REPORTER'",
  );
  await prisma.$executeRawUnsafe(
    `UPDATE users
     SET role = CASE
       WHEN LOWER(role) IN ('super_admin', 'system_admin', 'admin', 'national_admin') THEN 'NATIONAL_ADMIN'
       WHEN LOWER(role) IN ('department_manager', 'manager', 'city_admin') THEN 'CITY_ADMIN'
       WHEN LOWER(role) = 'editor' THEN 'DISPATCHER'
       WHEN LOWER(role) IN ('supervisor', 'provincial_admin') THEN 'PROVINCIAL_ADMIN'
       WHEN LOWER(role) = 'regional_director' THEN 'REGIONAL_DIRECTOR'
       WHEN LOWER(role) = 'dispatcher' THEN 'DISPATCHER'
       WHEN LOWER(role) = 'responder' THEN 'RESPONDER'
       WHEN LOWER(role) = 'auditor' THEN 'AUDITOR'
       WHEN LOWER(role) IN ('viewer', 'citizen', 'citizen_reporter', 'reporter') THEN 'CITIZEN_REPORTER'
       ELSE 'CITIZEN_REPORTER'
     END`,
  );
  await prisma.$executeRawUnsafe(
    `UPDATE users
     SET role = CASE
       WHEN LOWER(email) = 'admin@xypes.local' THEN 'NATIONAL_ADMIN'
       WHEN LOWER(email) = 'ops.lead@xypes.local' THEN 'CITY_ADMIN'
       WHEN LOWER(email) = 'content.editor@xypes.local' THEN 'CITY_CONTENT_EDITOR'
       WHEN LOWER(email) = 'dispatcher@xypes.local' THEN 'DISPATCHER'
       WHEN LOWER(email) = 'analyst@xypes.local' THEN 'CITIZEN_REPORTER'
       WHEN LOWER(email) = 'provincial.admin@xypes.local' THEN 'PROVINCIAL_ADMIN'
       WHEN LOWER(email) = 'responder@xypes.local' THEN 'RESPONDER'
       WHEN LOWER(email) = 'auditor@xypes.local' THEN 'AUDITOR'
       ELSE role
     END`,
  );
  await prisma.$executeRawUnsafe(
    'UPDATE users SET "mfaEnabled" = false, "mfaSecretEncrypted" = NULL, "mfaEnabledAt" = NULL',
  );
  await prisma.$executeRawUnsafe(
    `DO $$
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
     END $$`,
  );
  await prisma.$executeRawUnsafe(
    `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1
         FROM pg_constraint
         WHERE conname = 'users_role_check'
           AND conrelid = 'users'::regclass
       ) THEN
         ALTER TABLE users
         ADD CONSTRAINT users_role_check CHECK (
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
         );
       END IF;
     END $$`,
  );
  await prisma.$executeRawUnsafe(
    "INSERT INTO statuses (name) SELECT 'Reported' WHERE NOT EXISTS (SELECT 1 FROM statuses WHERE name = 'Reported')",
  );
  await prisma.$executeRawUnsafe(
    "INSERT INTO statuses (name) SELECT 'In Progress' WHERE NOT EXISTS (SELECT 1 FROM statuses WHERE name = 'In Progress')",
  );

  await seedTestUsers();
});

beforeEach(async () => {
  clearAmbientFeatureFlags();
  resetFeatureSelectionCache();
  resetRateLimitStateForTests();

  const { default: prisma } = await import('../lib/prisma.js');
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS rate_limit_buckets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT NOW(), "updatedAt" timestamptz NOT NULL DEFAULT NOW(), "bucketKey" text NOT NULL UNIQUE, count integer NOT NULL, "windowStart" timestamptz NOT NULL, "expiresAt" timestamptz NOT NULL)',
  );
  await prisma.$executeRawUnsafe('TRUNCATE TABLE rate_limit_buckets');
  await seedTestUsers();
});

afterAll(async () => {
  const { default: prisma } = await import('../lib/prisma.js');
  await prisma.$disconnect();
});
