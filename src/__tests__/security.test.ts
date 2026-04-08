import request from 'supertest';
import bcrypt from 'bcryptjs';

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
    { name: 'System Admin', email: 'admin@xypes.local', role: 'SYSTEM_ADMIN' },
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

describe('API key authentication', () => {
  const originalEnv = createSecurityTestEnv();

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.TEST_API_KEYS_ENABLED = 'true';
    process.env.API_KEYS = 'test-key';
    process.env.RATE_LIMIT_ENABLED = 'false';
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

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.API_KEYS;
    delete process.env.API_KEY;
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '100';
  });

  afterEach(() => {
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
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret';
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_STORE = 'database';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '100';

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

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.API_KEYS;
    delete process.env.API_KEY;
    process.env.RATE_LIMIT_ENABLED = 'false';
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret';
    process.env.MFA_ENCRYPTION_KEY =
      process.env.MFA_ENCRYPTION_KEY ?? 'test-only-mfa-encryption-key';
    process.env.FEATURE_AUTH_PROVIDER = 'local';
    process.env.FEATURE_TOKEN_MODE = 'app-jwt';
    process.env.FEATURE_MFA_MODE = 'local-totp';
    process.env.FEATURE_MEDIA_STORAGE = 'disabled';
    process.env.FEATURE_RECORD_DELETION = 'archive';
    await ensureSecurityTestUsers();
  });

  afterEach(() => {
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
    process.env.FEATURE_MFA_MODE = 'disabled';

    jest.doMock('../generated/productionFeatureProfile.js', () => ({
      productionFeatureProfile: {
        locked: true,
        profileName: 'test-production-profile',
        builtAt: '2026-04-05T00:00:00.000Z',
        selection: {
          authProvider: 'local',
          tokenMode: 'app-jwt',
          mfaMode: 'disabled',
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

    jest.dontMock('../generated/productionFeatureProfile.js');
  });
});
