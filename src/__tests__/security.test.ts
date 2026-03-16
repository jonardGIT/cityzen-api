import request from 'supertest';

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

    const response = await request(app).get(`${API_V1}/citizens`);

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message');
  });

  it('allows access to protected route with valid API key', async () => {
    const { default: app, API_V1 } = await import('../app.js');

    const response = await request(app).get(`${API_V1}/citizens`).set('x-api-key', 'test-key');

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

    const first = await request(app).get(`${API_V1}/citizens`);
    const second = await request(app).get(`${API_V1}/citizens`);
    const third = await request(app).get(`${API_V1}/citizens`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
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
