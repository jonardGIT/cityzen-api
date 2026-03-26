import request from 'supertest';
import app, { API_V1 } from '../app.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';

const BASE = `${API_V1}/severities`;
let adminToken = '';

beforeAll(async () => {
  adminToken = await getAdminToken();
});

describe(`GET ${BASE}`, () => {
  it('should return 200 with array', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe(`GET ${BASE}/:id`, () => {
  let createdId: string;

  beforeAll(async () => {
    // Create a severity to get a valid UUID
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ level: `TestLevel-${Date.now()}` });
    createdId = res.body.id;
  });

  it('should return 200 for valid id', async () => {
    const res = await request(app).get(`${BASE}/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdId);
  });

  it('should return 404 for unknown id', async () => {
    // Use a random UUID
    const unknownId = '11111111-1111-4111-8111-111111111111';
    const res = await request(app).get(`${BASE}/${unknownId}`);
    expect(res.status).toBe(404);
  });
});

describe(`POST ${BASE}`, () => {
  it('should create and return 201', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ level: `Critical-${Date.now()}`, definition: 'Life threatening' });
    expect(res.status).toBe(201);
    expect(res.body.level).toContain('Critical-');
  });

  it('should return 400 when level is missing', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).post(BASE).send({ level: 'NoAuth' });
    expect(res.status).toBe(401);
  });

  it('should return 403 for VIEWER role', async () => {
    const viewerToken = await getTokenForRole('analyst@xypes.local');
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ level: 'ViewerLevel' });
    expect(res.status).toBe(403);
  });
});

describe(`GET ${BASE} (pagination)`, () => {
  it('should return paginated result when page and pageSize are provided', async () => {
    const res = await request(app).get(`${BASE}?page=1&pageSize=2`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({ page: 1, pageSize: 2 });
    expect(typeof res.body.pagination.total).toBe('number');
    expect(res.body.data.length).toBeLessThanOrEqual(2);
  });
});

describe(`PATCH ${BASE}/:id`, () => {
  let testId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ level: `PatchSev-${Date.now()}` });
    testId = res.body.id;
  });

  it('should update definition and return 200', async () => {
    const res = await request(app)
      .patch(`${BASE}/${testId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ definition: 'Updated definition' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', testId);
    expect(res.body).toHaveProperty('definition', 'Updated definition');
  });

  it('should return 404 for non-existent id', async () => {
    const res = await request(app)
      .patch(`${BASE}/00000000-0000-0000-0000-000000000099`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ definition: 'Ghost' });
    expect(res.status).toBe(404);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).patch(`${BASE}/${testId}`).send({ definition: 'NoAuth' });
    expect(res.status).toBe(401);
  });
});

describe(`DELETE ${BASE}/:id`, () => {
  let deleteId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ level: `DeleteSev-${Date.now()}` });
    deleteId = res.body.id;
  });

  it('should delete and return 204', async () => {
    const res = await request(app)
      .delete(`${BASE}/${deleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  it('should return 404 for non-existent id', async () => {
    const res = await request(app)
      .delete(`${BASE}/00000000-0000-0000-0000-000000000099`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).delete(`${BASE}/${deleteId}`);
    expect(res.status).toBe(401);
  });
});
