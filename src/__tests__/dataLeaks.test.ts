import request from 'supertest';
import bcrypt from 'bcryptjs';
import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';

jest.setTimeout(120000);

/**
 * Data Leak & Sensitive Field Exposure Tests
 *
 * Covers:
 * - Response body scanning for sensitive fields across all endpoints
 * - JWT token content analysis (no secrets in payload)
 * - Audit log metadata scanning
 * - Error response scanning for internal details
 * - Session data exposure
 * - Database field leakage through includes
 */

let adminToken: string;

beforeAll(async () => {
  const login = await request(app).post(`${API_V1}/auth/login`).send({
    email: 'admin@xypes.local',
    password: 'Password123!',
  });
  adminToken = login.body.token;
});

const SENSITIVE_FIELDS = ['passwordHash', 'mfaSecretEncrypted', 'refreshTokenHash', 'tokenHash'];

const SENSITIVE_PATTERNS = [
  /password_?hash/i,
  /mfa_?secret/i,
  /refresh_?token_?hash/i,
  /token_?hash/i,
  /\$2[aby]\$\d+\$/, // bcrypt hash pattern
];

function assertNoSensitiveData(body: unknown, context: string): void {
  const json = JSON.stringify(body);

  for (const field of SENSITIVE_FIELDS) {
    expect(json).not.toContain(`"${field}"`);
  }

  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(json)) {
      // Allow "passwordHash" in error messages but not as actual data
      if (!json.includes('must be') && !json.includes('required')) {
        fail(`${context}: response contains sensitive pattern ${pattern}`);
      }
    }
  }
}

// ─── User Endpoints ──────────────────────────────────────────────────────────

describe('Data Leak — User endpoints', () => {
  it('GET /users does not expose sensitive fields', async () => {
    const res = await request(app)
      .get(`${API_V1}/users`)
      .set('Authorization', `Bearer ${adminToken}`);

    assertNoSensitiveData(res.body, 'GET /users');
  });

  it('GET /users/:id does not expose sensitive fields', async () => {
    const listRes = await request(app)
      .get(`${API_V1}/users`)
      .set('Authorization', `Bearer ${adminToken}`);
    const users = Array.isArray(listRes.body) ? listRes.body : listRes.body.data || [];

    if (users.length > 0) {
      const res = await request(app)
        .get(`${API_V1}/users/${users[0].id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assertNoSensitiveData(res.body, `GET /users/${users[0].id}`);
    }
  });

  it('POST /users does not return sensitive fields', async () => {
    const stamp = Date.now();
    const res = await request(app)
      .post(`${API_V1}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Leak',
        lastName: `Test ${stamp}`,
        email: `leak.${stamp}@test.local`,
        password: 'Password123!',
        role: 'CITIZEN_REPORTER',
      });

    if (res.status === 201) {
      assertNoSensitiveData(res.body, 'POST /users');
    }
  });

  it('GET /users/capabilities does not expose sensitive fields', async () => {
    const res = await request(app)
      .get(`${API_V1}/users/capabilities`)
      .set('Authorization', `Bearer ${adminToken}`);

    assertNoSensitiveData(res.body, 'GET /users/capabilities');
  });
});

// ─── Auth Endpoints ──────────────────────────────────────────────────────────

describe('Data Leak — Auth endpoints', () => {
  it('POST /auth/login response does not expose password hash', async () => {
    const res = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    assertNoSensitiveData(res.body, 'POST /auth/login');
  });

  it('POST /auth/register response does not expose password hash', async () => {
    const stamp = Date.now();
    const res = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        firstName: 'Leak',
        lastName: `Reg ${stamp}`,
        email: `leakreg.${stamp}@test.local`,
        password: 'Password123!',
      });

    assertNoSensitiveData(res.body, 'POST /auth/register');
  });

  it('GET /auth/me does not expose sensitive fields', async () => {
    const res = await request(app)
      .get(`${API_V1}/auth/me`)
      .set('Authorization', `Bearer ${adminToken}`);

    assertNoSensitiveData(res.body, 'GET /auth/me');
  });

  it('GET /auth/sessions does not expose token hashes', async () => {
    const res = await request(app)
      .get(`${API_V1}/auth/sessions`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (res.status === 200) {
      assertNoSensitiveData(res.body, 'GET /auth/sessions');
    }
  });

  it('JWT payload does not contain secrets', () => {
    const parts = adminToken.split('.');
    expect(parts.length).toBe(3);

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    expect(payload).not.toHaveProperty('password');
    expect(payload).not.toHaveProperty('passwordHash');
    expect(payload).not.toHaveProperty('mfaSecret');
    expect(payload).not.toHaveProperty('mfaSecretEncrypted');
    expect(payload).not.toHaveProperty('refreshToken');

    // Should only have standard claims + role + session info
    const expectedKeys = ['sub', 'email', 'role', 'sid', 'iat', 'exp'];
    for (const key of Object.keys(payload)) {
      expect(expectedKeys).toContain(key);
    }
  });
});

// ─── Admin Endpoints ─────────────────────────────────────────────────────────

describe('Data Leak — Admin endpoints', () => {
  it('GET /admin/users does not expose sensitive fields', async () => {
    const res = await request(app)
      .get(`${API_V1}/admin/users`)
      .set('Authorization', `Bearer ${adminToken}`);

    assertNoSensitiveData(res.body, 'GET /admin/users');
  });

  it('GET /admin/users/mfa-compliance does not expose MFA secrets', async () => {
    const res = await request(app)
      .get(`${API_V1}/admin/users/mfa-compliance`)
      .set('Authorization', `Bearer ${adminToken}`);

    assertNoSensitiveData(res.body, 'GET /admin/users/mfa-compliance');
  });

  it('GET /admin/users/access-review does not expose sensitive session data', async () => {
    const res = await request(app)
      .get(`${API_V1}/admin/users/access-review`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (res.status === 200) {
      assertNoSensitiveData(res.body, 'GET /admin/users/access-review');
    }
  });
});

// ─── Audit Logs ──────────────────────────────────────────────────────────────

describe('Data Leak — Audit logs', () => {
  it('audit logs do not contain passwords or tokens', async () => {
    // Trigger some audit events
    await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    const res = await request(app)
      .get(`${API_V1}/audit-logs`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (res.status === 200) {
      const logs = Array.isArray(res.body) ? res.body : res.body.data || [];
      for (const log of logs) {
        const logStr = JSON.stringify(log);
        expect(logStr).not.toMatch(/Password123!/);
        expect(logStr).not.toMatch(/\$2[aby]\$\d+\$/); // bcrypt hash
      }
    }
  });
});

// ─── CRUD Resource Endpoints ─────────────────────────────────────────────────

describe('Data Leak — CRUD resource endpoints', () => {
  const endpoints = [
    '/citizens',
    '/agencies',
    '/responders',
    '/statuses',
    '/categories',
    '/severities',
  ];

  for (const endpoint of endpoints) {
    it(`GET ${endpoint} does not expose internal fields`, async () => {
      const res = await request(app)
        .get(`${API_V1}${endpoint}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assertNoSensitiveData(res.body, `GET ${endpoint}`);
    });
  }
});

// ─── Error Responses ─────────────────────────────────────────────────────────

describe('Data Leak — Error responses', () => {
  it('401 error does not leak internal details', async () => {
    const res = await request(app).get(`${API_V1}/users`).set('Authorization', 'Bearer invalid');

    expect(res.status).toBe(401);
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/JWT_SECRET/);
    expect(body).not.toMatch(/prisma/i);
    expect(body).not.toMatch(/stack/i);
  });

  it('404 error does not leak internal details', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000000';
    const res = await request(app)
      .get(`${API_V1}/users/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/prisma/i);
    expect(body).not.toMatch(/postgres/i);
  });

  it('422 error does not leak field internals', async () => {
    const res = await request(app).post(`${API_V1}/auth/register`).send({ name: 'x' });

    expect(res.status).toBe(422);
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/SQL|SELECT|INSERT/i);
  });
});
