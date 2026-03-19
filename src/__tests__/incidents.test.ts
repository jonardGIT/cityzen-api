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
  it('should return 200 for valid id', async () => {
    const res = await request(app).get(`${BASE}/1`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('should return 404 for unknown id', async () => {
    const res = await request(app).get(`${BASE}/9999`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

describe(`POST ${BASE}`, () => {
  it('should create and return 201 with valid referenced ids', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      description: 'Test incident',
      statusId: 1,
      citizenId: 1,
      locationId: 1,
      categoryId: 1,
      severityId: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ description: 'Test incident' });
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Missing ids' });
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 400 for invalid foreign key reference', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      description: 'Bad ref',
      statusId: 9999,
      citizenId: 1,
      locationId: 1,
      categoryId: 1,
      severityId: 1,
    });
    expect(res.status).toBe(422);
  });
});

describe('VIEWER incident scoping', () => {
  let viewerToken = '';
  let viewerIncidentId = 0;
  let viewerCitizenId = 0;

  beforeAll(async () => {
    const unique = Date.now();
    const email = `viewer.${unique}@postman.local`;

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

    const reportRes = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Viewer-owned incident',
        statusId: 1,
        locationId: 1,
        categoryId: 1,
        severityId: 1,
      });
    expect(reportRes.status).toBe(201);
    viewerIncidentId = reportRes.body.id;
  });

  it('GET /incidents returns only the authenticated viewer incidents', async () => {
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((incident: { citizenId: number }) => {
      expect(incident.citizenId).toBe(viewerCitizenId);
    });
  });

  it('GET /incidents/:id returns 404 for incidents not owned by the viewer', async () => {
    const ownIncident = await request(app)
      .get(`${BASE}/${viewerIncidentId}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(ownIncident.status).toBe(200);

    const otherIncidentRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Admin-owned incident for viewer-scope test',
        statusId: 1,
        citizenId: 1,
        locationId: 1,
        categoryId: 1,
        severityId: 1,
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

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });

  it('POST /incidents/report rejects client-provided citizenId', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Should fail because citizenId is forbidden',
        citizenId: 999,
        statusId: 1,
        locationId: 1,
        categoryId: 1,
        severityId: 1,
      });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });
});
