import request from 'supertest';
import bcrypt from 'bcryptjs';
import { normalizeMobileNumber } from '../utils/mobileAuth.js';

jest.setTimeout(60000);

function createSecurityTestEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };

  delete env.API_KEYS;
  delete env.API_KEY;
  delete env.FEATURE_AUTH_PROVIDER;
  delete env.FEATURE_TOKEN_MODE;
  delete env.FEATURE_MFA_MODE;
  delete env.FEATURE_MEDIA_STORAGE;
  delete env.FEATURE_RECORD_DELETION;
  delete env.FEATURE_PROFILE_NAME;
  delete env.SUPABASE_AUTH_ENABLED;
  delete env.SUPABASE_JWT_ENABLED;
  delete env.SUPABASE_TOTP_ENABLED;
  delete env.SUPABASE_STORAGE_ENABLED;
  delete env.RATE_LIMIT_STORE;
  delete env.TEST_API_KEYS_ENABLED;

  env.NODE_ENV = 'test';
  env.FEATURE_AUTH_PROVIDER = 'local';
  env.FEATURE_TOKEN_MODE = 'app-jwt';
  env.FEATURE_MFA_MODE = 'local-totp';
  env.FEATURE_MEDIA_STORAGE = 'disabled';
  env.FEATURE_RECORD_DELETION = 'archive';
  env.FEATURE_PROFILE_NAME = 'jest-security-test';
  env.RATE_LIMIT_STORE = 'memory';
  env.SUPABASE_AUTH_ENABLED = 'false';
  env.SUPABASE_JWT_ENABLED = 'false';
  env.SUPABASE_TOTP_ENABLED = 'false';
  env.SUPABASE_STORAGE_ENABLED = 'false';

  return env;
}

async function ensureSecurityTestUsers(): Promise<void> {
  const { default: prisma } = await import('../lib/prisma.js');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const users = [
    { name: 'System Admin', email: 'admin@xypes.local', role: 'NATIONAL_ADMIN' },
    { name: 'Analyst', email: 'analyst@xypes.local', role: 'CITIZEN_REPORTER' },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash,
        archivedAt: null,
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaEnabledAt: null,
      },
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash,
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaEnabledAt: null,
      },
    });
  }
}

async function clearMobileAuthTestFixtures(): Promise<void> {
  const { default: prisma } = await import('../lib/prisma.js');
  const mobileNumbers = ['09170001001', '09170001002', '09170002001', '09170002002']
    .map((value) => normalizeMobileNumber(value))
    .filter((value): value is string => Boolean(value));

  const linkedUsers = await prisma.user.findMany({
    where: { mobileNumber: { in: mobileNumbers } },
    select: { citizenId: true },
  });

  await prisma.user.deleteMany({
    where: { mobileNumber: { in: mobileNumbers } },
  });

  const citizenIds = linkedUsers
    .map((user) => user.citizenId)
    .filter((citizenId): citizenId is string => Boolean(citizenId));

  if (citizenIds.length > 0) {
    await prisma.citizen.deleteMany({
      where: { id: { in: citizenIds } },
    });
  }

  await prisma.citizen.deleteMany({
    where: { contactInfo: { in: mobileNumbers } },
  });
}

async function ensureTuguegaraoLocalityScope(): Promise<void> {
  const { default: prisma } = await import('../lib/prisma.js');
  const archivedAt = new Date();

  await prisma.region.updateMany({
    where: {
      name: 'Cagayan Valley',
      code: { not: '020000000' },
      archivedAt: null,
    },
    data: { archivedAt },
  });

  const region = await prisma.region.upsert({
    where: { code: '020000000' },
    update: { name: 'Cagayan Valley', archivedAt: null },
    create: { code: '020000000', name: 'Cagayan Valley', designation: 'Region II' },
  });

  await prisma.province.updateMany({
    where: {
      name: 'Cagayan',
      code: { not: '021500000' },
      archivedAt: null,
    },
    data: { archivedAt },
  });

  const province = await prisma.province.upsert({
    where: { code: '021500000' },
    update: { name: 'Cagayan', regionId: region.id, archivedAt: null },
    create: { code: '021500000', name: 'Cagayan', regionId: region.id },
  });

  await prisma.cityMunicipality.updateMany({
    where: {
      name: 'Tuguegarao City',
      code: { not: '021529000' },
      archivedAt: null,
    },
    data: { archivedAt },
  });

  const city = await prisma.cityMunicipality.upsert({
    where: { code: '021529000' },
    update: {
      name: 'Tuguegarao City',
      type: 'CITY',
      provinceId: province.id,
      archivedAt: null,
    },
    create: {
      code: '021529000',
      name: 'Tuguegarao City',
      type: 'CITY',
      provinceId: province.id,
    },
  });

  await prisma.barangay.updateMany({
    where: {
      name: 'Centro 10',
      cityMunicipalityId: city.id,
      code: { not: '021529003' },
      archivedAt: null,
    },
    data: { archivedAt },
  });

  await prisma.barangay.upsert({
    where: { code: '021529003' },
    update: {
      name: 'Centro 10',
      cityMunicipalityId: city.id,
      archivedAt: null,
    },
    create: {
      code: '021529003',
      name: 'Centro 10',
      cityMunicipalityId: city.id,
    },
  });
}

describe('API key authentication', () => {
  const originalEnv = createSecurityTestEnv();

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.TEST_API_KEYS_ENABLED = 'true';
    process.env.API_KEYS = 'test-key';
    process.env.RATE_LIMIT_ENABLED = 'false';
    const { resetFeatureSelectionCache } = await import('../featureSelection.js');
    resetFeatureSelectionCache();
    await ensureSecurityTestUsers();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 401 for protected route without API key', async () => {
    const { default: app, API_V1 } = await import('../app.js');

    const response = await request(app).get(`${API_V1}/users/capabilities`);

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message');
  });

  it('allows access to protected route with valid API key', async () => {
    const { default: app, API_V1 } = await import('../app.js');

    const response = await request(app)
      .get(`${API_V1}/users/capabilities`)
      .set('x-api-key', 'test-key');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message', 'Unauthorized: bearer token required');
  });

  it('keeps health endpoint public', async () => {
    const { default: app, API_V1 } = await import('../app.js');

    const response = await request(app).get(`${API_V1}/health`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('bypasses API key enforcement for the narrow /mobile namespace but not for adjacent admin CRUD routes', async () => {
    const { default: app, API_V1 } = await import('../app.js');

    const mobileProfileResponse = await request(app).get(`${API_V1}/mobile/profile`);
    const mobileContentResponse = await request(app).get(`${API_V1}/mobile/content`);
    const mobileAdminCrudResponse = await request(app).get(`${API_V1}/mobile-content`);

    expect(mobileProfileResponse.status).toBe(401);
    expect(mobileProfileResponse.body).toHaveProperty(
      'message',
      'Unauthorized: bearer token required',
    );
    expect(mobileContentResponse.status).toBe(200);
    expect(Array.isArray(mobileContentResponse.body)).toBe(true);
    expect(mobileAdminCrudResponse.status).toBe(401);
    expect(mobileAdminCrudResponse.body).toHaveProperty(
      'message',
      'Unauthorized: valid API key required',
    );
  });
});

describe('Rate limiting', () => {
  const originalEnv = createSecurityTestEnv();

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.API_KEYS;
    delete process.env.API_KEY;
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '2';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 429 after exceeding configured request limit', async () => {
    const { default: app, API_V1 } = await import('../app.js');

    const first = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'WrongPassword!',
    });
    const second = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'WrongPassword!',
    });
    const third = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'WrongPassword!',
    });

    expect(first.status).toBe(401);
    expect(second.status).toBe(401);
    expect(third.status).toBe(429);
    expect(third.body).toHaveProperty('message');
    expect(third.headers['retry-after']).toBeDefined();
    expect(third.headers['x-ratelimit-limit']).toBe('2');
    expect(third.headers['x-ratelimit-remaining']).toBe('0');
  });

  it('does not apply limit to health endpoint', async () => {
    const { default: app, API_V1 } = await import('../app.js');

    const first = await request(app).get(`${API_V1}/health`);
    const second = await request(app).get(`${API_V1}/health`);
    const third = await request(app).get(`${API_V1}/health`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(200);
  });
});

describe('Endpoint-specific rate limiting', () => {
  const originalEnv = createSecurityTestEnv();

  beforeEach(async () => {
    jest.resetModules();
    jest.doMock('../services/supabaseAuthService.js', () => {
      const actual = jest.requireActual(
        '../services/supabaseAuthService.js',
      ) as typeof import('../services/supabaseAuthService.js');

      return {
        ...actual,
        isSupabaseAuthEnabled: () => false,
        isSupabaseJwtEnabled: () => false,
        isSupabaseTotpEnabled: () => false,
      };
    });
    process.env = { ...originalEnv };
    delete process.env.API_KEYS;
    delete process.env.API_KEY;
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '100';
    const { resetFeatureSelectionCache } = await import('../featureSelection.js');
    resetFeatureSelectionCache();
    await clearMobileAuthTestFixtures();
  });

  afterEach(() => {
    jest.dontMock('../services/supabaseAuthService.js');
    process.env = originalEnv;
  });

  it('applies a stricter login limit keyed by email and client', async () => {
    process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.AUTH_LOGIN_RATE_LIMIT_MAX_REQUESTS = '2';

    const { default: app, API_V1 } = await import('../app.js');

    const first = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'WrongPassword!',
    });
    const second = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'WrongPassword!',
    });
    const third = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'WrongPassword!',
    });
    const differentEmail = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'analyst@xypes.local',
      password: 'WrongPassword!',
    });

    expect(first.status).toBe(401);
    expect(second.status).toBe(401);
    expect(third.status).toBe(429);
    expect(third.headers['x-ratelimit-limit']).toBe('2');
    expect(differentEmail.status).toBe(401);
  });

  it('applies a stricter mobile register limit keyed by mobile number and client', async () => {
    process.env.TRUST_PROXY = 'true';
    process.env.AUTH_MOBILE_REGISTER_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.AUTH_MOBILE_REGISTER_RATE_LIMIT_MAX_REQUESTS = '1';

    const { default: app, API_V1 } = await import('../app.js');

    const first = await request(app)
      .post(`${API_V1}/auth/mobile/register`)
      .set('X-Forwarded-For', '198.51.100.10')
      .send({
        name: 'Mobile Register Limit One',
        mobileNumber: '09170001001',
        password: 'Password123!',
      });
    const second = await request(app)
      .post(`${API_V1}/auth/mobile/register`)
      .set('X-Forwarded-For', '198.51.100.10')
      .send({
        name: 'Mobile Register Limit Retry',
        mobileNumber: '09170001001',
        password: 'Password123!',
      });
    const differentMobile = await request(app)
      .post(`${API_V1}/auth/mobile/register`)
      .set('X-Forwarded-For', '198.51.100.10')
      .send({
        name: 'Mobile Register Limit Two',
        mobileNumber: '09170001002',
        password: 'Password123!',
      });
    const differentClient = await request(app)
      .post(`${API_V1}/auth/mobile/register`)
      .set('X-Forwarded-For', '198.51.100.11')
      .send({
        name: 'Mobile Register Limit Different Client',
        mobileNumber: '09170001001',
        password: 'Password123!',
      });

    expect(first.status).toBe(201);
    expect(second.status).toBe(429);
    expect(second.headers['x-ratelimit-limit']).toBe('1');
    expect(differentMobile.status).toBe(201);
    expect(differentClient.status).toBe(409);
  });

  it('applies a stricter mobile login limit keyed by mobile number and client', async () => {
    process.env.TRUST_PROXY = 'true';
    process.env.AUTH_MOBILE_LOGIN_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.AUTH_MOBILE_LOGIN_RATE_LIMIT_MAX_REQUESTS = '1';

    const { default: app, API_V1 } = await import('../app.js');

    const firstSetup = await request(app)
      .post(`${API_V1}/auth/mobile/register`)
      .set('X-Forwarded-For', '198.51.100.20')
      .send({
        name: 'Mobile Login Limit One',
        mobileNumber: '09170002001',
        password: 'Password123!',
      });
    const secondSetup = await request(app)
      .post(`${API_V1}/auth/mobile/register`)
      .set('X-Forwarded-For', '198.51.100.21')
      .send({
        name: 'Mobile Login Limit Two',
        mobileNumber: '09170002002',
        password: 'Password123!',
      });

    expect(firstSetup.status).toBe(201);
    expect(secondSetup.status).toBe(201);

    const first = await request(app)
      .post(`${API_V1}/auth/mobile/login`)
      .set('X-Forwarded-For', '198.51.100.30')
      .send({
        mobileNumber: '09170002001',
        password: 'WrongPassword!',
      });
    const second = await request(app)
      .post(`${API_V1}/auth/mobile/login`)
      .set('X-Forwarded-For', '198.51.100.30')
      .send({
        mobileNumber: '09170002001',
        password: 'WrongPassword!',
      });
    const differentMobile = await request(app)
      .post(`${API_V1}/auth/mobile/login`)
      .set('X-Forwarded-For', '198.51.100.30')
      .send({
        mobileNumber: '09170002002',
        password: 'WrongPassword!',
      });
    const differentClient = await request(app)
      .post(`${API_V1}/auth/mobile/login`)
      .set('X-Forwarded-For', '198.51.100.31')
      .send({
        mobileNumber: '09170002001',
        password: 'WrongPassword!',
      });

    expect(first.status).toBe(401);
    expect(second.status).toBe(429);
    expect(second.headers['x-ratelimit-limit']).toBe('1');
    expect(differentMobile.status).toBe(401);
    expect(differentClient.status).toBe(401);
  });

  it('applies a stricter media upload limit for authenticated users', async () => {
    process.env.FEATURE_AUTH_PROVIDER = 'local';
    process.env.FEATURE_TOKEN_MODE = 'app-jwt';
    process.env.FEATURE_MFA_MODE = 'disabled';
    process.env.FEATURE_MEDIA_STORAGE = 'supabase-storage';
    process.env.FEATURE_RECORD_DELETION = 'archive';
    process.env.INCIDENT_MEDIA_UPLOAD_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.INCIDENT_MEDIA_UPLOAD_RATE_LIMIT_MAX_REQUESTS = '2';

    const { default: app, API_V1 } = await import('../app.js');

    const loginResponse = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(loginResponse.status).toBe(200);

    const first = await request(app)
      .post(`${API_V1}/incidents/media/upload`)
      .set('Authorization', `Bearer ${loginResponse.body.token as string}`)
      .send({ fileName: 'only-name.jpg' });
    const second = await request(app)
      .post(`${API_V1}/incidents/media/upload`)
      .set('Authorization', `Bearer ${loginResponse.body.token as string}`)
      .send({ fileName: 'only-name.jpg' });
    const third = await request(app)
      .post(`${API_V1}/incidents/media/upload`)
      .set('Authorization', `Bearer ${loginResponse.body.token as string}`)
      .send({ fileName: 'only-name.jpg' });

    expect(first.status).toBe(400);
    expect(second.status).toBe(400);
    expect(third.status).toBe(429);
    expect(third.headers['x-ratelimit-limit']).toBe('2');
  });
});

describe('Public case lookup rate limiting', () => {
  const originalEnv = createSecurityTestEnv();

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.API_KEYS;
    delete process.env.API_KEY;
    delete process.env.PUBLIC_CASE_LOOKUP_RATE_LIMIT_ENABLED;
    process.env.RATE_LIMIT_ENABLED = 'false';
    process.env.PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS = '1';
    const { resetFeatureSelectionCache } = await import('../featureSelection.js');
    resetFeatureSelectionCache();
    await ensureSecurityTestUsers();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('keeps public case lookup limited when the global limiter is disabled', async () => {
    const { default: app, API_V1 } = await import('../app.js');
    await ensureTuguegaraoLocalityScope();

    const adminLogin = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(adminLogin.status).toBe(200);

    const adminToken = adminLogin.body.token as string;

    const categoryResponse = await request(app)
      .post(`${API_V1}/categories`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Rate Limit Category ${Date.now()}` });

    expect(categoryResponse.status).toBe(201);

    const severityResponse = await request(app)
      .post(`${API_V1}/severities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ level: `rate-limit-severity-${Date.now()}` });

    expect(severityResponse.status).toBe(201);

    const uniqueSuffix = `${Date.now()}-${Math.random()}`;
    const reporterEmail = `public-case-${uniqueSuffix}@xypes.local`;

    const registerResponse = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: `Public Case Reporter ${uniqueSuffix}`,
        email: reporterEmail,
        password: 'Password123!',
      });

    expect(registerResponse.status).toBe(201);

    const reporterToken = registerResponse.body.token as string;

    const linkResponse = await request(app)
      .post(`${API_V1}/citizens/link-me`)
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        name: `Public Case Citizen ${uniqueSuffix}`,
        preferredChannel: 'app',
      });

    expect([200, 201]).toContain(linkResponse.status);

    const reportResponse = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        description: 'Public case lookup limiter regression check',
        categoryId: categoryResponse.body.id as string,
        severityId: severityResponse.body.id as string,
        latitude: 17.6132,
        longitude: 121.7269,
        addressLine1: '1 Enrile Avenue',
        cityName: 'Tuguegarao City',
        provinceName: 'Cagayan',
        regionName: 'Cagayan Valley',
        barangay: 'Centro 10',
      });

    expect(reportResponse.status).toBe(201);

    const caseLookupPath = `${API_V1}/cases/${reportResponse.body.trust.caseToken as string}`;
    const firstLookup = await request(app).get(caseLookupPath);
    const secondLookup = await request(app).get(caseLookupPath);

    expect(firstLookup.status).toBe(200);
    expect(secondLookup.status).toBe(429);
    expect(secondLookup.headers['retry-after']).toBeDefined();
    expect(secondLookup.headers['x-ratelimit-limit']).toBe('1');
    expect(secondLookup.headers['x-ratelimit-remaining']).toBe('0');
  });

  it('fails app bootstrap validation in production when the public case lookup limiter is disabled', async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.API_KEYS;
    delete process.env.API_KEY;
    process.env.NODE_ENV = 'production';
    process.env.FEATURE_AUTH_PROVIDER = 'local';
    process.env.FEATURE_TOKEN_MODE = 'app-jwt';
    process.env.FEATURE_MFA_MODE = 'local-totp';
    process.env.FEATURE_MEDIA_STORAGE = 'disabled';
    process.env.FEATURE_RECORD_DELETION = 'archive';
    process.env.JWT_SECRET = 'prod-jwt-secret-0123456789-abcdef-uvwxyz';
    process.env.MFA_ENCRYPTION_KEY = 'prod-mfa-secret-0123456789-abcdef-uvwxyz';
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_STORE = 'memory';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '100';
    process.env.PUBLIC_CASE_LOOKUP_RATE_LIMIT_ENABLED = 'false';
    process.env.PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS = '600000';
    process.env.PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS = '20';
    process.env.INCIDENT_CASE_TOKEN_TTL_DAYS = '30';
    process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL = 'https://example.test/password-reset';

    const { validateAppStartup } = await import('../app.js');

    expect(() => validateAppStartup()).toThrow(
      'PUBLIC_CASE_LOOKUP_RATE_LIMIT_ENABLED must remain enabled in production for the public case lookup trust-layer endpoint',
    );
  });
});

describe('Shared-store rate limiting', () => {
  const originalEnv = createSecurityTestEnv();

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.API_KEYS;
    delete process.env.API_KEY;
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_STORE = 'database';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '100';
    process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.AUTH_LOGIN_RATE_LIMIT_MAX_REQUESTS = '2';
    const { resetFeatureSelectionCache } = await import('../featureSelection.js');
    resetFeatureSelectionCache();

    const { default: prisma } = await import('../lib/prisma.js');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE rate_limit_buckets');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('persists login throttle buckets in the database-backed limiter', async () => {
    const { default: app, API_V1 } = await import('../app.js');

    const first = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'WrongPassword!',
    });
    const second = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'WrongPassword!',
    });
    const third = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'WrongPassword!',
    });

    const { default: prisma } = await import('../lib/prisma.js');
    const rows = await prisma.$queryRawUnsafe<Array<{ bucketCount: number | bigint }>>(
      'SELECT COUNT(*)::bigint AS "bucketCount" FROM rate_limit_buckets WHERE "bucketKey" LIKE \'auth-login:%\'',
    );

    expect(first.status).toBe(401);
    expect(second.status).toBe(401);
    expect(third.status).toBe(429);
    expect(third.headers['x-ratelimit-limit']).toBe('2');
    expect(Number(rows[0]?.bucketCount ?? 0)).toBe(1);
  });

  it('recreates the limiter table automatically when it is missing', async () => {
    const { default: prisma } = await import('../lib/prisma.js');
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS rate_limit_buckets');

    const { default: app, API_V1 } = await import('../app.js');
    const response = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'WrongPassword!',
    });

    const rows = await prisma.$queryRawUnsafe<Array<{ bucketCount: number | bigint }>>(
      'SELECT COUNT(*)::bigint AS "bucketCount" FROM rate_limit_buckets WHERE "bucketKey" LIKE \'auth-login:%\'',
    );

    expect(response.status).toBe(401);
    expect(Number(rows[0]?.bucketCount ?? 0)).toBe(1);
  });

  it('repairs a legacy limiter table that is missing insert defaults', async () => {
    const { default: prisma } = await import('../lib/prisma.js');
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS rate_limit_buckets');
    await prisma.$executeRawUnsafe(
      'CREATE TABLE rate_limit_buckets (id uuid NOT NULL, "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp NOT NULL, "bucketKey" text NOT NULL UNIQUE, count integer NOT NULL, "windowStart" timestamp NOT NULL, "expiresAt" timestamp NOT NULL, PRIMARY KEY (id))',
    );

    const { default: app, API_V1 } = await import('../app.js');
    const response = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'WrongPassword!',
    });

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        idDefault: string | null;
        updatedAtDefault: string | null;
        bucketCount: number | bigint;
      }>
    >(
      `SELECT (SELECT column_default
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'rate_limit_buckets'
           AND column_name = 'id') AS "idDefault",
        (SELECT column_default
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'rate_limit_buckets'
           AND column_name = 'updatedAt') AS "updatedAtDefault",
        (SELECT COUNT(*)::bigint
         FROM rate_limit_buckets
         WHERE "bucketKey" LIKE 'auth-login:%') AS "bucketCount"`,
    );

    expect(response.status).toBe(401);
    expect(rows[0]?.idDefault).toContain('gen_random_uuid()');
    expect(rows[0]?.updatedAtDefault).toContain('now()');
    expect(Number(rows[0]?.bucketCount ?? 0)).toBe(1);
  });

  it('fails closed in production when the database-backed limiter is unavailable', async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.API_KEYS;
    delete process.env.API_KEY;
    process.env.NODE_ENV = 'production';
    process.env.FEATURE_AUTH_PROVIDER = 'local';
    process.env.FEATURE_TOKEN_MODE = 'app-jwt';
    process.env.FEATURE_MFA_MODE = 'local-totp';
    process.env.FEATURE_MEDIA_STORAGE = 'disabled';
    process.env.FEATURE_RECORD_DELETION = 'archive';
    process.env.JWT_SECRET = 'prod-jwt-secret-0123456789-abcdef-uvwxyz';
    process.env.MFA_ENCRYPTION_KEY = 'prod-mfa-secret-0123456789-abcdef-uvwxyz';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'prod-service-role-key-0123456789-abcdef-uvwxyz';
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_STORE = 'database';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '100';
    process.env.PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS = '600000';
    process.env.PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS = '20';
    process.env.INCIDENT_CASE_TOKEN_TTL_DAYS = '30';
    process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL = 'https://example.test/password-reset';

    const { default: prisma } = await import('../lib/prisma.js');
    const querySpy = jest
      .spyOn(prisma, '$queryRawUnsafe')
      .mockRejectedValueOnce(new Error('relation "rate_limit_buckets" does not exist'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { default: app, API_V1 } = await import('../app.js');
    const response = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'WrongPassword!',
    });

    querySpy.mockRestore();
    consoleErrorSpy.mockRestore();

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      message:
        'Rate limiting is temporarily unavailable because the shared limiter store cannot be reached',
    });
  });
});

describe('Production privileged MFA enforcement', () => {
  const originalEnv = createSecurityTestEnv();
  const productionJwtSecret = 'prod-jwt-secret-0123456789-abcdef-uvwxyz';
  const productionMfaEncryptionKey = 'prod-mfa-secret-0123456789-abcdef-uvwxyz';
  const passwordResetWebhookUrl = 'https://example.test/password-reset';
  const securityAlertWebhookUrl = 'https://monitoring.example.test/security-alerts';

  beforeEach(async () => {
    jest.resetModules();
    jest.doMock('../services/supabaseAuthService.js', () => {
      const actual = jest.requireActual(
        '../services/supabaseAuthService.js',
      ) as typeof import('../services/supabaseAuthService.js');

      return {
        ...actual,
        isSupabaseAuthEnabled: () => false,
        isSupabaseJwtEnabled: () => false,
        isSupabaseTotpEnabled: () => false,
      };
    });
    process.env = { ...originalEnv };
    delete process.env.API_KEYS;
    delete process.env.API_KEY;
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = productionJwtSecret;
    process.env.MFA_ENCRYPTION_KEY = productionMfaEncryptionKey;
    process.env.FEATURE_AUTH_PROVIDER = 'local';
    process.env.FEATURE_TOKEN_MODE = 'app-jwt';
    process.env.FEATURE_MFA_MODE = 'local-totp';
    process.env.FEATURE_MEDIA_STORAGE = 'disabled';
    process.env.FEATURE_RECORD_DELETION = 'archive';
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_STORE = 'memory';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '100';
    process.env.PUBLIC_CASE_LOOKUP_RATE_LIMIT_ENABLED = 'true';
    process.env.PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS = '600000';
    process.env.PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS = '20';
    process.env.INCIDENT_CASE_TOKEN_TTL_DAYS = '30';
    process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL = passwordResetWebhookUrl;
    process.env.SECURITY_ALERT_WEBHOOK_URL = securityAlertWebhookUrl;
    const { resetFeatureSelectionCache } = await import('../featureSelection.js');
    resetFeatureSelectionCache();
    await ensureSecurityTestUsers();
  });

  afterEach(() => {
    jest.dontMock('../services/supabaseAuthService.js');
    jest.dontMock('../featureSelection.js');
    jest.dontMock('../generated/productionFeatureProfile.js');
    process.env = originalEnv;
  });

  it('limits privileged users without MFA to enrollment routes in production', async () => {
    jest.doMock('../generated/productionFeatureProfile.js', () => ({
      productionFeatureProfile: {
        locked: true,
        profileName: 'test-production-profile',
        builtAt: '2026-04-05T00:00:00.000Z',
        selection: {
          authProvider: 'local',
          tokenMode: 'app-jwt',
          mfaMode: 'local-totp',
          mediaStorage: 'disabled',
          recordDeletion: 'archive',
        },
      },
    }));

    const { default: prisma } = await import('../lib/prisma.js');
    await prisma.user.update({
      where: { email: 'admin@xypes.local' },
      data: {
        passwordHash: await bcrypt.hash('Password123!', 10),
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaEnabledAt: null,
      },
    });

    const { default: app, API_V1 } = await import('../app.js');

    const login = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(login.status).toBe(200);
    expect(login.body).toHaveProperty('mfaEnrollmentRequired', true);

    const blocked = await request(app)
      .get(`${API_V1}/users`)
      .set('Authorization', `Bearer ${login.body.token as string}`);
    expect(blocked.status).toBe(403);
    expect(blocked.body).toHaveProperty('mfaEnrollmentRequired', true);

    const me = await request(app)
      .get(`${API_V1}/auth/me`)
      .set('Authorization', `Bearer ${login.body.token as string}`);
    expect(me.status).toBe(200);

    const setup = await request(app)
      .post(`${API_V1}/auth/mfa/setup`)
      .set('Authorization', `Bearer ${login.body.token as string}`);
    expect(setup.status).toBe(200);

    jest.dontMock('../generated/productionFeatureProfile.js');
  });

  it('fails closed for privileged users when production build disables MFA entirely', async () => {
    jest.doMock('../featureSelection.js', () => {
      const actual = jest.requireActual(
        '../featureSelection.js',
      ) as typeof import('../featureSelection.js');

      return {
        ...actual,
        isAnyMfaFeatureEnabled: () => false,
      };
    });

    jest.doMock('../generated/productionFeatureProfile.js', () => ({
      productionFeatureProfile: {
        locked: true,
        profileName: 'test-production-profile',
        builtAt: '2026-04-05T00:00:00.000Z',
        selection: {
          authProvider: 'local',
          tokenMode: 'app-jwt',
          mfaMode: 'local-totp',
          mediaStorage: 'disabled',
          recordDeletion: 'archive',
        },
      },
    }));

    const { default: prisma } = await import('../lib/prisma.js');
    await prisma.user.update({
      where: { email: 'admin@xypes.local' },
      data: {
        passwordHash: await bcrypt.hash('Password123!', 10),
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaEnabledAt: null,
      },
    });

    const { default: app, API_V1 } = await import('../app.js');
    const login = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(login.status).toBe(503);
    expect(login.body).toHaveProperty(
      'message',
      'Privileged MFA enforcement is enabled in production but MFA is disabled for this build',
    );

    jest.dontMock('../featureSelection.js');
    jest.dontMock('../generated/productionFeatureProfile.js');
  });
});
