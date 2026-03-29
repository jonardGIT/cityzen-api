import request from 'supertest';
import app, { API_V1 } from '../app.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';

const BASE = `${API_V1}/agencies`;
let adminToken = '';
let dispatcherToken = '';

beforeAll(async () => {
  adminToken = await getAdminToken();
  dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
});

describe(`GET ${BASE}`, () => {
  it('should return 200 with array', async () => {
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should include contactNumber field in response', async () => {
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('contactNumber');
    }
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  it('should return 403 for VIEWER role', async () => {
    const viewerToken = await getTokenForRole('analyst@xypes.local');
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });
});

describe(`GET ${BASE}/:id`, () => {
  let createdId: string;

  beforeAll(async () => {
    // Create an agency to get a valid UUID
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `TestAgency-${Date.now()}` });
    createdId = res.body.id;
  });

  it('should return 200 for valid id', async () => {
    const res = await request(app)
      .get(`${BASE}/${createdId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdId);
  });

  it('should include contactNumber field', async () => {
    const res = await request(app)
      .get(`${BASE}/${createdId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('contactNumber');
  });

  it('should return 404 for unknown id', async () => {
    // Use a random UUID
    const unknownId = '11111111-1111-4111-8111-111111111111';
    const res = await request(app)
      .get(`${BASE}/${unknownId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(404);
  });
});

describe(`POST ${BASE}`, () => {
  it('should create and return 201', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Agency-${Date.now()}` });
    expect(res.status).toBe(201);
    expect(res.body.name).toContain('Agency-');
  });

  it('should create with contactNumber and return 201', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Agency-${Date.now()}`, contactNumber: '+1-555-0100' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('contactNumber', '+1-555-0100');
  });

  it('should reject contactNumber exceeding 20 characters', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Agency-${Date.now()}`, contactNumber: '+1-555-01001234567890extra' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 422 when name is missing', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });
});

describe(`PATCH ${BASE}/:id`, () => {
  let testAgencyId: number;

  beforeAll(async () => {
    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `TestAgency-${Date.now()}`, contactNumber: '+1-555-0100' });
    testAgencyId = createRes.body.id;
  });

  it('should update contactNumber', async () => {
    const res = await request(app)
      .patch(`${BASE}/${testAgencyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `TestAgency-${Date.now()}`, contactNumber: '+1-555-0199' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('contactNumber', '+1-555-0199');
  });

  it('should clear contactNumber when set to null', async () => {
    const res = await request(app)
      .patch(`${BASE}/${testAgencyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `TestAgency-${Date.now()}`, contactNumber: null });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('contactNumber', null);
  });

  it('should reject contactNumber exceeding 20 characters', async () => {
    const res = await request(app)
      .patch(`${BASE}/${testAgencyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ contactNumber: '+1-555-01001234567890extra' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 404 for non-existent id', async () => {
    const res = await request(app)
      .patch(`${BASE}/00000000-0000-0000-0000-000000000099`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).patch(`${BASE}/${testAgencyId}`).send({ name: 'NoAuth' });
    expect(res.status).toBe(401);
  });
});

describe(`POST ${BASE} (auth)`, () => {
  it('should return 401 without auth token', async () => {
    const res = await request(app).post(BASE).send({ name: 'NoAuth' });
    expect(res.status).toBe(401);
  });

  it('should return 403 for VIEWER role', async () => {
    const viewerToken = await getTokenForRole('analyst@xypes.local');
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'ViewerCreate' });
    expect(res.status).toBe(403);
  });
});

describe(`GET ${BASE} (pagination)`, () => {
  it('should return paginated result when page and pageSize are provided', async () => {
    const res = await request(app)
      .get(`${BASE}?page=1&pageSize=2`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({ page: 1, pageSize: 2 });
    expect(typeof res.body.pagination.total).toBe('number');
    expect(res.body.data.length).toBeLessThanOrEqual(2);
  });
});

describe(`DELETE ${BASE}/:id`, () => {
  let deleteId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `DeleteAgency-${Date.now()}` });
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
