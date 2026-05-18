import request from 'supertest';
import bcrypt from 'bcryptjs';
import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';

async function waitForAuditLog(
  query: () => Promise<Array<Record<string, unknown>>>,
  attempts = 10,
): Promise<Array<Record<string, unknown>>> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const logs = await query();
    if (logs.length > 0) {
      return logs;
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  return query();
}

describe('admin access review', () => {
  let adminToken = '';
  let managerToken = '';
  let auditorToken = '';
  let citizenToken = '';

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { email: 'review.dispatcher@xypes.local' },
      update: {
        name: 'Review Dispatcher',
        role: 'DISPATCHER',
        passwordHash: await bcrypt.hash('Password123!', 10),
        mfaEnabled: false,
        mfaEnabledAt: null,
        archivedAt: null,
      },
      create: {
        name: 'Review Dispatcher',
        email: 'review.dispatcher@xypes.local',
        passwordHash: await bcrypt.hash('Password123!', 10),
        role: 'DISPATCHER',
      },
    });

    adminToken = await getAdminToken();
    managerToken = await getTokenForRole('ops.lead@xypes.local');
    auditorToken = await getTokenForRole('auditor@xypes.local');
    citizenToken = await getTokenForRole('analyst@xypes.local');
  });

  afterEach(() => {
    delete process.env.ADMIN_ACCESS_REVIEW_STALE_DAYS;
  });

  it(`allows NATIONAL_ADMIN to read ${API_V1}/admin/users/access-review`, async () => {
    process.env.ADMIN_ACCESS_REVIEW_STALE_DAYS = '30';

    const adminLogin = await request(app)
      .post(`${API_V1}/auth/login`)
      .set(
        'User-Agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
      )
      .send({
        email: 'admin@xypes.local',
        password: 'Password123!',
      });

    expect(adminLogin.status).toBe(200);

    const response = await request(app)
      .get(`${API_V1}/admin/users/access-review`)
      .set('Authorization', `Bearer ${adminLogin.body.token}`);

    expect(response.status).toBe(200);
    expect(response.body.summary).toMatchObject({
      totalPrivilegedUsers: expect.any(Number),
      usersRequiringReview: expect.any(Number),
      staleUsers: expect.any(Number),
      usersWithoutMfa: expect.any(Number),
      staleAfterDays: 30,
    });

    const flaggedUser = response.body.data.find(
      (user: { email: string }) => user.email === 'review.dispatcher@xypes.local',
    );
    expect(flaggedUser).toMatchObject({
      role: 'DISPATCHER',
      mfaEnabled: false,
      hasActiveSessions: false,
      stale: true,
      requiresReview: true,
      reviewReasons: expect.arrayContaining(['mfa-disabled', 'stale-session-activity']),
    });

    const adminUser = response.body.data.find(
      (user: { email: string }) => user.email === 'admin@xypes.local',
    );
    expect(adminUser).toMatchObject({
      role: 'NATIONAL_ADMIN',
      hasActiveSessions: true,
      activeSessionCount: expect.any(Number),
      latestSessionUserAgent: expect.any(String),
      latestSessionBrowserFamily: 'Chrome',
      latestSessionOsFamily: 'Windows',
      latestSessionDeviceLabel: 'Chrome on Windows',
    });

    expect(flaggedUser).toMatchObject({
      latestSessionUserAgent: null,
      latestSessionIpAddress: null,
      latestSessionDeviceLabel: null,
    });
  });

  it('allows NATIONAL_ADMIN to list admin users', async () => {
    const response = await request(app)
      .get(`${API_V1}/admin/users`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('allows NATIONAL_ADMIN to read the admin session inventory with tighter redaction', async () => {
    const dispatcherLogin = await request(app)
      .post(`${API_V1}/auth/login`)
      .set(
        'User-Agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
      )
      .send({
        email: 'review.dispatcher@xypes.local',
        password: 'Password123!',
      });

    expect(dispatcherLogin.status).toBe(200);

    const response = await request(app)
      .get(`${API_V1}/admin/session-inventory`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    const dispatcherSession = response.body.find(
      (session: { userEmail?: string; id?: string }) =>
        session.userEmail === 'review.dispatcher@xypes.local' &&
        session.id === dispatcherLogin.body.sessionId,
    );

    expect(dispatcherSession).toMatchObject({
      userEmail: 'review.dispatcher@xypes.local',
      userRole: 'DISPATCHER',
      deviceLabel: 'Chrome on Windows',
      authProvider: expect.any(String),
      ipAddressMasked: expect.any(String),
      status: 'active',
    });
    expect(dispatcherSession).not.toHaveProperty('userAgent');
    expect(dispatcherSession).not.toHaveProperty('ipAddress');
    expect(dispatcherSession).not.toHaveProperty('refreshExpiresAt');
  });

  it('allows AUDITOR to read the admin session inventory', async () => {
    const response = await request(app)
      .get(`${API_V1}/admin/session-inventory`)
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('returns 403 for CITY_ADMIN on the admin session inventory', async () => {
    const response = await request(app)
      .get(`${API_V1}/admin/session-inventory`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(response.status).toBe(403);
  });

  it('allows NATIONAL_ADMIN to revoke a session through the admin session inventory and records a distinct audit log', async () => {
    const dispatcherLogin = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'review.dispatcher@xypes.local',
      password: 'Password123!',
    });

    expect(dispatcherLogin.status).toBe(200);

    const before = new Date();
    const revokeResponse = await request(app)
      .delete(`${API_V1}/admin/session-inventory/${dispatcherLogin.body.sessionId as string}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(revokeResponse.status).toBe(204);

    const meResponse = await request(app)
      .get(`${API_V1}/auth/me`)
      .set('Authorization', `Bearer ${dispatcherLogin.body.token as string}`);

    expect(meResponse.status).toBe(401);

    const auditLogs = await waitForAuditLog(
      () =>
        prisma.auditLog.findMany({
          where: {
            action: 'admin_session_revoke',
            resource: 'admin-session-inventory',
            timestamp: { gte: before },
          },
          orderBy: { timestamp: 'desc' },
          take: 1,
        }) as unknown as Promise<Array<Record<string, unknown>>>,
    );

    expect(auditLogs[0]).toMatchObject({
      action: 'admin_session_revoke',
      resource: 'admin-session-inventory',
      outcome: 'success',
      metadata: expect.objectContaining({
        adminScope: 'session-inventory',
        targetUserEmail: 'review.dispatcher@xypes.local',
      }),
    });
  });

  it('returns 403 for AUDITOR when revoking an admin session inventory entry', async () => {
    const response = await request(app)
      .delete(`${API_V1}/admin/session-inventory/11111111-1111-4111-8111-111111111111`)
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(response.status).toBe(403);
  });

  it('allows NATIONAL_ADMIN to read the privileged MFA compliance report', async () => {
    const response = await request(app)
      .get(`${API_V1}/admin/users/mfa-compliance`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.summary).toMatchObject({
      totalPrivilegedUsers: expect.any(Number),
      compliantUsers: expect.any(Number),
      nonCompliantUsers: expect.any(Number),
    });
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('returns 403 for CITY_ADMIN on the privileged access review report', async () => {
    const response = await request(app)
      .get(`${API_V1}/admin/users/access-review`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(response.status).toBe(403);
  });

  it('returns 403 for AUDITOR on the privileged access review report', async () => {
    const response = await request(app)
      .get(`${API_V1}/admin/users/access-review`)
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(response.status).toBe(403);
  });

  it('returns 403 for CITY_ADMIN on the admin user list', async () => {
    const response = await request(app)
      .get(`${API_V1}/admin/users`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(response.status).toBe(403);
  });

  it('returns 403 for CITY_ADMIN on the privileged MFA compliance report', async () => {
    const response = await request(app)
      .get(`${API_V1}/admin/users/mfa-compliance`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(response.status).toBe(403);
  });

  it('returns 403 for non-admin users', async () => {
    const response = await request(app)
      .get(`${API_V1}/admin/users/access-review`)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(response.status).toBe(403);
  });

  it('returns 403 for non-admin users on the admin user list', async () => {
    const response = await request(app)
      .get(`${API_V1}/admin/users`)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(response.status).toBe(403);
  });
});
