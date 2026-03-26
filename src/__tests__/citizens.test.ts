import request from 'supertest';
import app, { API_V1 } from '../app.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';

const BASE = `${API_V1}/citizens`;
let adminToken = '';

beforeAll(async () => {
  adminToken = await getAdminToken();
});

describe(`GET ${BASE}`, () => {
  it('should return 200 with an array of citizens', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe(`GET ${BASE}/:id`, () => {
  let createdId: string;

  beforeAll(async () => {
    // Create a citizen to get a valid UUID
    const res = await request(app)
      .post(BASE)
      .send({
        name: `Test User ${Date.now()}`,
        contactInfo: `test${Date.now()}@mail.com`,
        preferredChannel: 'Email',
      });
    createdId = res.body.id;
  });

  it('should return 200 with the citizen for a valid id', async () => {
    const res = await request(app).get(`${BASE}/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdId);
  });

  it('should return 404 for a non-existent id', async () => {
    // Use a random UUID
    const unknownId = '11111111-1111-4111-8111-111111111111';
    const res = await request(app).get(`${BASE}/${unknownId}`);
    expect(res.status).toBe(404);
  });
});

describe(`POST ${BASE}`, () => {
  it('should create a citizen and return 201', async () => {
    const res = await request(app).post(BASE).send({
      name: 'Test User',
      contactInfo: 'test@example.com',
      preferredChannel: 'Email',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Test User' });
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app).post(BASE).send({ name: 'Incomplete' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
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
      .send({
        name: `PatchCitizen-${Date.now()}`,
        contactInfo: `patch${Date.now()}@mail.com`,
        preferredChannel: 'Email',
      });
    testId = res.body.id;
  });

  it('should update and return 200', async () => {
    const res = await request(app)
      .patch(`${BASE}/${testId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Citizen' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', testId);
    expect(res.body).toHaveProperty('name', 'Updated Citizen');
  });

  it('should return 404 for non-existent id', async () => {
    const res = await request(app)
      .patch(`${BASE}/00000000-0000-0000-0000-000000000099`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).patch(`${BASE}/${testId}`).send({ name: 'NoAuth' });
    expect(res.status).toBe(401);
  });

  it('should return 403 for VIEWER role', async () => {
    const viewerToken = await getTokenForRole('analyst@xypes.local');
    const res = await request(app)
      .patch(`${BASE}/${testId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'ViewerPatch' });
    expect(res.status).toBe(403);
  });
});

describe(`DELETE ${BASE}/:id`, () => {
  let deleteId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post(BASE)
      .send({
        name: `DeleteCitizen-${Date.now()}`,
        contactInfo: `del${Date.now()}@mail.com`,
        preferredChannel: 'SMS',
      });
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
