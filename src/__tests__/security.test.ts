import request from 'supertest';
import bcrypt from 'bcryptjs';

jest.setTimeout(60000);

describe('API key authentication', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.API_KEYS = 'test-key';
    process.env.RATE_LIMIT_ENABLED = 'false';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 401 for protected route without API key', async () => {
    const { default: app, API_V1 } = await import('../app.js');

    const response = await request(app).get(`${API_V1}/statuses`);

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message');
  });

  it('allows access to protected route with valid API key', async () => {
    const { default: app, API_V1 } = await import('../app.js');

    const loginResponse = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'analyst@xypes.local',
      password: 'Password123!',
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toHaveProperty('token');

    const response = await request(app)
      .get(`${API_V1}/statuses`)
      .set('x-api-key', 'test-key')
      .set('Authorization', `Bearer ${loginResponse.body.token as string}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('keeps health endpoint public', async () => {
    const { default: app, API_V1 } = await import('../app.js');

    const response = await request(app).get(`${API_V1}/health`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('Rate limiting', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.API_KEYS;
    delete process.env.API_KEY;
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '2';
  });

  afterAll(() => {
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
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.API_KEYS;
    delete process.env.API_KEY;
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '100';
  });

  afterAll(() => {
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

describe('Production privileged MFA enforcement', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
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
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('limits privileged users without MFA to enrollment routes in production', async () => {
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
  });

  it('fails closed for privileged users when production build disables MFA entirely', async () => {
    process.env.FEATURE_MFA_MODE = 'disabled';

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
  });
});
