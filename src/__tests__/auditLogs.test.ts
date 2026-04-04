import request from 'supertest';
import bcrypt from 'bcryptjs';
import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';
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

async function createCategory(adminToken: string) {
  const response = await request(app)
    .post(`${API_V1}/categories`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: `Audit Category ${Date.now()}-${Math.random()}` });

  expect(response.status).toBe(201);
  return response.body.id as string;
}

async function createSeverity(adminToken: string) {
  const response = await request(app)
    .post(`${API_V1}/severities`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ level: `Audit Severity ${Date.now()}-${Math.random()}` });

  expect(response.status).toBe(201);
  return response.body.id as string;
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

async function getAuditLogsByFilters(
  token: string,
  filters: Array<{ field: string; operator: string; value: string | number }>,
) {
  const response = await request(app)
    .get(`${BASE}?filters=${encodeURIComponent(JSON.stringify(filters))}`)
    .set('Authorization', `Bearer ${token}`);

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
  expect(response.body.length).toBeGreaterThan(0);
  return response.body as Array<Record<string, unknown>>;
}

describe(`GET ${BASE}`, () => {
  let systemAdminToken = '';
  let departmentManagerToken = '';
  let dispatcherToken = '';
  let supervisorToken = '';
  let citizenReporterToken = '';
  let auditorToken = '';

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { email: 'auditor@xypes.local' },
      update: {
        name: 'Auditor',
        passwordHash: await bcrypt.hash('Password123!', 10),
        role: 'AUDITOR',
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaEnabledAt: null,
      },
      create: {
        name: 'Auditor',
        email: 'auditor@xypes.local',
        passwordHash: await bcrypt.hash('Password123!', 10),
        role: 'AUDITOR',
      },
    });

    [
      systemAdminToken,
      departmentManagerToken,
      dispatcherToken,
      supervisorToken,
      citizenReporterToken,
      auditorToken,
    ] = await Promise.all([
      getAdminToken(),
      getTokenForRole('ops.lead@xypes.local'),
      getTokenForRole('dispatcher@xypes.local'),
      getTokenForRole('supervisor@xypes.local'),
      getTokenForRole('analyst@xypes.local'),
      getTokenForRole('auditor@xypes.local'),
    ]);
  });

  it('allows SYSTEM_ADMIN to read audit logs', async () => {
    const response = await request(app)
      .get(`${BASE}?page=1&pageSize=5`)
      .set('Authorization', `Bearer ${systemAdminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('allows AUDITOR to read audit logs', async () => {
    const response = await request(app)
      .get(`${BASE}?page=1&pageSize=5`)
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('returns 403 for DEPARTMENT_MANAGER', async () => {
    const response = await request(app)
      .get(`${BASE}?page=1&pageSize=5`)
      .set('Authorization', `Bearer ${departmentManagerToken}`);

    expect(response.status).toBe(403);
  });

  it('returns 403 for DISPATCHER', async () => {
    const response = await request(app)
      .get(`${BASE}?page=1&pageSize=5`)
      .set('Authorization', `Bearer ${dispatcherToken}`);

    expect(response.status).toBe(403);
  });

  it('returns 403 for SUPERVISOR', async () => {
    const response = await request(app)
      .get(`${BASE}?page=1&pageSize=5`)
      .set('Authorization', `Bearer ${supervisorToken}`);

    expect(response.status).toBe(403);
  });

  it('returns 403 for CITIZEN_REPORTER', async () => {
    const response = await request(app)
      .get(`${BASE}?page=1&pageSize=5`)
      .set('Authorization', `Bearer ${citizenReporterToken}`);

    expect(response.status).toBe(403);
  });

  it('returns 401 without auth token', async () => {
    const response = await request(app).get(BASE);
    expect(response.status).toBe(401);
  });

  it('returns 422 for invalid sortBy', async () => {
    const response = await request(app)
      .get(`${BASE}?sortBy=passwordHash`)
      .set('Authorization', `Bearer ${systemAdminToken}`);

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

  it('records password reset request audit metadata without exposing reset tokens', async () => {
    const unique = Date.now();
    const email = `audit.reset.${unique}@postman.local`;

    const registerRes = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: `Audit Reset User ${unique}`,
        email,
        password: 'Password1234!@#',
      });

    expect(registerRes.status).toBe(201);

    const resetRes = await request(app)
      .post(`${API_V1}/auth/password-reset/request`)
      .send({ email });

    expect(resetRes.status).toBe(202);

    const latest = await getLatestAuditLog(adminToken);
    expect(latest).toMatchObject({
      action: 'password_reset_request',
      resource: 'auth',
      outcome: 'success',
      actorEmail: email,
      statusCode: 202,
    });

    const metadata = latest.metadata as Record<string, unknown> | undefined;
    expect(metadata?.resetToken).toBeUndefined();
    expect(metadata?.resetTokenIssued).toBe(true);
    expect(typeof metadata?.deliveryMode).toBe('string');
  });

  it('records privileged password reset requests as blocked in production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalWebhookUrl = process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL;
    process.env.NODE_ENV = 'production';
    process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL = 'https://example.test/password-reset';

    const resetRes = await request(app)
      .post(`${API_V1}/auth/password-reset/request`)
      .send({ email: 'admin@xypes.local' });

    process.env.NODE_ENV = originalNodeEnv;
    process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL = originalWebhookUrl;

    expect(resetRes.status).toBe(202);

    const latest = await getLatestAuditLog(adminToken);
    expect(latest).toMatchObject({
      action: 'password_reset_request',
      resource: 'auth',
      outcome: 'success',
      actorEmail: 'admin@xypes.local',
      statusCode: 202,
    });

    const metadata = latest.metadata as Record<string, unknown> | undefined;
    expect(metadata?.privilegedRecoveryBlocked).toBe(true);
    expect(metadata?.deliveryMode).toBe('blocked');
  });

  it('records citizen reporter citizen link actions', async () => {
    const unique = Date.now();
    const email = `audit.viewer.${unique}@postman.local`;
    const registerRes = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: `Audit Citizen Reporter ${unique}`,
        email,
        password: 'Password1234!@#',
      });

    expect(registerRes.status).toBe(201);

    const linkRes = await request(app)
      .post(`${API_V1}/citizens/link-me`)
      .set('Authorization', `Bearer ${registerRes.body.token}`)
      .send({
        name: `Audit Citizen Reporter ${unique}`,
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

  it('records citizen reporter incident report actions', async () => {
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

    const citizenReporterToken = registerRes.body.token as string;

    const linkRes = await request(app)
      .post(`${API_V1}/citizens/link-me`)
      .set('Authorization', `Bearer ${citizenReporterToken}`)
      .send({
        name: `Audit Reporter ${unique}`,
        preferredChannel: 'Email',
      });

    expect([200, 201]).toContain(linkRes.status);

    const categoryId = await createCategory(adminToken);
    const severityId = await createSeverity(adminToken);

    const reportRes = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${citizenReporterToken}`)
      .send({
        description: 'Audit report incident',
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(reportRes.status).toBe(201);

    const matches = await getAuditLogsByFilters(adminToken, [
      { field: 'action', operator: 'equals', value: 'report' },
      { field: 'resource', operator: 'equals', value: 'incidents' },
      { field: 'actorEmail', operator: 'equals', value: email },
      { field: 'targetId', operator: 'equals', value: reportRes.body.id as string },
    ]);

    expect(matches[0]).toMatchObject({
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

    const matches = await getAuditLogsByFilters(adminToken, [
      { field: 'action', operator: 'equals', value: 'create' },
      { field: 'resource', operator: 'equals', value: 'citizens' },
      { field: 'actorEmail', operator: 'equals', value: 'admin@xypes.local' },
      { field: 'outcome', operator: 'equals', value: 'failure' },
      { field: 'statusCode', operator: 'equals', value: 400 },
    ]);

    expect(matches[0]).toMatchObject({
      action: 'create',
      resource: 'citizens',
      outcome: 'failure',
      actorEmail: 'admin@xypes.local',
      statusCode: 400,
    });
  });
});
