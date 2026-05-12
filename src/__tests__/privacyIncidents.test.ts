import request from 'supertest';

import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';

const BASE = `${API_V1}/admin/security/privacy-incidents`;
const TEST_SUMMARY_PREFIX = `privacy-incident-test-${Date.now()}`;

let adminToken = '';
let auditorToken = '';
let citizenToken = '';
let adminUserId = '';
const createdIncidentIds: string[] = [];

async function seedPrivacyIncident(overrides: Record<string, unknown> = {}) {
  const incident = await prisma.privacyIncident.create({
    data: {
      reportedByUserId: adminUserId,
      referenceCode: `PI-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: 'REPORTED',
      severity: 'HIGH',
      detectedAt: new Date('2026-05-10T08:00:00.000Z'),
      summary: `${TEST_SUMMARY_PREFIX}-seeded-${Date.now()}`,
      details: 'Seeded privacy incident for admin endpoint tests.',
      likelyPersonalDataBreach: true,
      npcNotificationRequired: false,
      dataSubjectNotificationRequired: false,
      affectedDataCategories: ['contact_information'],
      ...overrides,
    },
  });

  createdIncidentIds.push(incident.id);
  return incident;
}

beforeAll(async () => {
  adminToken = await getAdminToken();
  auditorToken = await getTokenForRole('auditor@xypes.local');
  citizenToken = await getTokenForRole('analyst@xypes.local');

  const adminUser = await prisma.user.findUniqueOrThrow({
    where: { email: 'admin@xypes.local' },
    select: { id: true },
  });

  adminUserId = adminUser.id;
});

afterAll(async () => {
  if (createdIncidentIds.length > 0) {
    await prisma.privacyIncident.deleteMany({
      where: { id: { in: createdIncidentIds } },
    });
  }
});

describe(`POST ${BASE}`, () => {
  it('allows NATIONAL_ADMIN to register a privacy incident', async () => {
    const response = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        summary: `${TEST_SUMMARY_PREFIX}-create`,
        severity: 'CRITICAL',
        details: 'Unauthorized export of case attachment metadata.',
        npcNotificationRequired: true,
        dataSubjectNotificationRequired: true,
        affectedRecordCount: 24,
        affectedDataCategories: ['contact_information', 'incident_summary'],
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      status: 'REPORTED',
      severity: 'CRITICAL',
      summary: `${TEST_SUMMARY_PREFIX}-create`,
      npcNotificationRequired: true,
      dataSubjectNotificationRequired: true,
      affectedRecordCount: 24,
    });
    expect(response.body.referenceCode).toMatch(/^PIR-/);
    expect(response.body.npcNotificationDueAt).not.toBeNull();
    expect(response.body.reportedByUser).toMatchObject({
      email: 'admin@xypes.local',
      role: 'NATIONAL_ADMIN',
    });

    createdIncidentIds.push(response.body.id);
  });

  it('returns a validation error for unsupported severity', async () => {
    const response = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        summary: `${TEST_SUMMARY_PREFIX}-invalid-severity`,
        severity: 'SEVERE',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Validation failed' });
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'severity',
          message: 'severity must be a supported privacy incident severity',
        }),
      ]),
    );
  });

  it('returns 403 for non-privileged users', async () => {
    const response = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        summary: `${TEST_SUMMARY_PREFIX}-forbidden`,
      });

    expect(response.status).toBe(403);
  });
});

describe(`GET ${BASE}`, () => {
  it('allows AUDITOR to list privacy incidents with summary metadata', async () => {
    const openIncident = await seedPrivacyIncident({
      summary: `${TEST_SUMMARY_PREFIX}-open`,
      severity: 'MEDIUM',
      npcNotificationRequired: true,
      npcNotificationDueAt: new Date('2026-05-09T08:00:00.000Z'),
    });
    await seedPrivacyIncident({
      summary: `${TEST_SUMMARY_PREFIX}-closed`,
      status: 'CLOSED',
      severity: 'LOW',
      resolutionSummary: 'Contained and validated.',
      closedAt: new Date('2026-05-10T10:00:00.000Z'),
    });

    const response = await request(app)
      .get(`${BASE}?severity=MEDIUM`)
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.summary).toMatchObject({
      total: 1,
      open: 1,
      pendingNpcNotification: 1,
      overdueNpcNotification: 1,
    });
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: openIncident.id,
          summary: `${TEST_SUMMARY_PREFIX}-open`,
          severity: 'MEDIUM',
        }),
      ]),
    );
  });

  it('returns 401 without authentication', async () => {
    const response = await request(app).get(BASE);

    expect(response.status).toBe(401);
  });
});

describe(`GET ${BASE}/:id`, () => {
  it('returns a privacy incident by id for an auditor', async () => {
    const incident = await seedPrivacyIncident({
      summary: `${TEST_SUMMARY_PREFIX}-detail`,
      reviewerNotes: 'Escalate to DPO once validated.',
    });

    const response = await request(app)
      .get(`${BASE}/${incident.id}`)
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: incident.id,
      summary: `${TEST_SUMMARY_PREFIX}-detail`,
      reviewerNotes: 'Escalate to DPO once validated.',
    });
  });
});

describe(`PATCH ${BASE}/:id`, () => {
  it('allows NATIONAL_ADMIN to update a privacy incident', async () => {
    const incident = await seedPrivacyIncident({
      summary: `${TEST_SUMMARY_PREFIX}-patch`,
      severity: 'HIGH',
    });

    const response = await request(app)
      .patch(`${BASE}/${incident.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'NPC_NOTIFIED',
        reviewerNotes: 'NPC contacted within 24 hours.',
        npcNotificationReference: 'NPC-2026-05-0007',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: incident.id,
      status: 'NPC_NOTIFIED',
      reviewerNotes: 'NPC contacted within 24 hours.',
      npcNotificationReference: 'NPC-2026-05-0007',
      reviewedByUserId: adminUserId,
    });
    expect(response.body.npcNotifiedAt).not.toBeNull();
  });

  it('fails closed when closing without a resolution summary', async () => {
    const incident = await seedPrivacyIncident({
      summary: `${TEST_SUMMARY_PREFIX}-close-without-resolution`,
    });

    const response = await request(app)
      .patch(`${BASE}/${incident.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CLOSED' });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      message: 'resolutionSummary is required when closing a privacy incident',
    });
  });
});
