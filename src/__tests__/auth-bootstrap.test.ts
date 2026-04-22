import request from 'supertest';
import bcrypt from 'bcryptjs';
import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';
import { generateMfaCodeFromSecret } from '../utils/mfa.js';

jest.setTimeout(120000);

describe('Auth bootstrap endpoints', () => {
  function buildUniqueMobileNumber(seed: number): string {
    const suffix = seed.toString().slice(-9).padStart(9, '0');
    return `09${suffix}`;
  }

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

    await prisma.passwordResetToken.updateMany({
      where: {
        user: {
          email: {
            in: ['admin@xypes.local', 'auditor@xypes.local'],
          },
        },
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
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
    expect(res.body).toHaveProperty('accessToken', res.body.token);
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
    expect(res.body).toHaveProperty('accessToken', res.body.token);
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body).toHaveProperty('sessionId');
    expect(res.body).toHaveProperty('expiresAt');
    expect(res.body).toHaveProperty('refreshExpiresAt');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('createdAt');
    expect(res.body.user).toHaveProperty('updatedAt');
  });

  it('POST /auth/mobile/register should create a linked citizen reporter account and return token', async () => {
    const stamp = Date.now();
    const mobileNumber = buildUniqueMobileNumber(stamp);
    const normalizedMobileNumber = `+63${mobileNumber.slice(1)}`;
    const expectedEmail = `citizen.mobile.${normalizedMobileNumber.slice(1)}@cirs.mobile.invalid`;

    const res = await request(app)
      .post(`${API_V1}/auth/mobile/register`)
      .send({
        name: `Mobile User ${stamp}`,
        mobileNumber,
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('accessToken', res.body.token);
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body).toHaveProperty('sessionId');
    expect(res.body).toHaveProperty('user.role', 'CITIZEN_REPORTER');
    expect(res.body).toHaveProperty('user.mobileNumber', normalizedMobileNumber);
    expect(res.body.user).toHaveProperty('citizenId');

    const createdUser = await prisma.user.findUnique({
      where: { mobileNumber: normalizedMobileNumber },
      select: {
        email: true,
        mobileNumber: true,
        mobileNumberVerifiedAt: true,
        role: true,
        citizenId: true,
        passwordHash: true,
      },
    });

    expect(createdUser).not.toBeNull();
    expect(createdUser?.email).toBe(expectedEmail);
    expect(createdUser?.role).toBe('CITIZEN_REPORTER');
    expect(createdUser?.mobileNumberVerifiedAt).not.toBeNull();
    expect(createdUser?.passwordHash).not.toBeNull();

    const citizen = await prisma.citizen.findUnique({
      where: { id: createdUser!.citizenId! },
      select: {
        name: true,
        contactInfo: true,
        preferredChannel: true,
      },
    });

    expect(citizen).toMatchObject({
      name: `Mobile User ${stamp}`,
      contactInfo: normalizedMobileNumber,
      preferredChannel: 'mobile',
    });
  });

  it('POST /auth/mobile/register should return 409 for duplicate mobile number', async () => {
    const mobileNumber = buildUniqueMobileNumber(Date.now() + 1);
    const payload = {
      name: 'Duplicate Mobile User',
      mobileNumber,
      password: 'Password123!',
    };

    const first = await request(app).post(`${API_V1}/auth/mobile/register`).send(payload);
    const second = await request(app)
      .post(`${API_V1}/auth/mobile/register`)
      .send({ ...payload, name: 'Second Attempt' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body).toHaveProperty('message', 'Mobile number already registered');
  });

  it('POST /auth/mobile/login should authenticate by normalized mobile number and password', async () => {
    const mobileNumber = buildUniqueMobileNumber(Date.now() + 2);
    const normalizedMobileNumber = `+63${mobileNumber.slice(1)}`;

    await request(app).post(`${API_V1}/auth/mobile/register`).send({
      name: 'Citizen Mobile Login',
      mobileNumber,
      password: 'Password123!',
    });

    const res = await request(app).post(`${API_V1}/auth/mobile/login`).send({
      mobileNumber: normalizedMobileNumber,
      password: 'Password123!',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user.mobileNumber', normalizedMobileNumber);
    expect(res.body).toHaveProperty('user.role', 'CITIZEN_REPORTER');
  });

  it('POST /auth/mobile/login should reject non-citizen accounts even if a mobile number is present', async () => {
    await prisma.user.update({
      where: { email: 'admin@xypes.local' },
      data: {
        mobileNumber: '+639199887766',
        mobileNumberVerifiedAt: new Date(),
      },
    });

    const res = await request(app).post(`${API_V1}/auth/mobile/login`).send({
      mobileNumber: '09199887766',
      password: 'Password123!',
    });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty(
      'message',
      'Mobile auth is only available for citizen accounts',
    );
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

  it('POST /auth/password-reset/request should block public password recovery for auditor accounts in production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalWebhookUrl = process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL;
    process.env.NODE_ENV = 'production';
    process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL = 'https://example.test/password-reset';

    try {
      const res = await request(app)
        .post(`${API_V1}/auth/password-reset/request`)
        .send({ email: 'auditor@xypes.local' });

      expect(res.status).toBe(202);
      expect(res.body).toMatchObject({
        message: 'If an account with that email exists, a password reset token has been created.',
      });
      expect(res.body).not.toHaveProperty('resetToken');
      expect(res.body).not.toHaveProperty('resetExpiresAt');

      const auditor = await prisma.user.findUnique({
        where: { email: 'auditor@xypes.local' },
        select: { id: true },
      });

      expect(auditor).not.toBeNull();

      const activeTokens = await prisma.passwordResetToken.count({
        where: {
          userId: auditor!.id,
          usedAt: null,
        },
      });

      expect(activeTokens).toBe(0);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL = originalWebhookUrl;
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

  it('POST /auth/login should return 422 for non-string email payloads', async () => {
    const res = await request(app)
      .post(`${API_V1}/auth/login`)
      .send({
        email: { value: 'admin@xypes.local' },
        password: 'Password123!',
      });

    expect(res.status).toBe(422);
  });

  it('POST /auth/register should return 422 for missing fields', async () => {
    const res = await request(app).post(`${API_V1}/auth/register`).send({ name: 'Incomplete' });
    expect(res.status).toBe(422);
  });

  it('POST /auth/register should return 422 for non-string email payloads', async () => {
    const res = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: 'Malformed Email',
        email: ['broken@example.test'],
        password: 'Password123!',
      });

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

  it('POST /auth/register should return 429 after repeated attempts for the same email', async () => {
    const originalEnv = { ...process.env };

    try {
      jest.resetModules();
      process.env = {
        ...originalEnv,
        RATE_LIMIT_ENABLED: 'true',
        RATE_LIMIT_STORE: 'memory',
        AUTH_REGISTER_RATE_LIMIT_WINDOW_MS: '60000',
        AUTH_REGISTER_RATE_LIMIT_MAX_REQUESTS: '2',
      };

      const { default: throttledApp, API_V1: throttledApiBase } = await import('../app.js');
      const email = `rate-limit-${Date.now()}@xypes.local`;
      const statuses: number[] = [];

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const response = await request(throttledApp)
          .post(`${throttledApiBase}/auth/register`)
          .send({
            name: `Rate Limited ${attempt}`,
            email,
            password: 'Password123!',
          });

        statuses.push(response.status);
      }

      expect(statuses).toEqual([201, 409, 429]);
    } finally {
      process.env = originalEnv;
    }
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
    const firstLogin = await request(app)
      .post(`${API_V1}/auth/login`)
      .set('User-Agent', 'curl/8.7.1')
      .send({
        email: 'admin@xypes.local',
        password: 'Password123!',
      });
    const secondLogin = await request(app)
      .post(`${API_V1}/auth/login`)
      .set(
        'User-Agent',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
      )
      .send({
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
      sessions.body.some(
        (session: {
          id: string;
          status: string;
          browserFamily: string | null;
          deviceLabel: string | null;
        }) =>
          session.id === firstLogin.body.sessionId &&
          session.status === 'active' &&
          session.browserFamily === 'curl' &&
          session.deviceLabel === 'curl',
      ),
    ).toBe(true);
    expect(
      sessions.body.some((session: { id: string }) => session.id === firstLogin.body.sessionId),
    ).toBe(true);
    expect(
      sessions.body.some(
        (session: {
          id: string;
          isCurrent: boolean;
          browserFamily: string | null;
          osFamily: string | null;
          deviceLabel: string | null;
          status: string;
        }) =>
          session.id === secondLogin.body.sessionId &&
          session.isCurrent &&
          session.browserFamily === 'Chrome' &&
          session.osFamily === 'Linux' &&
          session.deviceLabel === 'Chrome on Linux' &&
          session.status === 'active',
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

  it('POST /auth/password-reset/request should hide reset tokens in production mode', async () => {
    const stamp = Date.now();
    const email = `prod.recovery.${stamp}@postman.local`;
    const register = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: `Prod Recovery User ${stamp}`,
        email,
        password: 'Password123!',
      });

    expect(register.status).toBe(201);

    const originalNodeEnv = process.env.NODE_ENV;
    const originalWebhookUrl = process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL;
    const originalFetch = global.fetch;
    process.env.NODE_ENV = 'production';
    process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL = 'https://example.test/password-reset';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 202 }) as typeof fetch;

    const resetRequest = await request(app)
      .post(`${API_V1}/auth/password-reset/request`)
      .send({ email });

    process.env.NODE_ENV = originalNodeEnv;
    process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL = originalWebhookUrl;
    global.fetch = originalFetch;

    expect(resetRequest.status).toBe(202);
    expect(resetRequest.body).toHaveProperty(
      'message',
      'If an account with that email exists, a password reset token has been created.',
    );
    expect(resetRequest.body).not.toHaveProperty('resetToken');
    expect(resetRequest.body).not.toHaveProperty('resetExpiresAt');
  });

  it('POST /auth/password-reset/request should fail closed in production when delivery is unconfigured', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalWebhookUrl = process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL;
    process.env.NODE_ENV = 'production';
    delete process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL;

    const resetRequest = await request(app)
      .post(`${API_V1}/auth/password-reset/request`)
      .send({ email: 'missing.user@postman.local' });

    process.env.NODE_ENV = originalNodeEnv;
    process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL = originalWebhookUrl;

    expect(resetRequest.status).toBe(503);
    expect(resetRequest.body).toHaveProperty(
      'message',
      'Password reset delivery is not available: PASSWORD_RESET_DELIVERY_WEBHOOK_URL must be configured in production',
    );
  });

  it('blocks public privileged-account password reset in production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalWebhookUrl = process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL;
    process.env.NODE_ENV = 'production';
    process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL = 'https://example.test/password-reset';

    const resetRequest = await request(app)
      .post(`${API_V1}/auth/password-reset/request`)
      .send({ email: 'admin@xypes.local' });

    expect(resetRequest.status).toBe(202);
    expect(resetRequest.body).not.toHaveProperty('resetToken');

    const { default: prisma } = await import('../lib/prisma.js');
    const tokens = await prisma.passwordResetToken.findMany({
      where: {
        user: { email: 'admin@xypes.local' },
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    process.env.NODE_ENV = originalNodeEnv;
    process.env.PASSWORD_RESET_DELIVERY_WEBHOOK_URL = originalWebhookUrl;

    expect(tokens).toHaveLength(0);
  });

  it('rejects reused password reset tokens', async () => {
    const stamp = Date.now();
    const email = `reuse.recovery.${stamp}@postman.local`;
    const register = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: `Reuse Recovery User ${stamp}`,
        email,
        password: 'Password123!',
      });

    expect(register.status).toBe(201);

    const resetRequest = await request(app)
      .post(`${API_V1}/auth/password-reset/request`)
      .send({ email });

    expect(resetRequest.status).toBe(202);
    expect(resetRequest.body).toHaveProperty('resetToken');

    const firstConfirm = await request(app).post(`${API_V1}/auth/password-reset/confirm`).send({
      token: resetRequest.body.resetToken,
      password: 'Password456!@#',
    });
    const secondConfirm = await request(app).post(`${API_V1}/auth/password-reset/confirm`).send({
      token: resetRequest.body.resetToken,
      password: 'Password789!@#',
    });

    expect(firstConfirm.status).toBe(200);
    expect(secondConfirm.status).toBe(401);
    expect(secondConfirm.body).toHaveProperty('message', 'Invalid or expired password reset token');
  });

  it('rejects expired password reset tokens', async () => {
    const stamp = Date.now();
    const email = `expired.recovery.${stamp}@postman.local`;
    const register = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: `Expired Recovery User ${stamp}`,
        email,
        password: 'Password123!',
      });

    expect(register.status).toBe(201);

    const { default: prisma } = await import('../lib/prisma.js');
    const resetRequest = await request(app)
      .post(`${API_V1}/auth/password-reset/request`)
      .send({ email });

    expect(resetRequest.status).toBe(202);
    expect(resetRequest.body).toHaveProperty('resetToken');

    await prisma.passwordResetToken.updateMany({
      where: { user: { email } },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const confirm = await request(app).post(`${API_V1}/auth/password-reset/confirm`).send({
      token: resetRequest.body.resetToken,
      password: 'Password456!@#',
    });

    expect(confirm.status).toBe(401);
    expect(confirm.body).toHaveProperty('message', 'Invalid or expired password reset token');
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
