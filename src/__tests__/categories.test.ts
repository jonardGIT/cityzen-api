import request from 'supertest';
import app, { API_V1 } from '../app.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';

const BASE = `${API_V1}/categories`;
let adminToken = '';
let citizenReporterToken = '';

beforeAll(async () => {
  adminToken = await getAdminToken();
  citizenReporterToken = await getTokenForRole('analyst@xypes.local');
});

describe(`GET ${BASE}`, () => {
  it('should return 200 with array', async () => {
    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${citizenReporterToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should return paginated result when page and pageSize are provided', async () => {
    const res = await request(app)
      .get(`${BASE}?page=1&pageSize=2`)
      .set('Authorization', `Bearer ${citizenReporterToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({
      page: 1,
      pageSize: 2,
    });
    expect(typeof res.body.pagination.total).toBe('number');
    expect(res.body.data.length).toBeLessThanOrEqual(2);
  });

  it('should support createdAt sorting and range filters', async () => {
    const createdFrom = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .get(
        `${BASE}?page=1&pageSize=5&sortBy=createdAt&sortOrder=desc&createdFrom=${encodeURIComponent(createdFrom)}`,
      )
      .set('Authorization', `Bearer ${citizenReporterToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    for (const item of res.body.data) {
      expect(new Date(item.createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(createdFrom).getTime(),
      );
    }

    if (res.body.data.length >= 2) {
      const first = new Date(res.body.data[0].createdAt).getTime();
      const second = new Date(res.body.data[1].createdAt).getTime();
      expect(first).toBeGreaterThanOrEqual(second);
    }
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

describe(`GET ${BASE}/:id`, () => {
  let createdId: string;

  beforeAll(async () => {
    // Create a category to get a valid UUID
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `TestCategory-${Date.now()}` });
    createdId = res.body.id;
  });

  it('should return 200 for valid id', async () => {
    const res = await request(app)
      .get(`${BASE}/${createdId}`)
      .set('Authorization', `Bearer ${citizenReporterToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdId);
  });

  it('should return 404 for unknown id', async () => {
    // Use a random UUID
    const unknownId = '11111111-1111-4111-8111-111111111111';
    const res = await request(app)
      .get(`${BASE}/${unknownId}`)
      .set('Authorization', `Bearer ${citizenReporterToken}`);
    expect(res.status).toBe(404);
  });
});

describe(`POST ${BASE}`, () => {
  it('should create and return 201', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Flood-${Date.now()}`, subCategory: 'Urban' });
    expect(res.status).toBe(201);
    expect(res.body.name).toContain('Flood-');
  });

  it('should return 400 when name is missing', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).post(BASE).send({ name: 'NoAuth' });
    expect(res.status).toBe(401);
  });

  it('should return 403 for CITIZEN_REPORTER role', async () => {
    const citizenReporterToken = await getTokenForRole('analyst@xypes.local');
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${citizenReporterToken}`)
      .send({ name: 'CitizenReporterCreate' });
    expect(res.status).toBe(403);
  });
});

describe(`PATCH ${BASE}/:id`, () => {
  let testId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `PatchCat-${Date.now()}` });
    testId = res.body.id;
  });

  it('should update and return 200', async () => {
    const res = await request(app)
      .patch(`${BASE}/${testId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Updated-${Date.now()}`, subCategory: 'Updated Sub' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', testId);
    expect(res.body).toHaveProperty('subCategory', 'Updated Sub');
  });

  it('should return 404 for non-existent id', async () => {
    const res = await request(app)
      .patch(`${BASE}/00000000-0000-4000-8000-000000000099`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).patch(`${BASE}/${testId}`).send({ name: 'NoAuth' });
    expect(res.status).toBe(401);
  });
});

describe(`DELETE ${BASE}/:id`, () => {
  let deleteId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `DeleteCat-${Date.now()}` });
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
      .delete(`${BASE}/00000000-0000-4000-8000-000000000099`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).delete(`${BASE}/${deleteId}`);
    expect(res.status).toBe(401);
  });
});
