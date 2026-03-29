import request from 'supertest';
import app, { API_V1 } from '../app.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';

const BASE = `${API_V1}/audit-logs`;

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

async function getLatestAuditLog(token: string) {
  const response = await request(app)
    .get(`${BASE}?page=1&pageSize=1&sortBy=timestamp&sortOrder=desc`)
    .set('Authorization', `Bearer ${token}`);

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body.data)).toBe(true);
  expect(response.body.data.length).toBeGreaterThan(0);
  return response.body.data[0] as Record<string, unknown>;
}

describe(`GET ${BASE}`, () => {
  let superAdminToken = '';
  let adminToken = '';
  let dispatcherToken = '';
  let responderToken = '';
  let viewerToken = '';

  beforeAll(async () => {
    superAdminToken = await getAdminToken();
    adminToken = await getTokenForRole('ops.lead@xypes.local');
    dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
    responderToken = await getTokenForRole('supervisor@xypes.local');
    viewerToken = await getTokenForRole('analyst@xypes.local');
  });

  it('allows SUPER_ADMIN to read audit logs', async () => {
    const response = await request(app)
      .get(`${BASE}?page=1&pageSize=5`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('allows ADMIN to read audit logs', async () => {
    const response = await request(app)
      .get(`${BASE}?page=1&pageSize=5`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('returns 403 for DISPATCHER', async () => {
    const response = await request(app)
      .get(`${BASE}?page=1&pageSize=5`)
      .set('Authorization', `Bearer ${dispatcherToken}`);

    expect(response.status).toBe(403);
  });

  it('returns 403 for RESPONDER', async () => {
    const response = await request(app)
      .get(`${BASE}?page=1&pageSize=5`)
      .set('Authorization', `Bearer ${responderToken}`);

    expect(response.status).toBe(403);
  });

  it('returns 403 for VIEWER', async () => {
    const response = await request(app)
      .get(`${BASE}?page=1&pageSize=5`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(response.status).toBe(403);
  });

  it('returns 401 without auth token', async () => {
    const response = await request(app).get(BASE);
    expect(response.status).toBe(401);
  });

  it('returns 422 for invalid sortBy', async () => {
    const response = await request(app)
      .get(`${BASE}?sortBy=passwordHash`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(response.status).toBe(422);
  });
});

describe('Audit log persistence', () => {
  let adminToken = '';

  beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  it('records successful admin create actions', async () => {
    const createRes = await request(app)
      .post(`${API_V1}/citizens`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Audit Citizen ${Date.now()}`,
        contactInfo: `audit.citizen.${Date.now()}@mail.com`,
        preferredChannel: 'Email',
      });

    expect(createRes.status).toBe(201);

    const filters = encodeURIComponent(
      JSON.stringify([
        { field: 'targetId', operator: 'equals', value: createRes.body.id },
        { field: 'action', operator: 'equals', value: 'create' },
      ]),
    );

    const auditRes = await request(app)
      .get(`${BASE}?filters=${filters}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    expect(Array.isArray(auditRes.body)).toBe(true);
    expect(auditRes.body[0]).toMatchObject({
      action: 'create',
      resource: 'citizens',
      outcome: 'success',
      actorEmail: 'admin@xypes.local',
      statusCode: 201,
      targetId: createRes.body.id,
    });
  });

  it('records failed login attempts without storing secrets', async () => {
    const actorEmail = `missing.${Date.now()}@xypes.local`;
    const loginRes = await request(app).post(`${API_V1}/auth/login`).send({
      email: actorEmail,
      password: 'WrongPassword123!',
    });

    expect(loginRes.status).toBe(401);

    const latest = await getLatestAuditLog(adminToken);
    expect(latest).toMatchObject({
      action: 'login',
      resource: 'auth',
      outcome: 'failure',
      actorEmail,
      statusCode: 401,
    });

    const metadata = latest.metadata as Record<string, unknown> | undefined;
    expect(metadata?.password).toBeUndefined();
  });

  it('records viewer citizen link actions', async () => {
    const unique = Date.now();
    const email = `audit.viewer.${unique}@postman.local`;
    const registerRes = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: `Audit Viewer ${unique}`,
        email,
        password: 'Password1234!@#',
      });

    expect(registerRes.status).toBe(201);

    const linkRes = await request(app)
      .post(`${API_V1}/citizens/link-me`)
      .set('Authorization', `Bearer ${registerRes.body.token}`)
      .send({
        name: `Audit Viewer ${unique}`,
        preferredChannel: 'SMS',
      });

    expect([200, 201]).toContain(linkRes.status);

    const latest = await getLatestAuditLog(adminToken);
    expect(latest).toMatchObject({
      action: 'link',
      resource: 'citizens',
      outcome: 'success',
      actorEmail: email,
      targetId: linkRes.body.id,
    });
  });

  it('records viewer incident report actions', async () => {
    const unique = Date.now();
    const email = `audit.reporter.${unique}@postman.local`;
    const registerRes = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: `Audit Reporter ${unique}`,
        email,
        password: 'Password1234!@#',
      });

    expect(registerRes.status).toBe(201);

    const viewerToken = registerRes.body.token as string;

    const linkRes = await request(app)
      .post(`${API_V1}/citizens/link-me`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        name: `Audit Reporter ${unique}`,
        preferredChannel: 'Email',
      });

    expect([200, 201]).toContain(linkRes.status);

    const reportRes = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Audit report incident',
        categoryId: '30000000-0000-0000-0000-000000000001',
        severityId: '40000000-0000-0000-0000-000000000001',
        ...buildIncidentLocationSnapshot(),
      });

    expect(reportRes.status).toBe(201);

    const latest = await getLatestAuditLog(adminToken);
    expect(latest).toMatchObject({
      action: 'report',
      resource: 'incidents',
      outcome: 'success',
      actorEmail: email,
      targetId: reportRes.body.id,
      statusCode: 201,
    });
  });

  it('records failed mutating requests that reach validation', async () => {
    const createRes = await request(app)
      .post(`${API_V1}/citizens`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Incomplete' });

    expect(createRes.status).toBe(400);

    const latest = await getLatestAuditLog(adminToken);
    expect(latest).toMatchObject({
      action: 'create',
      resource: 'citizens',
      outcome: 'failure',
      actorEmail: 'admin@xypes.local',
      statusCode: 400,
    });
  });
});
