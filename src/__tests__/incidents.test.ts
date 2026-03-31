import request from 'supertest';
import app, { API_V1 } from '../app.js';
import { getAdminToken } from './helpers/auth.js';

jest.setTimeout(120000);

const BASE = `${API_V1}/incidents`;
let adminToken = '';

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

async function createCitizen() {
  const nonce = `${Date.now()}-${Math.random()}`;
  const res = await request(app)
    .post(`${API_V1}/citizens`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Citizen-${nonce}`,
      contactInfo: `citizen-${nonce}@mail.com`,
      preferredChannel: 'app',
    });

  expect(res.status).toBe(201);
  return res.body.id as string;
}

async function createCategory() {
  const res = await request(app)
    .post(`${API_V1}/categories`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: `Category-${Date.now()}-${Math.random()}` });

  expect(res.status).toBe(201);
  return res.body.id as string;
}

async function createSeverity() {
  const res = await request(app)
    .post(`${API_V1}/severities`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ level: `Severity-${Date.now()}-${Math.random()}` });

  expect(res.status).toBe(201);
  return res.body.id as string;
}

async function getStatusId(name?: string) {
  const res = await request(app)
    .get(`${API_V1}/statuses`)
    .set('Authorization', `Bearer ${adminToken}`);

  expect(res.status).toBe(200);

  if (!name) {
    return res.body[0].id as string;
  }

  const match = res.body.find((status: { name: string }) => status.name === name);
  expect(match).toBeTruthy();
  return match.id as string;
}

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
  let createdId = '';

  beforeAll(async () => {
    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const incidentRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Test incident for GET by id',
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(incidentRes.status).toBe(201);
    createdId = incidentRes.body.id;
  });

  it('should return 200 for valid id', async () => {
    const res = await request(app)
      .get(`${BASE}/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdId);
  });

  it('should return 404 for unknown id', async () => {
    const unknownId = '11111111-1111-4111-8111-111111111111';
    const res = await request(app)
      .get(`${BASE}/${unknownId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

describe(`POST ${BASE}`, () => {
  it('should create and return 201 with valid referenced ids', async () => {
    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Test incident',
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ description: 'Test incident' });
    expect(res.body).toHaveProperty('latitude');
  });

  it('should create and return 201 with incident location snapshot', async () => {
    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Test incident with coordinate snapshot',
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('latitude');
    expect(res.body).toHaveProperty('longitude');
  });

  it('should return 400 when snapshot fields are not provided', async () => {
    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      description: 'Missing incident location snapshot',
      statusId,
      citizenId,
      categoryId,
      severityId,
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
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
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Bad ref',
        statusId: 'not-a-real-uuid',
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(400);
  });
});

describe('VIEWER incident scoping', () => {
  let viewerToken = '';
  let viewerIncidentId = '';
  let viewerCitizenId = '';
  let viewerCategoryId = '';
  let viewerSeverityId = '';

  beforeAll(async () => {
    const unique = Date.now();
    const email = `viewer.${unique}@postman.local`;

    const registerRes = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
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

    viewerCategoryId = await createCategory();
    viewerSeverityId = await createSeverity();

    const reportRes = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Viewer-owned incident',
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
        ...buildIncidentLocationSnapshot(),
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

    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const otherIncidentRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Admin-owned incident for viewer-scope test',
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
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
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
        ...buildIncidentLocationSnapshot(),
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
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('POST /incidents/report accepts coordinate snapshot payload', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Viewer geo incident',
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('latitude');
  });

  it('POST /incidents/report auto-assigns Reported status', async () => {
    const reportedStatusId = await getStatusId('Reported');
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Auto status test',
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('statusId', reportedStatusId);
  });

  it('POST /incidents/report accepts valid UUID IDs', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Valid UUID id payload',
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('POST /incidents/report returns 400 for invalid UUID IDs', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Bad string id payload',
        categoryId: 'uuid-category-1',
        severityId: 'uuid-severity-1',
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });
});
