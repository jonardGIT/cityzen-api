import request from 'supertest';
import app, { API_V1 } from '../app.js';
import { getAdminToken } from './helpers/auth.js';

const DEFAULT_PRIVACY_NOTICE_VERSION = 'ph-dpa-2012-v1';

async function registerSubject(label: string): Promise<{ token: string; email: string }> {
  const unique = `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `${unique}@postman.local`;

  const response = await request(app)
    .post(`${API_V1}/auth/register`)
    .send({
      name: `Privacy Subject ${unique}`,
      email,
      password: 'Password123!',
      privacyNoticeAccepted: true,
      privacyNoticeVersion: DEFAULT_PRIVACY_NOTICE_VERSION,
    });

  expect(response.status).toBe(201);

  return {
    token: response.body.token as string,
    email,
  };
}

describe('data-subject request workflow', () => {
  let adminToken = '';

  beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  it('allows an authenticated user to submit and list their own data-subject requests', async () => {
    const subject = await registerSubject('privacy-own');

    const createResponse = await request(app)
      .post(`${API_V1}/privacy-requests`)
      .set('Authorization', `Bearer ${subject.token}`)
      .send({
        requestType: 'ACCESS',
        details: 'Please provide a copy of my account and incident-related personal data.',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      requestType: 'ACCESS',
      status: 'SUBMITTED',
      channel: 'self-service',
      requesterEmail: subject.email,
    });
    expect(createResponse.body).toHaveProperty('dueAt');

    const listResponse = await request(app)
      .get(`${API_V1}/privacy-requests`)
      .set('Authorization', `Bearer ${subject.token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createResponse.body.id,
          requestType: 'ACCESS',
          status: 'SUBMITTED',
        }),
      ]),
    );
  });

  it('allows national admins to review and close data-subject requests', async () => {
    const subject = await registerSubject('privacy-admin');

    const createResponse = await request(app)
      .post(`${API_V1}/privacy-requests`)
      .set('Authorization', `Bearer ${subject.token}`)
      .send({
        requestType: 'CORRECTION',
        details: 'My contact details need to be corrected in the citizen profile.',
      });

    expect(createResponse.status).toBe(201);

    const listResponse = await request(app)
      .get(`${API_V1}/admin/privacy-requests`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createResponse.body.id,
          requestType: 'CORRECTION',
          requesterEmail: subject.email,
        }),
      ]),
    );

    const updateResponse = await request(app)
      .patch(`${API_V1}/admin/privacy-requests/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'FULFILLED',
        reviewerNotes: 'Verified the request against the authenticated session.',
        resolutionSummary: 'Correction request completed and records updated.',
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      id: createResponse.body.id,
      status: 'FULFILLED',
      resolutionSummary: 'Correction request completed and records updated.',
    });
    expect(updateResponse.body.reviewerUser).toHaveProperty('email', 'admin@xypes.local');
    expect(updateResponse.body).toHaveProperty('resolvedAt');
  });
});
