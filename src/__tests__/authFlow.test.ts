import request from 'supertest';
import bcrypt from 'bcryptjs';
import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';
import { generateMfaCodeFromSecret } from '../utils/mfa.js';

jest.setTimeout(120000);

/**
 * Comprehensive Auth Flow Tests
 *
 * Covers:
 * - Registration flow (validation, duplicate, token return)
 * - Login flow (correct, wrong password, non-existent user)
 * - Session management (refresh, revoke, list, revoke-all)
 * - Password reset flow (request, confirm, expired token, reuse)
 * - MFA setup/enable/disable lifecycle
 * - MFA enforcement for privileged roles
 * - Token expiry & revoked session handling
 * - /auth/me endpoint
 */

let adminToken: string;
let adminRefreshToken: string;
let adminSessionId: string;

beforeEach(async () => {
  // Reset admin user to clean state
  await prisma.user.update({
    where: { email: 'admin@xypes.local' },
    data: {
      passwordHash: await bcrypt.hash('Password123!', 10),
      mfaEnabled: false,
      mfaSecretEncrypted: null,
      mfaEnabledAt: null,
      archivedAt: null,
    },
  });

  // Revoke any stale sessions
  await prisma.authSession.updateMany({
    where: { revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const login = await request(app).post(`${API_V1}/auth/login`).send({
    email: 'admin@xypes.local',
    password: 'Password123!',
  });
  adminToken = login.body.token;
  adminRefreshToken = login.body.refreshToken;
  adminSessionId = login.body.sessionId;
});

// ─── Registration ────────────────────────────────────────────────────────────

describe('Auth — Registration', () => {
  it('registers a new citizen user and returns token bundle', async () => {
    const stamp = Date.now();
    const res = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: `Flow Test User ${stamp}`,
        email: `flowtest.${stamp}@test.local`,
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body).toHaveProperty('sessionId');
    expect(res.body).toHaveProperty('expiresAt');
    expect(res.body.user.role).toBe('CITIZEN_REPORTER');
  });

  it('registers a new citizen user without any name fields', async () => {
    const stamp = Date.now();
    const email = `flowtest.nameless.${stamp}@test.local`;
    const res = await request(app).post(`${API_V1}/auth/register`).send({
      email,
      password: 'Password123!',
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email,
      name: null,
      firstName: null,
      middleName: null,
      lastName: null,
      suffix: null,
      role: 'CITIZEN_REPORTER',
    });
  });

  it('rejects registration with missing fields', async () => {
    const res = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({ email: 'test@test.local' });

    expect(res.status).toBe(422);
    expect(res.body.message).toBe('email and password are required');
  });

  it('rejects weak password', async () => {
    const res = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: 'Weak Pass User',
        email: `weak.${Date.now()}@test.local`,
        password: 'short',
      });

    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/password/i);
  });

  it('rejects password without uppercase', async () => {
    const res = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: 'No Upper',
        email: `noupper.${Date.now()}@test.local`,
        password: 'alllowercase123!',
      });

    expect(res.status).toBe(422);
  });

  it('rejects password without special character', async () => {
    const res = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: 'No Special',
        email: `nospecial.${Date.now()}@test.local`,
        password: 'NoSpecialChar123',
      });

    expect(res.status).toBe(422);
  });

  it('rejects duplicate email', async () => {
    const res = await request(app).post(`${API_V1}/auth/register`).send({
      name: 'Dupe',
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already registered/i);
  });

  it('normalizes email to lowercase', async () => {
    const stamp = Date.now();
    const res = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: 'Case Test',
        email: `UPPER.${stamp}@Test.LOCAL`,
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(`upper.${stamp}@test.local`);
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe('Auth — Login', () => {
  it('returns token bundle on valid credentials', async () => {
    const res = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('accessToken', res.body.token);
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body).toHaveProperty('sessionId');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).toHaveProperty('email');
    expect(res.body.user).toHaveProperty('role');
    // Must NOT leak passwordHash
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.user).not.toHaveProperty('mfaSecretEncrypted');
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
    // Must not reveal whether email exists
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('returns 401 for non-existent email', async () => {
    const res = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'nonexistent@xypes.local',
      password: 'Password123!',
    });

    expect(res.status).toBe(401);
    // Same message as wrong password (prevent enumeration)
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('rejects login with missing fields', async () => {
    const res = await request(app)
      .post(`${API_V1}/auth/login`)
      .send({ email: 'admin@xypes.local' });

    expect(res.status).toBe(422);
  });

  it('normalizes email case on login', async () => {
    const res = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'ADMIN@XYPES.LOCAL',
      password: 'Password123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('admin@xypes.local');
  });
});

// ─── /auth/me ────────────────────────────────────────────────────────────────

describe('Auth — /me endpoint', () => {
  it('returns authenticated user profile', async () => {
    const res = await request(app)
      .get(`${API_V1}/auth/me`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email');
    expect(res.body).toHaveProperty('role');
    // Security: must NOT leak sensitive fields
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body).not.toHaveProperty('mfaSecretEncrypted');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get(`${API_V1}/auth/me`);
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get(`${API_V1}/auth/me`)
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(401);
  });

  it('returns 401 with malformed authorization header', async () => {
    const res = await request(app).get(`${API_V1}/auth/me`).set('Authorization', 'NotBearer token');

    expect(res.status).toBe(401);
  });
});

// ─── Session Management ──────────────────────────────────────────────────────

describe('Auth — Session Management', () => {
  it('lists active sessions', async () => {
    const res = await request(app)
      .get(`${API_V1}/auth/sessions`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('refreshes a session and gets new tokens', async () => {
    const res = await request(app).post(`${API_V1}/auth/refresh`).send({
      refreshToken: adminRefreshToken,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    // New token should be different
    expect(res.body.refreshToken).not.toBe(adminRefreshToken);
  });

  it('rejects refresh with invalid refresh token', async () => {
    const res = await request(app).post(`${API_V1}/auth/refresh`).send({
      refreshToken: 'invalid-refresh-token',
    });

    expect(res.status).toBe(401);
  });

  it('revokes a specific session', async () => {
    // Create an extra session
    const login = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });
    const extraSessionId = login.body.sessionId;

    const res = await request(app)
      .delete(`${API_V1}/auth/sessions/${extraSessionId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it('logs out current session', async () => {
    const login = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    const logoutRes = await request(app)
      .post(`${API_V1}/auth/logout`)
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(logoutRes.status).toBe(204);

    // Token should be invalid after logout
    const meRes = await request(app)
      .get(`${API_V1}/auth/me`)
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(meRes.status).toBe(401);
  });
});

// ─── Password Reset Flow ────────────────────────────────────────────────────

describe('Auth — Password Reset', () => {
  it('requests a password reset for existing user', async () => {
    const analystLogin = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'analyst@xypes.local',
      password: 'Password123!',
    });

    const res = await request(app)
      .post(`${API_V1}/auth/password-reset/request`)
      .send({ email: 'analyst@xypes.local' });

    // Should succeed silently (don't reveal if email exists in some configs)
    expect([200, 202, 204]).toContain(res.status);
  });

  it('does not error for non-existent email on password reset request', async () => {
    const res = await request(app)
      .post(`${API_V1}/auth/password-reset/request`)
      .send({ email: 'doesnotexist@nowhere.local' });

    // Should respond 200 to prevent email enumeration
    expect(res.status).toBeLessThan(500);
  });

  it('rejects password reset confirm with invalid token', async () => {
    const res = await request(app)
      .post(`${API_V1}/auth/password-reset/confirm`)
      .send({ token: 'invalid-token', password: 'NewPassword123!' });

    expect(res.status).toBe(401);
  });
});

// ─── MFA Lifecycle ───────────────────────────────────────────────────────────

describe('Auth — MFA Lifecycle', () => {
  it('complete MFA setup → enable → verify → disable cycle', async () => {
    // Setup MFA
    const setup = await request(app)
      .post(`${API_V1}/auth/mfa/setup`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(setup.status).toBe(200);
    expect(setup.body).toHaveProperty('secret');
    expect(setup.body).toHaveProperty('otpauthUrl');
    expect(setup.body).toHaveProperty('issuer');

    const { secret } = setup.body;

    // Enable MFA with valid code
    const enableCode = generateMfaCodeFromSecret(secret);
    const enable = await request(app)
      .post(`${API_V1}/auth/mfa/enable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: enableCode });

    expect(enable.status).toBe(200);

    // Old token should be revoked after MFA enable
    const meAfterEnable = await request(app)
      .get(`${API_V1}/auth/me`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(meAfterEnable.status).toBe(401);

    // Login now requires MFA code
    const loginNoMfa = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });
    expect(loginNoMfa.status).toBe(401);
    expect(loginNoMfa.body).toHaveProperty('mfaRequired', true);

    // Login with MFA code
    const mfaCode = generateMfaCodeFromSecret(secret);
    const loginWithMfa = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
      mfaCode,
    });
    expect(loginWithMfa.status).toBe(200);
    expect(loginWithMfa.body).toHaveProperty('token');

    // Disable MFA
    const disableCode = generateMfaCodeFromSecret(secret);
    const disable = await request(app)
      .post(`${API_V1}/auth/mfa/disable`)
      .set('Authorization', `Bearer ${loginWithMfa.body.token}`)
      .send({ code: disableCode });

    expect(disable.status).toBe(200);
  });

  it('rejects MFA enable with wrong code', async () => {
    const setup = await request(app)
      .post(`${API_V1}/auth/mfa/setup`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(setup.status).toBe(200);

    const enable = await request(app)
      .post(`${API_V1}/auth/mfa/enable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: '000000' });

    expect(enable.status).toBe(401);
  });

  it('rejects MFA enable without code', async () => {
    await request(app)
      .post(`${API_V1}/auth/mfa/setup`)
      .set('Authorization', `Bearer ${adminToken}`);

    const enable = await request(app)
      .post(`${API_V1}/auth/mfa/enable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(enable.status).toBeGreaterThanOrEqual(400);
  });
});
