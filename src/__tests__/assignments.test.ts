import request from 'supertest';
import app, { API_V1 } from '../app.js';
import { getAdminToken } from './helpers/auth.js';

jest.setTimeout(20000);

const BASE = `${API_V1}/assignments`;
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
      .send({ name: `TestCitizen-${Date.now()}`, contactInfo: `test${Date.now()}@mail.com`, preferredChannel: 'app' });
    const citizenId = citizenRes.body.id;

    const locationRes = await request(app)
      .post(`${API_V1}/locations`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ district: 'Test', city: 'Test', province: 'Test', region: 'Test' });
    const locationId = locationRes.body.id;

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
        locationId,
        categoryId,
        severityId,
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
      .send({ name: `TestResponder-${Date.now()}`, agencyId, role: 'TestRole', contactInfo: `test${Date.now()}@mail.com` });
    responderId = responderRes.body.id;

    // Assignment
    const assignmentRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ incidentId, responderId });
    createdId = assignmentRes.body.id;
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
});
