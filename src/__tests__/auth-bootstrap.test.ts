import request from 'supertest';
import bcrypt from 'bcryptjs';
import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';
import { generateMfaCodeFromSecret } from '../utils/mfa.js';

jest.setTimeout(120000);

describe('Auth bootstrap endpoints', () => {
  beforeEach(async () => {
    await prisma.user.update({
      where: { email: 'admin@xypes.local' },
      data: {
        passwordHash: await bcrypt.hash('Password123!', 10),
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaEnabledAt: null,
      },
    });
  });

  it('POST /auth/register should create a CITIZEN_REPORTER account and return token', async () => {
    const stamp = Date.now();
    const res = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: `Bootstrap User ${stamp}`,
        email: `bootstrap.${stamp}@postman.local`,
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body).toHaveProperty('sessionId');
    expect(res.body).toHaveProperty('expiresAt');
    expect(res.body).toHaveProperty('refreshExpiresAt');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('role', 'CITIZEN_REPORTER');
    expect(res.body.user).toHaveProperty('createdAt');
    expect(res.body.user).toHaveProperty('updatedAt');
  });

  it('POST /auth/login should return token for seeded admin', async () => {
    const res = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body).toHaveProperty('sessionId');
    expect(res.body).toHaveProperty('expiresAt');
    expect(res.body).toHaveProperty('refreshExpiresAt');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('createdAt');
    expect(res.body.user).toHaveProperty('updatedAt');
  });

  it('should enforce MFA for privileged users after setup and enablement', async () => {
    const login = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(login.status).toBe(200);

    const setup = await request(app)
      .post(`${API_V1}/auth/mfa/setup`)
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(setup.status).toBe(200);
    expect(setup.body).toHaveProperty('secret');
    expect(setup.body).toHaveProperty('otpauthUrl');

    const enableCode = generateMfaCodeFromSecret(setup.body.secret as string);
    const enable = await request(app)
      .post(`${API_V1}/auth/mfa/enable`)
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ code: enableCode });

    expect(enable.status).toBe(200);

    const meWithRevokedToken = await request(app)
      .get(`${API_V1}/auth/me`)
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(meWithRevokedToken.status).toBe(401);

    const loginWithoutMfa = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(loginWithoutMfa.status).toBe(401);
    expect(loginWithoutMfa.body).toHaveProperty('mfaRequired', true);

    const loginWithBadMfa = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
      mfaCode: '000000',
    });

    expect(loginWithBadMfa.status).toBe(401);
    expect(loginWithBadMfa.body).toHaveProperty('mfaRequired', true);

    const validLoginCode = generateMfaCodeFromSecret(setup.body.secret as string);
    const loginWithMfa = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
      mfaCode: validLoginCode,
    });

    expect(loginWithMfa.status).toBe(200);

    const disableCode = generateMfaCodeFromSecret(setup.body.secret as string);
    const disable = await request(app)
      .post(`${API_V1}/auth/mfa/disable`)
      .set('Authorization', `Bearer ${loginWithMfa.body.token}`)
      .send({ code: disableCode });

    expect(disable.status).toBe(200);

    const loginAfterDisable = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(loginAfterDisable.status).toBe(200);
  });

  it('POST /auth/mfa/setup should return 503 when MFA server config is missing', async () => {
    const originalKey = process.env.MFA_ENCRYPTION_KEY;
    delete process.env.MFA_ENCRYPTION_KEY;

    try {
      const login = await request(app).post(`${API_V1}/auth/login`).send({
        email: 'admin@xypes.local',
        password: 'Password123!',
      });

      expect(login.status).toBe(200);

      const setup = await request(app)
        .post(`${API_V1}/auth/mfa/setup`)
        .set('Authorization', `Bearer ${login.body.token}`);

      expect(setup.status).toBe(503);
      expect(setup.body).toHaveProperty(
        'message',
        'MFA is not available: MFA_ENCRYPTION_KEY must be configured on the server',
      );
    } finally {
      process.env.MFA_ENCRYPTION_KEY = originalKey;
    }
  });

  it('POST /auth/login should return 401 for wrong password', async () => {
    const res = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'WrongPassword!',
    });
    expect(res.status).toBe(401);
  });

  it('POST /auth/login should return 422 for missing fields', async () => {
    const res = await request(app).post(`${API_V1}/auth/login`).send({});
    expect(res.status).toBe(422);
  });

  it('POST /auth/register should return 422 for missing fields', async () => {
    const res = await request(app).post(`${API_V1}/auth/register`).send({ name: 'Incomplete' });
    expect(res.status).toBe(422);
  });

  it('POST /auth/register should return 409 for duplicate email', async () => {
    const res = await request(app).post(`${API_V1}/auth/register`).send({
      name: 'Duplicate',
      email: 'admin@xypes.local',
      password: 'Password123!',
    });
    expect(res.status).toBe(409);
  });

  it('GET /auth/me should return 401 without token', async () => {
    const res = await request(app).get(`${API_V1}/auth/me`);
    expect(res.status).toBe(401);
  });

  it('GET /auth/me should return current user with bearer token', async () => {
    const login = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(login.status).toBe(200);

    const me = await request(app)
      .get(`${API_V1}/auth/me`)
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(me.status).toBe(200);
    expect(me.body).toHaveProperty('id');
    expect(me.body).toHaveProperty('email', 'admin@xypes.local');
    expect(me.body).toHaveProperty('mfaEnabled');
    expect(me.body).toHaveProperty('createdAt');
    expect(me.body).toHaveProperty('updatedAt');
  });

  it('GET /auth/sessions should list active sessions and mark the current one', async () => {
    const firstLogin = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });
    const secondLogin = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(firstLogin.status).toBe(200);
    expect(secondLogin.status).toBe(200);

    const sessions = await request(app)
      .get(`${API_V1}/auth/sessions`)
      .set('Authorization', `Bearer ${secondLogin.body.token}`);

    expect(sessions.status).toBe(200);
    expect(Array.isArray(sessions.body)).toBe(true);
    expect(
      sessions.body.some((session: { id: string }) => session.id === firstLogin.body.sessionId),
    ).toBe(true);
    expect(
      sessions.body.some(
        (session: { id: string; isCurrent: boolean }) =>
          session.id === secondLogin.body.sessionId && session.isCurrent,
      ),
    ).toBe(true);
  });

  it('DELETE /auth/sessions/:id should revoke a specific session', async () => {
    const firstLogin = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });
    const secondLogin = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(firstLogin.status).toBe(200);
    expect(secondLogin.status).toBe(200);

    const revoke = await request(app)
      .delete(`${API_V1}/auth/sessions/${firstLogin.body.sessionId}`)
      .set('Authorization', `Bearer ${secondLogin.body.token}`);

    expect(revoke.status).toBe(204);

    const me = await request(app)
      .get(`${API_V1}/auth/me`)
      .set('Authorization', `Bearer ${firstLogin.body.token}`);

    expect(me.status).toBe(401);
    expect(me.body).toHaveProperty('message', 'Unauthorized: invalid or revoked session');
  });

  it('POST /auth/refresh should rotate refresh token and return a new access token pair', async () => {
    const login = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(login.status).toBe(200);

    const refresh = await request(app).post(`${API_V1}/auth/refresh`).send({
      refreshToken: login.body.refreshToken,
    });

    expect(refresh.status).toBe(200);
    expect(refresh.body).toHaveProperty('token');
    expect(refresh.body).toHaveProperty('refreshToken');
    expect(refresh.body.refreshToken).not.toBe(login.body.refreshToken);
    expect(refresh.body).toHaveProperty('sessionId', login.body.sessionId);

    const secondRefresh = await request(app).post(`${API_V1}/auth/refresh`).send({
      refreshToken: login.body.refreshToken,
    });

    expect(secondRefresh.status).toBe(401);
    expect(secondRefresh.body).toHaveProperty('message', 'Invalid or expired refresh token');
  });

  it('POST /auth/refresh should return 422 when refreshToken is missing', async () => {
    const refresh = await request(app).post(`${API_V1}/auth/refresh`).send({});

    expect(refresh.status).toBe(422);
  });

  it('password reset request and confirm should update the password and revoke existing sessions', async () => {
    const stamp = Date.now();
    const register = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: `Recovery User ${stamp}`,
        email: `recovery.${stamp}@postman.local`,
        password: 'Password123!',
      });

    expect(register.status).toBe(201);

    const resetRequest = await request(app)
      .post(`${API_V1}/auth/password-reset/request`)
      .send({ email: `recovery.${stamp}@postman.local` });

    expect(resetRequest.status).toBe(202);
    expect(resetRequest.body).toHaveProperty(
      'message',
      'If an account with that email exists, a password reset token has been created.',
    );
    expect(resetRequest.body).toHaveProperty('resetToken');

    const confirm = await request(app).post(`${API_V1}/auth/password-reset/confirm`).send({
      token: resetRequest.body.resetToken,
      password: 'Password456!@#',
    });

    expect(confirm.status).toBe(200);
    expect(confirm.body).toHaveProperty(
      'message',
      'Password reset succeeded. Please sign in again.',
    );

    const meWithRevokedSession = await request(app)
      .get(`${API_V1}/auth/me`)
      .set('Authorization', `Bearer ${register.body.token}`);

    expect(meWithRevokedSession.status).toBe(401);

    const refreshWithRevokedSession = await request(app).post(`${API_V1}/auth/refresh`).send({
      refreshToken: register.body.refreshToken,
    });

    expect(refreshWithRevokedSession.status).toBe(401);

    const loginWithOldPassword = await request(app)
      .post(`${API_V1}/auth/login`)
      .send({
        email: `recovery.${stamp}@postman.local`,
        password: 'Password123!',
      });

    expect(loginWithOldPassword.status).toBe(401);

    const loginWithNewPassword = await request(app)
      .post(`${API_V1}/auth/login`)
      .send({
        email: `recovery.${stamp}@postman.local`,
        password: 'Password456!@#',
      });

    expect(loginWithNewPassword.status).toBe(200);
  });

  it('POST /auth/password-reset/request should stay generic for unknown email', async () => {
    const resetRequest = await request(app)
      .post(`${API_V1}/auth/password-reset/request`)
      .send({ email: 'missing.user@postman.local' });

    expect(resetRequest.status).toBe(202);
    expect(resetRequest.body).toHaveProperty(
      'message',
      'If an account with that email exists, a password reset token has been created.',
    );
    expect(resetRequest.body).not.toHaveProperty('resetToken');
  });

  it('POST /auth/logout should revoke the current session', async () => {
    const login = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(login.status).toBe(200);

    const logout = await request(app)
      .post(`${API_V1}/auth/logout`)
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(logout.status).toBe(204);

    const me = await request(app)
      .get(`${API_V1}/auth/me`)
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(me.status).toBe(401);
    expect(me.body).toHaveProperty('message', 'Unauthorized: invalid or revoked session');
  });

  it('revokes existing sessions after an admin resets a user password', async () => {
    const stamp = Date.now();
    const register = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: `Revocation User ${stamp}`,
        email: `revocation.${stamp}@postman.local`,
        password: 'Password123!',
      });

    expect(register.status).toBe(201);

    const adminLogin = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(adminLogin.status).toBe(200);

    const update = await request(app)
      .patch(`${API_V1}/users/${register.body.user.id}`)
      .set('Authorization', `Bearer ${adminLogin.body.token}`)
      .send({ password: 'Password456!@#' });

    expect(update.status).toBe(200);

    const me = await request(app)
      .get(`${API_V1}/auth/me`)
      .set('Authorization', `Bearer ${register.body.token}`);

    expect(me.status).toBe(401);
    expect(me.body).toHaveProperty('message', 'Unauthorized: invalid or revoked session');

    const refresh = await request(app).post(`${API_V1}/auth/refresh`).send({
      refreshToken: register.body.refreshToken,
    });

    expect(refresh.status).toBe(401);
    expect(refresh.body).toHaveProperty('message', 'Invalid or expired refresh token');
  });
});
