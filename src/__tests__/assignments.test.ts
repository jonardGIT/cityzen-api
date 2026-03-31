import request from 'supertest';
import app, { API_V1 } from '../app.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';

jest.setTimeout(120000);

const BASE = `${API_V1}/assignments`;
let adminToken = '';
let dispatcherToken = '';

function buildIncidentLocationSnapshot() {
  return {
    latitude: 14.5995,
    longitude: 120.9842,
    addressLine1: '123 Rizal Ave',
    cityName: 'Manila',
    provinceName: 'Metro Manila',
    regionName: 'NCR',
    barangay: 'Barangay 123',
  };
}

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

// Move these to outer scope for use in POST tests
let incidentId: string;
let responderId: string;

describe(`GET ${BASE}/:id`, () => {
  let createdId: string;

  beforeAll(async () => {
    // Create all required referenced entities
    // Incident
    const statusRes = await request(app)
      .post(`${API_V1}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `TestStatus-${Date.now()}` });
    const statusId = statusRes.body.id;

    const citizenRes = await request(app)
      .post(`${API_V1}/citizens`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `TestCitizen-${Date.now()}`,
        contactInfo: `test${Date.now()}@mail.com`,
        preferredChannel: 'app',
      });
    const citizenId = citizenRes.body.id;

    const categoryRes = await request(app)
      .post(`${API_V1}/categories`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `TestCategory-${Date.now()}` });
    const categoryId = categoryRes.body.id;

    const severityRes = await request(app)
      .post(`${API_V1}/severities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ level: `TestLevel-${Date.now()}` });
    const severityId = severityRes.body.id;

    const incidentRes = await request(app)
      .post(`${API_V1}/incidents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Test assignment incident',
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });
    incidentId = incidentRes.body.id;

    // Responder
    const agencyRes = await request(app)
      .post(`${API_V1}/agencies`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `TestAgency-${Date.now()}` });
    const agencyId = agencyRes.body.id;

    const responderRes = await request(app)
      .post(`${API_V1}/responders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `TestResponder-${Date.now()}`,
        agencyId,
        role: 'TestRole',
        contactInfo: `test${Date.now()}@mail.com`,
      });
    responderId = responderRes.body.id;

    // Assignment
    const assignmentRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ incidentId, responderId });
    createdId = assignmentRes.body.id;
  });

  it('should return 200 for valid id', async () => {
    const res = await request(app)
      .get(`${BASE}/${createdId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdId);
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
    // Use the ids created in beforeAll
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      incidentId,
      responderId,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ incidentId, responderId });
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 400 for invalid foreign key reference', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      incidentId: 'not-a-real-uuid',
      responderId: 'uuid-responder-1',
    });
    expect(res.status).toBe(400);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).post(BASE).send({
      incidentId,
      responderId,
    });
    expect(res.status).toBe(401);
  });

  it('should return 403 for VIEWER role', async () => {
    const viewerToken = await getTokenForRole('analyst@xypes.local');
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ incidentId, responderId });
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

describe(`PATCH ${BASE}/:id`, () => {
  let patchId: string;

  beforeAll(async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      incidentId,
      responderId,
    });
    patchId = res.body.id;
  });

  it('should update notes and return 200', async () => {
    const res = await request(app)
      .patch(`${BASE}/${patchId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Updated notes', outcome: 'Resolved' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', patchId);
    expect(res.body).toHaveProperty('notes', 'Updated notes');
    expect(res.body).toHaveProperty('outcome', 'Resolved');
  });

  it('should return 404 for non-existent id', async () => {
    const res = await request(app)
      .patch(`${BASE}/00000000-0000-0000-0000-000000000099`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Ghost' });
    expect(res.status).toBe(404);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).patch(`${BASE}/${patchId}`).send({ notes: 'NoAuth' });
    expect(res.status).toBe(401);
  });
});

describe(`DELETE ${BASE}/:id`, () => {
  let deleteId: string;

  beforeAll(async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      incidentId,
      responderId,
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
