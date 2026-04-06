import request from 'supertest';
import bcrypt from 'bcryptjs';
import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';

describe('admin access review', () => {
  let adminToken = '';
  let managerToken = '';
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
    citizenToken = await getTokenForRole('analyst@xypes.local');
  });

  afterEach(() => {
    delete process.env.ADMIN_ACCESS_REVIEW_STALE_DAYS;
  });

  it(`allows SYSTEM_ADMIN to read ${API_V1}/admin/users/access-review`, async () => {
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
      role: 'SYSTEM_ADMIN',
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

  it('allows DEPARTMENT_MANAGER to read the privileged access review report', async () => {
    const response = await request(app)
      .get(`${API_V1}/admin/users/access-review`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('returns 403 for non-admin users', async () => {
    const response = await request(app)
      .get(`${API_V1}/admin/users/access-review`)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(response.status).toBe(403);
  });
});
