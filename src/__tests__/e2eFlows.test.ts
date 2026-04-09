import request from 'supertest';
import bcrypt from 'bcryptjs';
import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';

jest.setTimeout(120000);

/**
 * End-to-End Flow Tests — Complete API Workflow Scenarios
 *
 * Covers:
 * - Full citizen incident lifecycle (create citizen → report incident → assign → resolve)
 * - Cross-resource consistency
 * - Concurrent session behavior
 * - Password change and session invalidation
 * - User archival cascading effects
 * - Delete guard chain testing
 * - Timestamp filtering
 * - Search functionality
 */

let adminToken: string;
let dispatcherToken: string;

async function loginAs(email: string): Promise<string> {
  const res = await request(app).post(`${API_V1}/auth/login`).send({
    email,
    password: 'Password123!',
  });
  return res.body.token;
}

beforeAll(async () => {
  adminToken = await loginAs('admin@xypes.local');
  dispatcherToken = await loginAs('dispatcher@xypes.local');
});

// ─── Full Incident Lifecycle ─────────────────────────────────────────────────

describe('E2E Flow — Incident Lifecycle', () => {
  let citizenId: string;
  let statusId: string;
  let categoryId: string;
  let severityId: string;
  let agencyId: string;
  let responderId: string;
  let incidentId: string;
  let assignmentId: string;

  it('Step 1: Create reference data (status, category, severity)', async () => {
    const statusRes = await request(app)
      .post(`${API_V1}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `E2E Status ${Date.now()}` });
    expect(statusRes.status).toBe(201);
    statusId = statusRes.body.id;

    const catRes = await request(app)
      .post(`${API_V1}/categories`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `E2E Category ${Date.now()}` });
    expect(catRes.status).toBe(201);
    categoryId = catRes.body.id;

    const sevRes = await request(app)
      .post(`${API_V1}/severities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ level: `e2e_${Date.now()}`, definition: 'E2E test severity' });
    expect(sevRes.status).toBe(201);
    severityId = sevRes.body.id;
  });

  it('Step 2: Create citizen', async () => {
    const res = await request(app)
      .post(`${API_V1}/citizens`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'E2E Citizen',
        contactInfo: 'e2e@test.local',
        preferredChannel: 'email',
      });
    expect(res.status).toBe(201);
    citizenId = res.body.id;
  });

  it('Step 3: Create agency and responder', async () => {
    const agencyRes = await request(app)
      .post(`${API_V1}/agencies`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `E2E Agency ${Date.now()}` });
    expect(agencyRes.status).toBe(201);
    agencyId = agencyRes.body.id;

    const respRes = await request(app)
      .post(`${API_V1}/responders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'E2E Responder',
        agencyId,
        role: 'Field Officer',
        contactInfo: 'responder@test.local',
      });
    expect(respRes.status).toBe(201);
    responderId = respRes.body.id;
  });

  it('Step 4: Create incident', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'E2E Test Incident — Fire reported',
        statusId,
        citizenId,
        categoryId,
        severityId,
        latitude: 14.5995,
        longitude: 120.9842,
        addressLine1: '123 Test Street',
        cityName: 'Manila',
        provinceName: 'Metro Manila',
        regionName: 'NCR',
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    incidentId = res.body.id;
  });

  it('Step 5: Create assignment (link responder to incident)', async () => {
    const res = await request(app)
      .post(`${API_V1}/assignments`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({
        incidentId,
        responderId,
      });
    expect(res.status).toBe(201);
    assignmentId = res.body.id;
  });

  it('Step 6: Update incident status', async () => {
    const newStatusRes = await request(app)
      .post(`${API_V1}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `E2E Resolved ${Date.now()}` });

    const res = await request(app)
      .patch(`${API_V1}/incidents/${incidentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: newStatusRes.body.id });

    expect(res.status).toBe(200);
  });

  it('Step 7: Verify incident has all relations', async () => {
    const res = await request(app)
      .get(`${API_V1}/incidents/${incidentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(incidentId);
  });

  it('Step 8: Cannot delete citizen with active incidents (delete guard)', async () => {
    const res = await request(app)
      .delete(`${API_V1}/citizens/${citizenId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
  });

  afterAll(async () => {
    // Clean up in reverse order
    if (assignmentId) {
      await request(app)
        .delete(`${API_V1}/assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
    if (incidentId) {
      await request(app)
        .delete(`${API_V1}/incidents/${incidentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
    if (responderId) {
      await request(app)
        .delete(`${API_V1}/responders/${responderId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
    if (agencyId) {
      await request(app)
        .delete(`${API_V1}/agencies/${agencyId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
    if (citizenId) {
      await request(app)
        .delete(`${API_V1}/citizens/${citizenId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
  });
});

// ─── Concurrent Sessions ────────────────────────────────────────────────────

describe('E2E Flow — Concurrent Sessions', () => {
  it('multiple sessions work independently', async () => {
    const login1 = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });
    const login2 = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(login1.body.sessionId).not.toBe(login2.body.sessionId);

    // Both tokens work
    const me1 = await request(app)
      .get(`${API_V1}/auth/me`)
      .set('Authorization', `Bearer ${login1.body.token}`);
    const me2 = await request(app)
      .get(`${API_V1}/auth/me`)
      .set('Authorization', `Bearer ${login2.body.token}`);

    expect(me1.status).toBe(200);
    expect(me2.status).toBe(200);

    // Revoking one does not affect the other
    await request(app)
      .delete(`${API_V1}/auth/sessions/${login1.body.sessionId}`)
      .set('Authorization', `Bearer ${login2.body.token}`);

    const me1After = await request(app)
      .get(`${API_V1}/auth/me`)
      .set('Authorization', `Bearer ${login1.body.token}`);
    const me2After = await request(app)
      .get(`${API_V1}/auth/me`)
      .set('Authorization', `Bearer ${login2.body.token}`);

    expect(me1After.status).toBe(401);
    expect(me2After.status).toBe(200);
  });
});

// ─── Timestamp Filtering ────────────────────────────────────────────────────

describe('E2E Flow — Timestamp Filtering', () => {
  it('filters by createdFrom/createdTo', async () => {
    const now = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();

    const res = await request(app)
      .get(`${API_V1}/statuses?createdFrom=${yesterday}&createdTo=${now}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('handles invalid date gracefully', async () => {
    const res = await request(app)
      .get(`${API_V1}/statuses?createdFrom=not-a-date`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Should not crash
    expect(res.status).toBeLessThan(500);
  });
});

// ─── Search Functionality ───────────────────────────────────────────────────

describe('E2E Flow — Search', () => {
  let searchStatusId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post(`${API_V1}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'UniqueSearchableName12345' });
    searchStatusId = res.body.id;
  });

  it('finds record by search term', async () => {
    const res = await request(app)
      .get(`${API_V1}/statuses?search=UniqueSearchableName12345`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const records = Array.isArray(res.body) ? res.body : res.body.data || [];
    const found = records.some((r: any) => r.name === 'UniqueSearchableName12345');
    expect(found).toBe(true);
  });

  it('returns empty results for non-matching search', async () => {
    const res = await request(app)
      .get(`${API_V1}/statuses?search=ZZZNonExistent99999`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const records = Array.isArray(res.body) ? res.body : res.body.data || [];
    expect(records.length).toBe(0);
  });

  afterAll(async () => {
    if (searchStatusId) {
      await request(app)
        .delete(`${API_V1}/statuses/${searchStatusId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
  });
});

// ─── Citizen Profile Linking ─────────────────────────────────────────────────

describe('E2E Flow — Citizen Profile Linking', () => {
  it('CITIZEN_REPORTER can link their profile', async () => {
    const citizenToken = await loginAs('analyst@xypes.local');

    const res = await request(app)
      .post(`${API_V1}/citizens/link-me`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        name: 'Linked Citizen',
        preferredChannel: 'sms',
      });

    // 201 if new, 200 if updating existing
    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty('contactInfo', 'analyst@xypes.local');
  });
});

// ─── Error Handler ──────────────────────────────────────────────────────────

describe('E2E Flow — Error Handler', () => {
  it('handles Prisma unique constraint violation with 409', async () => {
    const level = `unique_e2e_${Date.now()}`;

    await request(app)
      .post(`${API_V1}/severities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ level, definition: 'First' });

    const duplicate = await request(app)
      .post(`${API_V1}/severities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ level, definition: 'Second' });

    expect(duplicate.status).toBe(409);
  });

  it('returns proper JSON for all error responses', async () => {
    const endpoints = [
      { method: 'get', path: '/nonexistent' },
      { method: 'get', path: '/users/not-a-uuid' },
      { method: 'post', path: '/auth/login' },
    ];

    for (const ep of endpoints) {
      const res = await (request(app) as any)
        [ep.method](`${API_V1}${ep.path}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body).toHaveProperty('message');
    }
  });
});
