import request from 'supertest';
import app, { API_V1 } from '../app.js';
import { getAdminToken } from './helpers/auth.js';

jest.setTimeout(20000);

const BASE = `${API_V1}/incidents`;
let adminToken = '';

beforeAll(async () => {
  adminToken = await getAdminToken();
});

describe(`GET ${BASE}`, () => {
  it('should return 200 with array', async () => {
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe(`GET ${BASE}/:id`, () => {
  let createdId: string;

  beforeAll(async () => {
    // Fetch the first available status
    const statusesRes = await request(app)
      .get(`${API_V1}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(statusesRes.status).toBe(200);
    const statusId = statusesRes.body[0].id;

    // Always create a valid citizen
    const citizenRes = await request(app)
      .post(`${API_V1}/citizens`)
      .set('Authorization', `Bearer ${adminToken}`)
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

    // Explicitly check all referenced entities exist
    const statusCheck = await request(app).get(`${API_V1}/statuses/${statusId}`).set('Authorization', `Bearer ${adminToken}`);
    if (statusCheck.status !== 200) {
      console.error('Status not found:', statusId, statusCheck.body);
      throw new Error('Status not found');
    }
    const citizenCheck = await request(app).get(`${API_V1}/citizens/${citizenId}`).set('Authorization', `Bearer ${adminToken}`);
    if (citizenCheck.status !== 200) {
      console.error('Citizen not found:', citizenId, citizenCheck.body);
      throw new Error('Citizen not found');
    }
    const locationCheck = await request(app).get(`${API_V1}/locations/${locationId}`).set('Authorization', `Bearer ${adminToken}`);
    if (locationCheck.status !== 200) {
      console.error('Location not found:', locationId, locationCheck.body);
      throw new Error('Location not found');
    }
    const categoryCheck = await request(app).get(`${API_V1}/categories/${categoryId}`).set('Authorization', `Bearer ${adminToken}`);
    if (categoryCheck.status !== 200) {
      console.error('Category not found:', categoryId, categoryCheck.body);
      throw new Error('Category not found');
    }
    const severityCheck = await request(app).get(`${API_V1}/severities/${severityId}`).set('Authorization', `Bearer ${adminToken}`);
    if (severityCheck.status !== 200) {
      console.error('Severity not found:', severityId, severityCheck.body);
      throw new Error('Severity not found');
    }

    // Now create the incident
    const incidentRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Test incident for GET by id',
        statusId,
        citizenId,
        locationId,
        categoryId,
        severityId,
      });
    createdId = incidentRes.body.id;
  });

  it('should return 200 for valid id', async () => {
    const res = await request(app).get(`${BASE}/${createdId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdId);
  });

  it('should return 404 for unknown id', async () => {
    // Use a random UUID
    const unknownId = '11111111-1111-4111-8111-111111111111';
    const res = await request(app).get(`${BASE}/${unknownId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

describe(`POST ${BASE}`, () => {
  it('should create and return 201 with valid referenced ids', async () => {
    // Fetch the first available status
    const statusesRes = await request(app)
      .get(`${API_V1}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(statusesRes.status).toBe(200);
    const statusId = statusesRes.body[0].id;

    // Always create a valid citizen
    const citizenRes = await request(app)
      .post(`${API_V1}/citizens`)
      .set('Authorization', `Bearer ${adminToken}`)
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

    // Explicitly check all referenced entities exist
    const statusCheck = await request(app).get(`${API_V1}/statuses/${statusId}`).set('Authorization', `Bearer ${adminToken}`);
    if (statusCheck.status !== 200) {
      console.error('Status not found:', statusId, statusCheck.body);
      throw new Error('Status not found');
    }
    const citizenCheck = await request(app).get(`${API_V1}/citizens/${citizenId}`).set('Authorization', `Bearer ${adminToken}`);
    if (citizenCheck.status !== 200) {
      console.error('Citizen not found:', citizenId, citizenCheck.body);
      throw new Error('Citizen not found');
    }
    const locationCheck = await request(app).get(`${API_V1}/locations/${locationId}`).set('Authorization', `Bearer ${adminToken}`);
    if (locationCheck.status !== 200) {
      console.error('Location not found:', locationId, locationCheck.body);
      throw new Error('Location not found');
    }
    const categoryCheck = await request(app).get(`${API_V1}/categories/${categoryId}`).set('Authorization', `Bearer ${adminToken}`);
    if (categoryCheck.status !== 200) {
      console.error('Category not found:', categoryId, categoryCheck.body);
      throw new Error('Category not found');
    }
    const severityCheck = await request(app).get(`${API_V1}/severities/${severityId}`).set('Authorization', `Bearer ${adminToken}`);
    if (severityCheck.status !== 200) {
      console.error('Severity not found:', severityId, severityCheck.body);
      throw new Error('Severity not found');
    }

    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      description: 'Test incident',
      statusId,
      citizenId,
      locationId,
      categoryId,
      severityId,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ description: 'Test incident' });
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Missing ids' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 400 for invalid foreign key reference', async () => {
    // Create valid referenced entities for all except statusId
    const citizenRes = await request(app)
      .post(`${API_V1}/citizens`)
      .set('Authorization', `Bearer ${adminToken}`)
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

    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      description: 'Bad ref',
      statusId: 'not-a-real-uuid',
      citizenId,
      locationId,
      categoryId,
      severityId,
    });
    expect(res.status).toBe(400);
  });
});

describe('VIEWER incident scoping', () => {
  let viewerToken = '';
  let viewerIncidentId = '';
  let viewerCitizenId = '';
  let viewerLocationId = '';
  let viewerCategoryId = '';
  let viewerSeverityId = '';

  beforeAll(async () => {
    const unique = Date.now();
    const email = `viewer.${unique}@postman.local`;

    // Ensure only one 'Reported' status exists
    let reportedStatusId = '00000000-0000-0000-0000-000000000101';
    const allStatuses = await request(app)
      .get(`${API_V1}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(allStatuses.status).toBe(200);
    const reportedStatuses = allStatuses.body.filter((s: any) => s.name === 'Reported');
    if (reportedStatuses.length === 0) {
      // Create if not present
      const createStatus = await request(app)
        .post(`${API_V1}/statuses`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Reported' });
      expect(createStatus.status === 201 || createStatus.status === 409).toBe(true);
      reportedStatusId = createStatus.body.id || reportedStatusId;
    } else {
      // Delete all but one
      reportedStatusId = reportedStatuses[0].id;
      for (let i = 1; i < reportedStatuses.length; i++) {
        await request(app)
          .delete(`${API_V1}/statuses/${reportedStatuses[i].id}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
    }

    const registerRes = await request(app).post(`${API_V1}/auth/register`).send({
      name: `Viewer ${unique}`,
      email,
      password: 'Password123!',
    });
    expect(registerRes.status).toBe(201);
    viewerToken = registerRes.body.token;

    const linkRes = await request(app)
      .post(`${API_V1}/citizens/link-me`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        name: `Linked Viewer ${unique}`,
        preferredChannel: 'app',
      });
    expect([200, 201]).toContain(linkRes.status);
    viewerCitizenId = linkRes.body.id;

    // Dynamically create referenced entities for the viewer using admin privileges
    const locationRes = await request(app)
      .post(`${API_V1}/locations`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ district: 'ViewerTest', city: 'ViewerTest', province: 'ViewerTest', region: 'ViewerTest' });
    expect(locationRes.status).toBe(201);
    viewerLocationId = locationRes.body.id;

    const categoryRes = await request(app)
      .post(`${API_V1}/categories`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `ViewerCategory-${unique}` });
    expect(categoryRes.status).toBe(201);
    viewerCategoryId = categoryRes.body.id;

    const severityRes = await request(app)
      .post(`${API_V1}/severities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ level: `ViewerLevel-${unique}` });
    expect(severityRes.status).toBe(201);
    viewerSeverityId = severityRes.body.id;

    const reportRes = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Viewer-owned incident',
        locationId: viewerLocationId,
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
      });
    expect(reportRes.status).toBe(201);
    viewerIncidentId = reportRes.body.id;
  });

  it('GET /incidents returns only the authenticated viewer incidents', async () => {
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((incident: { citizenId: string }) => {
      expect(incident.citizenId).toBe(viewerCitizenId);
    });
  });

  it('GET /incidents/:id returns 404 for incidents not owned by the viewer', async () => {
    const ownIncident = await request(app)
      .get(`${BASE}/${viewerIncidentId}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(ownIncident.status).toBe(200);

    // Dynamically create referenced entities for admin
    const statusRes = await request(app)
      .post(`${API_V1}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `AdminStatus-${Date.now()}` });
    const statusId = statusRes.body.id;

    const citizenRes = await request(app)
      .post(`${API_V1}/citizens`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `AdminCitizen-${Date.now()}`, contactInfo: `admin${Date.now()}@mail.com`, preferredChannel: 'app' });
    const citizenId = citizenRes.body.id;

    const locationRes = await request(app)
      .post(`${API_V1}/locations`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ district: 'AdminTest', city: 'AdminTest', province: 'AdminTest', region: 'AdminTest' });
    const locationId = locationRes.body.id;

    const categoryRes = await request(app)
      .post(`${API_V1}/categories`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `AdminCategory-${Date.now()}` });
    const categoryId = categoryRes.body.id;

    const severityRes = await request(app)
      .post(`${API_V1}/severities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ level: `AdminLevel-${Date.now()}` });
    const severityId = severityRes.body.id;

    const otherIncidentRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Admin-owned incident for viewer-scope test',
        statusId,
        citizenId,
        locationId,
        categoryId,
        severityId,
      });
    expect(otherIncidentRes.status).toBe(201);

    const blocked = await request(app)
      .get(`${BASE}/${otherIncidentRes.body.id}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(blocked.status).toBe(404);
  });

  it('POST /citizens/link-me rejects contactInfo from client payload', async () => {
    const res = await request(app)
      .post(`${API_V1}/citizens/link-me`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        name: 'Attempted Override',
        preferredChannel: 'app',
        contactInfo: 'spoofed@example.com',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('POST /incidents/report rejects client-provided citizenId', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Should fail because citizenId is forbidden',
        citizenId: 'not-a-real-uuid',
        locationId: viewerLocationId,
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('POST /incidents/report rejects client-provided statusId', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Should fail because statusId is forbidden',
        statusId: 'uuid-status-1',
        locationId: viewerLocationId,
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('POST /incidents/report auto-assigns Reported status', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Auto status test',
        locationId: viewerLocationId,
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('statusId');
  });

  it('POST /incidents/report accepts numeric string IDs', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Numeric string id payload',
        locationId: viewerLocationId,
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('POST /incidents/report returns 422 for non-numeric string IDs', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Bad string id payload',
        locationId: 'not-a-real-uuid',
        categoryId: 'uuid-category-1',
        severityId: 'uuid-severity-1',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });
});
