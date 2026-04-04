import request from 'supertest';
import bcrypt from 'bcryptjs';
import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';

describe('admin data governance summary', () => {
  let adminToken = '';
  let auditorToken = '';
  let citizenToken = '';

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { email: 'auditor@xypes.local' },
      update: {
        name: 'Auditor',
        passwordHash: await bcrypt.hash('Password123!', 10),
        role: 'AUDITOR',
        archivedAt: null,
      },
      create: {
        name: 'Auditor',
        email: 'auditor@xypes.local',
        passwordHash: await bcrypt.hash('Password123!', 10),
        role: 'AUDITOR',
      },
    });

    adminToken = await getAdminToken();
    auditorToken = await getTokenForRole('auditor@xypes.local');
    citizenToken = await getTokenForRole('analyst@xypes.local');
  });

  afterEach(() => {
    delete process.env.DATA_RETENTION_AUTH_SESSIONS_DAYS;
    delete process.env.DATA_RETENTION_PASSWORD_RESET_DAYS;
    delete process.env.DATA_RETENTION_AUDIT_LOG_DAYS;
    delete process.env.DATA_RETENTION_INCIDENT_MEDIA_DAYS;
    delete process.env.DATA_RETENTION_INCIDENT_RECORDS_DAYS;
    delete process.env.DATA_RETENTION_CITIZEN_RECORDS_DAYS;
    delete process.env.DATA_LEGAL_HOLD_ENABLED;
    delete process.env.DATA_LEGAL_HOLD_CONTACT;
  });

  it('allows SYSTEM_ADMIN to read the data governance summary', async () => {
    process.env.DATA_RETENTION_AUDIT_LOG_DAYS = '730';
    process.env.DATA_LEGAL_HOLD_ENABLED = 'true';
    process.env.DATA_LEGAL_HOLD_CONTACT = 'records@example.gov';

    const response = await request(app)
      .get(`${API_V1}/admin/security/data-governance`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.summary).toMatchObject({
      legalHoldEnabled: true,
      tlsRequired: true,
      retentionPolicyCount: 6,
    });
    expect(response.body.legalHold).toMatchObject({
      enabled: true,
      contact: 'records@example.gov',
    });
    expect(response.body.retentionPolicies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: 'audit-logs',
          retentionDays: 730,
          purgeAuthority: 'SYSTEM_ADMIN',
        }),
      ]),
    );
  });

  it('allows AUDITOR to read the data governance summary', async () => {
    const response = await request(app)
      .get(`${API_V1}/admin/security/data-governance`)
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.classifications)).toBe(true);
  });

  it('returns 403 for non-privileged users', async () => {
    const response = await request(app)
      .get(`${API_V1}/admin/security/data-governance`)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(response.status).toBe(403);
  });
});