import request from 'supertest';

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
