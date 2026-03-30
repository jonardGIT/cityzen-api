import request from 'supertest';
import app, { API_V1 } from '../app.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';

const BASE = `${API_V1}/responders`;

let adminToken = '';
let dispatcherToken = '';
// Reference seeded agency from seed-data.sql
const validAgencyId = '70000000-0000-0000-0000-000000000001';

beforeAll(async () => {
  adminToken = await getAdminToken();
  dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
});

describe(`GET ${BASE}`, () => {
  it('should return 200 with an array of responders', async () => {
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
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
  it('should return 200 for a valid id', async () => {
    // Use a real UUID from seed-data.sql
    const validResponderId = '80000000-0000-0000-0000-000000000001';
    const res = await request(app)
      .get(`${BASE}/${validResponderId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', validResponderId);
    expect(res.body).toHaveProperty('agency.id');
  });

  it('should return 400 for an invalid id format', async () => {
    const res = await request(app)
      .get(`${BASE}/not-a-real-uuid`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(400);
  });

  it('should return 404 for a non-existent id', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000006099';
    const res = await request(app)
      .get(`${BASE}/${nonExistentId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(404);
  });
});

describe(`POST ${BASE}`, () => {
  it('should create a responder and return 201', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      name: 'Responder A',
      agencyId: validAgencyId,
      role: 'Medic',
      contactInfo: 'responder@gov.com',
    });
    if (res.status !== 201) {
      // Log the response body for debugging
      // eslint-disable-next-line no-console
      console.error('Responder creation failed:', res.body);
    }
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Responder A' });
    expect(res.body).toHaveProperty('agencyId', validAgencyId);
  });

  it('should return 400 when agencyId is not a valid UUID', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      name: 'Responder A',
      agencyId: 'not-a-real-uuid',
      role: 'Medic',
      contactInfo: 'responder@gov.com',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('agencyId');
  });

  it('should return 422 when agencyId does not reference a valid Agency', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      name: 'Responder A',
      agencyId: '00000000-0000-0000-0000-000000000099', // valid UUID, not in DB
      role: 'Medic',
      contactInfo: 'responder@gov.com',
    });
    expect(res.status).toBe(422);
    expect(res.body.message).toContain('agencyId');
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Incomplete' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).post(BASE).send({
      name: 'No Auth',
      agencyId: validAgencyId,
      role: 'Medic',
      contactInfo: 'no-auth@gov.com',
    });
    expect(res.status).toBe(401);
  });

  it('should return 403 for VIEWER role', async () => {
    const viewerToken = await getTokenForRole('analyst@xypes.local');
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${viewerToken}`).send({
      name: 'Viewer Create',
      agencyId: validAgencyId,
      role: 'Medic',
      contactInfo: 'viewer@gov.com',
    });
    expect(res.status).toBe(403);
  });
});

describe(`PATCH ${BASE}/:id`, () => {
  let testResponderId: string;

  beforeAll(async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      name: 'PatchTarget',
      agencyId: validAgencyId,
      role: 'Medic',
      contactInfo: 'patch-target@gov.com',
    });
    testResponderId = res.body.id;
  });

  it('should update name and return 200', async () => {
    const res = await request(app)
      .patch(`${BASE}/${testResponderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Responder' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Updated Responder');
  });

  it('should return 404 for non-existent id', async () => {
    const res = await request(app)
      .patch(`${BASE}/00000000-0000-0000-0000-000000000099`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).patch(`${BASE}/${testResponderId}`).send({ name: 'No Auth' });
    expect(res.status).toBe(401);
  });
});

describe(`DELETE ${BASE}/:id`, () => {
  let deleteTargetId: string;

  beforeAll(async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      name: 'DeleteTarget',
      agencyId: validAgencyId,
      role: 'Medic',
      contactInfo: 'delete-target@gov.com',
    });
    deleteTargetId = res.body.id;
  });

  it('should delete and return 204', async () => {
    const res = await request(app)
      .delete(`${BASE}/${deleteTargetId}`)
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
    const res = await request(app).delete(`${BASE}/${deleteTargetId}`);
    expect(res.status).toBe(401);
  });
});
