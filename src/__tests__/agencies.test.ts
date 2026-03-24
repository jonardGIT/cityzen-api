import request from 'supertest';
import app, { API_V1 } from '../app.js';
import { getAdminToken } from './helpers/auth.js';

const BASE = `${API_V1}/agencies`;
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

  it('should include contactNumber field in response', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('contactNumber');
    }
  });
});

describe(`GET ${BASE}/:id`, () => {
  it('should return 200 for valid id', async () => {
    const res = await request(app).get(`${BASE}/1`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('should include contactNumber field', async () => {
    const res = await request(app).get(`${BASE}/1`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('contactNumber');
  });

  it('should return 404 for unknown id', async () => {
    const res = await request(app).get(`${BASE}/9999`);
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
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 422 when name is missing', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({});
    expect(res.status).toBe(422);
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
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });
});