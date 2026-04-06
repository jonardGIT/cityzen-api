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

  afterEach(() => {
    delete process.env.SECURITY_ALERT_WEBHOOK_URL;
    delete process.env.SECURITY_ALERT_LOGIN_FAILURE_THRESHOLD;
    delete process.env.SECURITY_ALERT_LOGIN_FAILURE_WINDOW_MS;
    delete process.env.SECURITY_ALERT_PASSWORD_RESET_THRESHOLD;
    delete process.env.SECURITY_ALERT_PASSWORD_RESET_WINDOW_MS;
    delete process.env.SECURITY_ALERT_PRIVILEGED_RECOVERY_BLOCKED_THRESHOLD;
    delete process.env.SECURITY_ALERT_PRIVILEGED_RECOVERY_BLOCKED_WINDOW_MS;
    delete process.env.SECURITY_ALERT_PRIVILEGED_USER_CHANGE_THRESHOLD;
    delete process.env.SECURITY_ALERT_PRIVILEGED_USER_CHANGE_WINDOW_MS;
    delete process.env.SECURITY_ALERT_PASSWORD_RESET_CONFIRM_FAILURE_THRESHOLD;
    delete process.env.SECURITY_ALERT_PASSWORD_RESET_CONFIRM_FAILURE_WINDOW_MS;
    delete process.env.SECURITY_ALERT_REFRESH_FAILURE_THRESHOLD;
    delete process.env.SECURITY_ALERT_REFRESH_FAILURE_WINDOW_MS;
    delete process.env.SECURITY_ALERT_SESSION_CHURN_THRESHOLD;
    delete process.env.SECURITY_ALERT_SESSION_CHURN_WINDOW_MS;
    delete process.env.SECURITY_ALERT_MEDIA_UPLOAD_THRESHOLD;
    delete process.env.SECURITY_ALERT_MEDIA_UPLOAD_WINDOW_MS;
    delete process.env.SECURITY_ALERT_MEDIA_ACCESS_THRESHOLD;
    delete process.env.SECURITY_ALERT_MEDIA_ACCESS_WINDOW_MS;
    delete process.env.SECURITY_ALERT_MFA_SETUP_THRESHOLD;
    delete process.env.SECURITY_ALERT_MFA_SETUP_WINDOW_MS;
    jest.restoreAllMocks();
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

  it('forwards a security alert when a privileged user account is created', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://monitoring.example.test/security-alerts';

    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 202 } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const createRes = await request(app)
      .post(`${API_V1}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Alerted Dispatcher ${Date.now()}`,
        email: `alert.dispatcher.${Date.now()}@postman.local`,
        password: 'Password1234!@#',
        role: 'DISPATCHER',
      });

    global.fetch = originalFetch;

    expect(createRes.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? '{}')) as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      type: 'security-alert',
      ruleId: 'privileged-user-created',
      severity: 'high',
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

  it('forwards a security alert after repeated failed logins cross the threshold', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://monitoring.example.test/security-alerts';
    process.env.SECURITY_ALERT_LOGIN_FAILURE_THRESHOLD = '3';
    process.env.SECURITY_ALERT_LOGIN_FAILURE_WINDOW_MS = '600000';

    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 202 } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const actorEmail = `threshold.${Date.now()}@xypes.local`;

    await request(app).post(`${API_V1}/auth/login`).send({
      email: actorEmail,
      password: 'WrongPassword123!',
    });
    await request(app).post(`${API_V1}/auth/login`).send({
      email: actorEmail,
      password: 'WrongPassword123!',
    });
    await request(app).post(`${API_V1}/auth/login`).send({
      email: actorEmail,
      password: 'WrongPassword123!',
    });

    global.fetch = originalFetch;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? '{}')) as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      type: 'security-alert',
      ruleId: 'repeated-login-failures',
      severity: 'high',
    });
    expect(payload.aggregate).toMatchObject({
      identity: actorEmail,
      count: 3,
      windowMs: 600000,
    });
  });

  it('forwards a security alert after repeated failed refresh attempts cross the threshold', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://monitoring.example.test/security-alerts';
    process.env.SECURITY_ALERT_REFRESH_FAILURE_THRESHOLD = '3';
    process.env.SECURITY_ALERT_REFRESH_FAILURE_WINDOW_MS = '600000';

    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 202 } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    await request(app).post(`${API_V1}/auth/refresh`).send({ refreshToken: 'invalid-token-one' });
    await request(app).post(`${API_V1}/auth/refresh`).send({ refreshToken: 'invalid-token-two' });
    await request(app).post(`${API_V1}/auth/refresh`).send({ refreshToken: 'invalid-token-three' });

    global.fetch = originalFetch;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? '{}')) as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      type: 'security-alert',
      ruleId: 'repeated-refresh-failures',
      severity: 'high',
    });
    expect(payload.aggregate).toMatchObject({
      count: 3,
      windowMs: 600000,
    });
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
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://monitoring.example.test/security-alerts';
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 202 } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const originalNodeEnv = process.env.NODE_ENV;
    const originalWebhookUrl = process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL;
    process.env.NODE_ENV = 'production';
    process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL = 'https://example.test/password-reset';

    const resetRes = await request(app)
      .post(`${API_V1}/auth/password-reset/request`)
      .send({ email: 'admin@xypes.local' });

    process.env.NODE_ENV = originalNodeEnv;
    process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL = originalWebhookUrl;
    global.fetch = originalFetch;

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

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? '{}')) as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      type: 'security-alert',
      ruleId: 'privileged-password-reset-blocked',
      severity: 'high',
    });
  });

  it('forwards a security alert after repeated blocked privileged recovery attempts cross the threshold', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://monitoring.example.test/security-alerts';
    process.env.SECURITY_ALERT_PASSWORD_RESET_THRESHOLD = '99';
    process.env.SECURITY_ALERT_PRIVILEGED_RECOVERY_BLOCKED_THRESHOLD = '3';
    process.env.SECURITY_ALERT_PRIVILEGED_RECOVERY_BLOCKED_WINDOW_MS = '600000';

    const unique = Date.now();
    const email = `privileged.reset.${unique}@postman.local`;

    await prisma.user.create({
      data: {
        name: `Privileged Reset ${unique}`,
        email,
        passwordHash: await bcrypt.hash('Password123!', 10),
        role: 'DEPARTMENT_MANAGER',
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaEnabledAt: null,
      },
    });

    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 202 } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const originalNodeEnv = process.env.NODE_ENV;
    const originalWebhookUrl = process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL;
    process.env.NODE_ENV = 'production';
    process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL = 'https://example.test/password-reset';

    await request(app).post(`${API_V1}/auth/password-reset/request`).send({ email });
    await request(app).post(`${API_V1}/auth/password-reset/request`).send({ email });
    await request(app).post(`${API_V1}/auth/password-reset/request`).send({ email });

    process.env.NODE_ENV = originalNodeEnv;
    process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL = originalWebhookUrl;
    global.fetch = originalFetch;

    expect(fetchMock).toHaveBeenCalledTimes(4);

    const payload = JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body ?? '{}')) as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      type: 'security-alert',
      ruleId: 'repeated-privileged-recovery-blocks',
      severity: 'high',
    });
    expect(payload.aggregate).toMatchObject({
      identity: email,
      count: 3,
      windowMs: 600000,
    });
  });

  it('alerts when password reset delivery is unavailable in production', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://monitoring.example.test/security-alerts';

    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 202 } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const originalNodeEnv = process.env.NODE_ENV;
    const originalWebhookUrl = process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL;
    process.env.NODE_ENV = 'production';
    delete process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL;

    const resetRes = await request(app)
      .post(`${API_V1}/auth/password-reset/request`)
      .send({ email: 'missing.user@postman.local' });

    process.env.NODE_ENV = originalNodeEnv;
    process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL = originalWebhookUrl;
    global.fetch = originalFetch;

    expect(resetRes.status).toBe(503);

    const latest = await getLatestAuditLog(adminToken);
    expect(latest).toMatchObject({
      action: 'password_reset_request',
      resource: 'auth',
      outcome: 'failure',
      actorEmail: 'missing.user@postman.local',
      statusCode: 503,
    });

    const metadata = latest.metadata as Record<string, unknown> | undefined;
    expect(metadata?.deliveryMode).toBe('unconfigured');
    expect(metadata?.deliveryFailure).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? '{}')) as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      type: 'security-alert',
      ruleId: 'password-reset-delivery-unavailable',
      severity: 'high',
    });
  });

  it('forwards a security alert after repeated failed password reset confirmations cross the threshold', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://monitoring.example.test/security-alerts';
    process.env.SECURITY_ALERT_PASSWORD_RESET_CONFIRM_FAILURE_THRESHOLD = '3';
    process.env.SECURITY_ALERT_PASSWORD_RESET_CONFIRM_FAILURE_WINDOW_MS = '600000';

    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 202 } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const firstAttempt = await request(app)
      .post(`${API_V1}/auth/password-reset/confirm`)
      .send({ token: 'invalid-reset-token-one', password: 'Password456!@#' });
    const secondAttempt = await request(app)
      .post(`${API_V1}/auth/password-reset/confirm`)
      .send({ token: 'invalid-reset-token-two', password: 'Password456!@#' });
    const thirdAttempt = await request(app)
      .post(`${API_V1}/auth/password-reset/confirm`)
      .send({ token: 'invalid-reset-token-three', password: 'Password456!@#' });

    global.fetch = originalFetch;

    expect(firstAttempt.status).toBe(401);
    expect(secondAttempt.status).toBe(401);
    expect(thirdAttempt.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? '{}')) as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      type: 'security-alert',
      ruleId: 'repeated-password-reset-confirm-failures',
      severity: 'high',
    });
    expect(payload.aggregate).toMatchObject({
      count: 3,
      windowMs: 600000,
    });
  });

  it('forwards critical alerts for privileged role changes and archives', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://monitoring.example.test/security-alerts';
    process.env.SECURITY_ALERT_PRIVILEGED_USER_CHANGE_THRESHOLD = '99';

    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 202 } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const createRes = await request(app)
      .post(`${API_V1}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Role Change User ${Date.now()}`,
        email: `role.change.${Date.now()}@postman.local`,
        password: 'Password1234!@#',
        role: 'CITIZEN_REPORTER',
      });

    expect(createRes.status).toBe(201);

    const updateRes = await request(app)
      .patch(`${API_V1}/users/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'DISPATCHER' });

    expect(updateRes.status).toBe(200);

    const deleteRes = await request(app)
      .delete(`${API_V1}/users/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    global.fetch = originalFetch;

    expect(deleteRes.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const updatePayload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? '{}')) as Record<
      string,
      unknown
    >;
    expect(updatePayload).toMatchObject({
      type: 'security-alert',
      ruleId: 'user-role-changed',
      severity: 'critical',
    });

    const deletePayload = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body ?? '{}')) as Record<
      string,
      unknown
    >;
    expect(deletePayload).toMatchObject({
      type: 'security-alert',
      ruleId: 'user-archived',
      severity: 'critical',
    });
  });

  it('records and alerts on privileged user restoration', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://monitoring.example.test/security-alerts';
    process.env.SECURITY_ALERT_PRIVILEGED_USER_CHANGE_THRESHOLD = '99';

    const archivedUser = await prisma.user.create({
      data: {
        name: `Restored Dispatcher ${Date.now()}`,
        email: `restored.dispatcher.${Date.now()}@postman.local`,
        passwordHash: await bcrypt.hash('Password123!', 10),
        role: 'DISPATCHER',
        archivedAt: new Date(),
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaEnabledAt: null,
      },
      select: {
        id: true,
      },
    });

    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 202 } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const restoreRes = await request(app)
      .post(`${API_V1}/users/${archivedUser.id}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    global.fetch = originalFetch;

    expect(restoreRes.status).toBe(200);

    const latest = await getLatestAuditLog(adminToken);
    expect(latest).toMatchObject({
      action: 'restore',
      resource: 'users',
      outcome: 'success',
      actorEmail: 'admin@xypes.local',
      targetId: archivedUser.id,
      statusCode: 200,
    });

    const metadata = latest.metadata as Record<string, unknown> | undefined;
    expect(metadata?.managedUserRole).toBe('DISPATCHER');
    expect(metadata?.restoredFromArchive).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? '{}')) as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      type: 'security-alert',
      ruleId: 'user-restored',
      severity: 'critical',
    });
  });

  it('forwards a security alert after repeated privileged user-management actions cross the threshold', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://monitoring.example.test/security-alerts';
    process.env.SECURITY_ALERT_PRIVILEGED_USER_CHANGE_THRESHOLD = '3';
    process.env.SECURITY_ALERT_PRIVILEGED_USER_CHANGE_WINDOW_MS = '600000';

    const unique = Date.now();
    const actorEmail = `burst.manager.${unique}@postman.local`;

    await prisma.user.create({
      data: {
        name: `Burst Manager ${unique}`,
        email: actorEmail,
        passwordHash: await bcrypt.hash('Password123!', 10),
        role: 'DEPARTMENT_MANAGER',
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaEnabledAt: null,
      },
    });

    const login = await request(app).post(`${API_V1}/auth/login`).send({
      email: actorEmail,
      password: 'Password123!',
    });

    expect(login.status).toBe(200);

    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 202 } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const firstCreate = await request(app)
      .post(`${API_V1}/users`)
      .set('Authorization', `Bearer ${login.body.token as string}`)
      .send({
        name: `Burst Dispatcher A ${unique}`,
        email: `burst.dispatcher.a.${unique}@postman.local`,
        password: 'Password1234!@#',
        role: 'DISPATCHER',
      });
    const secondCreate = await request(app)
      .post(`${API_V1}/users`)
      .set('Authorization', `Bearer ${login.body.token as string}`)
      .send({
        name: `Burst Dispatcher B ${unique}`,
        email: `burst.dispatcher.b.${unique}@postman.local`,
        password: 'Password1234!@#',
        role: 'DISPATCHER',
      });
    const thirdCreate = await request(app)
      .post(`${API_V1}/users`)
      .set('Authorization', `Bearer ${login.body.token as string}`)
      .send({
        name: `Burst Supervisor ${unique}`,
        email: `burst.supervisor.${unique}@postman.local`,
        password: 'Password1234!@#',
        role: 'SUPERVISOR',
      });

    global.fetch = originalFetch;

    expect(firstCreate.status).toBe(201);
    expect(secondCreate.status).toBe(201);
    expect(thirdCreate.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    const payload = JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body ?? '{}')) as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      type: 'security-alert',
      ruleId: 'privileged-user-change-burst',
      severity: 'critical',
    });
    expect(payload.aggregate).toMatchObject({
      identity: actorEmail,
      count: 3,
      windowMs: 600000,
    });
  });

  it('forwards a security alert after repeated session revocations cross the threshold', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://monitoring.example.test/security-alerts';
    process.env.SECURITY_ALERT_SESSION_CHURN_THRESHOLD = '3';
    process.env.SECURITY_ALERT_SESSION_CHURN_WINDOW_MS = '600000';

    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 202 } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const firstLogin = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });
    const secondLogin = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });
    const thirdLogin = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });
    const fourthLogin = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(firstLogin.status).toBe(200);
    expect(secondLogin.status).toBe(200);
    expect(thirdLogin.status).toBe(200);
    expect(fourthLogin.status).toBe(200);

    const actorToken = fourthLogin.body.token as string;

    const revokeFirst = await request(app)
      .delete(`${API_V1}/auth/sessions/${firstLogin.body.sessionId as string}`)
      .set('Authorization', `Bearer ${actorToken}`);
    const revokeSecond = await request(app)
      .delete(`${API_V1}/auth/sessions/${secondLogin.body.sessionId as string}`)
      .set('Authorization', `Bearer ${actorToken}`);
    const revokeThird = await request(app)
      .delete(`${API_V1}/auth/sessions/${thirdLogin.body.sessionId as string}`)
      .set('Authorization', `Bearer ${actorToken}`);

    global.fetch = originalFetch;

    expect(revokeFirst.status).toBe(204);
    expect(revokeSecond.status).toBe(204);
    expect(revokeThird.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? '{}')) as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      type: 'security-alert',
      ruleId: 'session-churn-anomaly',
      severity: 'medium',
    });
    expect(payload.aggregate).toMatchObject({
      identity: 'admin@xypes.local',
      count: 3,
      windowMs: 600000,
    });
  });

  it('records incident media upload attempts in the audit log', async () => {
    const uploadAttempt = await request(app)
      .post(`${API_V1}/incidents/media/upload`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fileName: 'missing-content-type.jpg' });

    expect([400, 404]).toContain(uploadAttempt.status);

    const latest = await getLatestAuditLog(adminToken);
    expect(latest).toMatchObject({
      action: 'media_upload',
      resource: 'incidents',
      outcome: 'failure',
      statusCode: uploadAttempt.status,
    });
  });

  it('records incident media access requests in the audit log', async () => {
    const statusesRes = await request(app)
      .get(`${API_V1}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(statusesRes.status).toBe(200);
    const statusId = (statusesRes.body[0] as { id: string }).id;

    const citizenRes = await request(app)
      .post(`${API_V1}/citizens`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Audit Media Citizen ${Date.now()}`,
        contactInfo: `audit.media.${Date.now()}@mail.com`,
        preferredChannel: 'app',
      });
    expect(citizenRes.status).toBe(201);

    const categoryId = await createCategory(adminToken);
    const severityId = await createSeverity(adminToken);

    const incidentRes = await request(app)
      .post(`${API_V1}/incidents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Audit media access incident',
        mediaUrls: ['supabase://incident-media/incidents/private/audit-access-photo.jpg'],
        statusId,
        citizenId: citizenRes.body.id,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });
    expect(incidentRes.status).toBe(201);

    const incidentRecord = await prisma.citizenIncident.findUniqueOrThrow({
      where: { id: incidentRes.body.id },
      include: {
        mediaFiles: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    const accessRes = await request(app)
      .get(
        `${API_V1}/incidents/${incidentRes.body.id}/media/${incidentRecord.mediaFiles[0]?.id as string}`,
      )
      .set('Authorization', `Bearer ${adminToken}`);

    expect(accessRes.status).toBe(200);

    const latest = await getLatestAuditLog(adminToken);
    expect(latest).toMatchObject({
      action: 'media_access',
      resource: 'incidents',
      outcome: 'success',
      statusCode: 200,
      targetId: incidentRes.body.id,
    });

    const metadata = latest.metadata as Record<string, unknown> | undefined;
    expect(metadata).toMatchObject({
      incidentId: incidentRes.body.id,
      mediaId: incidentRecord.mediaFiles[0]?.id,
      displayOrder: 0,
      managedReference: true,
    });
  });

  it('forwards a security alert after repeated incident media upload attempts cross the threshold', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://monitoring.example.test/security-alerts';
    process.env.SECURITY_ALERT_MEDIA_UPLOAD_THRESHOLD = '3';
    process.env.SECURITY_ALERT_MEDIA_UPLOAD_WINDOW_MS = '600000';

    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 202 } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const firstAttempt = await request(app)
      .post(`${API_V1}/incidents/media/upload`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fileName: 'missing-content-type.jpg' });
    const secondAttempt = await request(app)
      .post(`${API_V1}/incidents/media/upload`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fileName: 'missing-content-type.jpg' });
    const thirdAttempt = await request(app)
      .post(`${API_V1}/incidents/media/upload`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fileName: 'missing-content-type.jpg' });

    global.fetch = originalFetch;

    expect([400, 404]).toContain(firstAttempt.status);
    expect([400, 404]).toContain(secondAttempt.status);
    expect([400, 404]).toContain(thirdAttempt.status);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? '{}')) as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      type: 'security-alert',
      ruleId: 'repeated-media-upload-attempts',
      severity: 'medium',
    });
    expect(payload.aggregate).toMatchObject({
      count: 3,
      windowMs: 600000,
    });
  });

  it('forwards a security alert after repeated incident media access requests cross the threshold', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://monitoring.example.test/security-alerts';
    process.env.SECURITY_ALERT_MEDIA_ACCESS_THRESHOLD = '3';
    process.env.SECURITY_ALERT_MEDIA_ACCESS_WINDOW_MS = '600000';

    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 202 } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const statusesRes = await request(app)
      .get(`${API_V1}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(statusesRes.status).toBe(200);
    const statusId = (statusesRes.body[0] as { id: string }).id;

    const citizenRes = await request(app)
      .post(`${API_V1}/citizens`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Alert Media Citizen ${Date.now()}`,
        contactInfo: `alert.media.${Date.now()}@mail.com`,
        preferredChannel: 'app',
      });
    expect(citizenRes.status).toBe(201);

    const categoryId = await createCategory(adminToken);
    const severityId = await createSeverity(adminToken);

    const incidentRes = await request(app)
      .post(`${API_V1}/incidents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Alert media access incident',
        mediaUrls: ['supabase://incident-media/incidents/private/alert-access-photo.jpg'],
        statusId,
        citizenId: citizenRes.body.id,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });
    expect(incidentRes.status).toBe(201);

    const incidentRecord = await prisma.citizenIncident.findUniqueOrThrow({
      where: { id: incidentRes.body.id },
      include: {
        mediaFiles: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
    const mediaId = incidentRecord.mediaFiles[0]?.id as string;

    const firstAccess = await request(app)
      .get(`${API_V1}/incidents/${incidentRes.body.id}/media/${mediaId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const secondAccess = await request(app)
      .get(`${API_V1}/incidents/${incidentRes.body.id}/media/${mediaId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const thirdAccess = await request(app)
      .get(`${API_V1}/incidents/${incidentRes.body.id}/media/${mediaId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    global.fetch = originalFetch;

    expect(firstAccess.status).toBe(200);
    expect(secondAccess.status).toBe(200);
    expect(thirdAccess.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? '{}')) as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      type: 'security-alert',
      ruleId: 'repeated-media-access-requests',
      severity: 'medium',
    });
    expect(payload.aggregate).toMatchObject({
      identity: 'admin@xypes.local',
      count: 3,
      windowMs: 600000,
    });
  });

  it('forwards a security alert after repeated MFA setup resets cross the threshold', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://monitoring.example.test/security-alerts';
    process.env.SECURITY_ALERT_MFA_SETUP_THRESHOLD = '3';
    process.env.SECURITY_ALERT_MFA_SETUP_WINDOW_MS = '600000';

    await prisma.user.update({
      where: { email: 'admin@xypes.local' },
      data: {
        passwordHash: await bcrypt.hash('Password123!', 10),
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaEnabledAt: null,
      },
    });

    const login = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(login.status).toBe(200);

    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 202 } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const firstSetup = await request(app)
      .post(`${API_V1}/auth/mfa/setup`)
      .set('Authorization', `Bearer ${login.body.token as string}`);
    const secondSetup = await request(app)
      .post(`${API_V1}/auth/mfa/setup`)
      .set('Authorization', `Bearer ${login.body.token as string}`);
    const thirdSetup = await request(app)
      .post(`${API_V1}/auth/mfa/setup`)
      .set('Authorization', `Bearer ${login.body.token as string}`);

    global.fetch = originalFetch;

    expect(firstSetup.status).toBe(200);
    expect(secondSetup.status).toBe(200);
    expect(thirdSetup.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? '{}')) as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      type: 'security-alert',
      ruleId: 'repeated-mfa-setup-resets',
      severity: 'medium',
    });
    expect(payload.aggregate).toMatchObject({
      identity: 'admin@xypes.local',
      count: 3,
      windowMs: 600000,
    });

    await prisma.user.update({
      where: { email: 'admin@xypes.local' },
      data: {
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaEnabledAt: null,
      },
    });
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
