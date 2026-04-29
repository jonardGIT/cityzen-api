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
    delete process.env.DATA_RESIDENCY_MODE;
    delete process.env.DATA_PROCESSOR_INVENTORY_VERSION;
    delete process.env.DATA_RESIDENCY_APPROVED_HOSTS;
    delete process.env.CROSS_BORDER_TRANSFER_ASSESSMENT_REFERENCE;
    delete process.env.CROSS_BORDER_TRANSFER_MCC_REFERENCE;
    delete process.env.SECURITY_ALERT_WEBHOOK_URL;
    delete process.env.PRIVACY_DPO_CONTACT_EMAIL;
    delete process.env.PRIVACY_BREACH_PLAYBOOK_VERSION;
    delete process.env.PRIVACY_BREACH_NOTIFICATION_WINDOW_HOURS;
    delete process.env.PRIVACY_INCIDENT_ESCALATION_WEBHOOK_URL;
  });

  it('allows NATIONAL_ADMIN to read the data governance summary', async () => {
    process.env.DATA_RETENTION_AUDIT_LOG_DAYS = '730';
    process.env.DATA_LEGAL_HOLD_ENABLED = 'true';
    process.env.DATA_LEGAL_HOLD_CONTACT = 'records@example.gov';
    process.env.DATA_RESIDENCY_MODE = 'hybrid-ph-primary';
    process.env.DATA_PROCESSOR_INVENTORY_VERSION = '2026-04-29';
    process.env.DATA_RESIDENCY_APPROVED_HOSTS = 'security.example.gov';
    process.env.CROSS_BORDER_TRANSFER_ASSESSMENT_REFERENCE = 'DTIA-2026-001';
    process.env.CROSS_BORDER_TRANSFER_MCC_REFERENCE = 'NPC-MCC-2026-001';
    process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://security.example.gov/alerts';
    process.env.PRIVACY_DPO_CONTACT_EMAIL = 'dpo@example.gov';
    process.env.PRIVACY_BREACH_PLAYBOOK_VERSION = 'privacy-breach-playbook-2026.04';
    process.env.PRIVACY_BREACH_NOTIFICATION_WINDOW_HOURS = '72';
    process.env.PRIVACY_INCIDENT_ESCALATION_WEBHOOK_URL =
      'https://security.example.gov/privacy-incidents';

    const response = await request(app)
      .get(`${API_V1}/admin/security/data-governance`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.summary).toMatchObject({
      legalHoldEnabled: true,
      tlsRequired: true,
      retentionPolicyCount: 6,
      privacyNoticeVersion: 'ph-dpa-2012-v1',
      privacyNoticeEnforced: false,
      dataSubjectRequestResponseDays: 15,
      dataResidencyMode: 'hybrid-ph-primary',
    });
    expect(response.body.operationalControls).toMatchObject({
      monitoringRunbookDocumented: true,
      administrationControlsDocumented: true,
      accessGovernanceDocumented: true,
      sessionGovernanceDocumented: true,
      privilegedAccessReviewEndpoint: '/api/v1/admin/users/access-review',
      privilegedMfaComplianceEndpoint: '/api/v1/admin/users/mfa-compliance',
      privacyNoticeCaptureEndpoints: [
        '/api/v1/auth/register',
        '/api/v1/auth/mobile/register',
        '/api/v1/mobile/profile',
      ],
      subjectRequestIntakeEndpoint: '/api/v1/privacy-requests',
      subjectRequestAdminEndpoint: '/api/v1/admin/privacy-requests',
      breachRegisterEndpoint: '/api/v1/admin/security/privacy-incidents',
      sessionInventoryMode: 'app-jwt',
      quarterlyReviewRequired: true,
      subjectRequestWorkflowDocumented: true,
      processorInventoryVersion: '2026-04-29',
      privacyIncidentPlaybookVersion: 'privacy-breach-playbook-2026.04',
    });
    expect(response.body.breachResponse).toMatchObject({
      dpoContactEmail: 'dpo@example.gov',
      playbookVersion: 'privacy-breach-playbook-2026.04',
      notificationWindowHours: 72,
      escalationWebhookConfigured: true,
      breachRegisterEndpoint: '/api/v1/admin/security/privacy-incidents',
    });
    expect(response.body.dataResidency).toMatchObject({
      mode: 'hybrid-ph-primary',
      processorInventoryVersion: '2026-04-29',
      crossBorderTransferAssessmentReference: 'DTIA-2026-001',
      crossBorderTransferMccReference: 'NPC-MCC-2026-001',
    });
    expect(response.body.dataResidency.processors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'security-alert-delivery',
          configured: true,
          host: 'security.example.gov',
          approvedHost: true,
          likelyCrossBorder: false,
        }),
      ]),
    );
    expect(response.body.legalHold).toMatchObject({
      enabled: true,
      contact: 'records@example.gov',
    });
    expect(response.body.retentionPolicies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: 'audit-logs',
          retentionDays: 730,
          purgeAuthority: 'NATIONAL_ADMIN',
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
    expect(response.body.operationalControls).toHaveProperty('sessionInventoryMode');
    expect(response.body).toHaveProperty('breachResponse');
  });

  it('returns 403 for non-privileged users', async () => {
    const response = await request(app)
      .get(`${API_V1}/admin/security/data-governance`)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(response.status).toBe(403);
  });
});
