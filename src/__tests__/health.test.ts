import request from 'supertest';
import app, { API_V1 } from '../app.js';
import { createOpenApiDocument } from '../docs/openapi.js';

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
    expect(res.body).toHaveProperty(['paths', '/health', 'get', 'summary'], 'Health check');
    expect(res.body.paths).not.toEqual({});

    if (res.body['x-internal-only-docs']) {
      expect(res.body['x-internal-only-docs']).toBe(true);
      expect(res.body.info?.description).toEqual(
        expect.stringContaining(
          'WARNING: This full OpenAPI contract may contain sensitive setup details, internal-only operational guidance, and implementation instructions. Do not expose it in production or public mirrors.',
        ),
      );
      expect(res.body.paths).toHaveProperty('/admin/privacy-requests');
      expect(res.body.paths['/admin/privacy-requests']).toHaveProperty('get');
      expect(res.body.paths).toHaveProperty('/admin/privacy-requests/{id}');
      expect(res.body.paths['/admin/privacy-requests/{id}']).toHaveProperty('get');
      expect(res.body.paths['/admin/privacy-requests/{id}']).toHaveProperty('patch');
      expect(res.body.paths).toHaveProperty('/admin/security/privacy-incidents');
      expect(res.body.paths['/admin/security/privacy-incidents']).toHaveProperty('get');
      expect(res.body.paths['/admin/security/privacy-incidents']).toHaveProperty('post');
      expect(res.body.paths).toHaveProperty('/admin/security/privacy-incidents/{id}');
      expect(res.body.paths['/admin/security/privacy-incidents/{id}']).toHaveProperty('get');
      expect(res.body.paths['/admin/security/privacy-incidents/{id}']).toHaveProperty('patch');
      return;
    }

    expect(res.body).toEqual(createOpenApiDocument());
  });

  it('should serve Swagger UI', async () => {
    const res = await request(app).get(`${API_V1}/docs`);
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe(`${API_V1}/docs/`);
  });

  it('should serve Swagger UI HTML from the trailing-slash docs route', async () => {
    const res = await request(app).get(`${API_V1}/docs/`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('Swagger UI');
  });
});

describe('404 handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown/route');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});
