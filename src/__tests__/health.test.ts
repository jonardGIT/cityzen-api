import request from 'supertest';
import app, { API_V1 } from '../app.js';

describe(`GET ${API_V1}/health`, () => {
  it('should return 200 with status ok', async () => {
    const res = await request(app).get(`${API_V1}/health`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('should expose OpenAPI JSON', async () => {
    const res = await request(app).get(`${API_V1}/openapi.json`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('openapi', '3.0.3');
  });

  it('should serve Swagger UI', async () => {
    const res = await request(app).get(`${API_V1}/docs`);
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe(`${API_V1}/docs/`);
  });
});

describe('404 handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown/route');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});
