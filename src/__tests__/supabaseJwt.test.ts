import request from 'supertest';

import prisma from '../lib/prisma.js';

const mockAuthenticateSupabaseUser = jest.fn();
const mockChallengeAndVerifySupabaseTotpFactor = jest.fn();
const mockDeleteSupabaseAuthUser = jest.fn();
const mockDeleteSupabaseAdminMfaFactor = jest.fn();
const mockEnrollSupabaseTotpFactor = jest.fn();
const mockGetSupabaseMfaAssuranceLevel = jest.fn();
const mockIsSupabaseAuthEnabled = jest.fn(() => true);
const mockIsSupabaseJwtEnabled = jest.fn(() => true);
const mockIsSupabaseTotpEnabled = jest.fn(() => false);
const mockListSupabaseAdminMfaFactors = jest.fn();
const mockListSupabaseMfaFactors = jest.fn();
const mockRefreshSupabaseSession = jest.fn();
const mockRegisterSupabaseAuthUser = jest.fn();
const mockRevokeSupabaseAccessToken = jest.fn();
const mockSignInSupabaseUser = jest.fn();
const mockUpdateSupabaseAuthUser = jest.fn();
const mockVerifySupabaseAccessToken = jest.fn();

jest.mock('../services/supabaseAuthService.js', () => {
  class MockSupabaseAuthServiceError extends Error {
    code: string;
    status?: number;

    constructor(code: string, message: string, status?: number) {
      super(message);
      this.name = 'SupabaseAuthServiceError';
      this.code = code;
      this.status = status;
    }
  }

  return {
    authenticateSupabaseUser: mockAuthenticateSupabaseUser,
    challengeAndVerifySupabaseTotpFactor: mockChallengeAndVerifySupabaseTotpFactor,
    deleteSupabaseAuthUser: mockDeleteSupabaseAuthUser,
    deleteSupabaseAdminMfaFactor: mockDeleteSupabaseAdminMfaFactor,
    enrollSupabaseTotpFactor: mockEnrollSupabaseTotpFactor,
    getSupabaseMfaAssuranceLevel: mockGetSupabaseMfaAssuranceLevel,
    isSupabaseAuthEnabled: mockIsSupabaseAuthEnabled,
    isSupabaseJwtEnabled: mockIsSupabaseJwtEnabled,
    isSupabaseTotpEnabled: mockIsSupabaseTotpEnabled,
    listSupabaseAdminMfaFactors: mockListSupabaseAdminMfaFactors,
    listSupabaseMfaFactors: mockListSupabaseMfaFactors,
    refreshSupabaseSession: mockRefreshSupabaseSession,
    registerSupabaseAuthUser: mockRegisterSupabaseAuthUser,
    revokeSupabaseAccessToken: mockRevokeSupabaseAccessToken,
    signInSupabaseUser: mockSignInSupabaseUser,
    SupabaseAuthServiceError: MockSupabaseAuthServiceError,
    updateSupabaseAuthUser: mockUpdateSupabaseAuthUser,
    verifySupabaseAccessToken: mockVerifySupabaseAccessToken,
  };
});

import app, { API_V1 } from '../app.js';
import { SupabaseAuthServiceError } from '../services/supabaseAuthService.js';

const ADMIN_EMAIL = 'admin@xypes.local';
const SUPABASE_USER_ID = '11111111-1111-4111-8111-111111111111';
const SUPABASE_SESSION_ID = '22222222-2222-4222-8222-222222222222';
const PENDING_CONFIRMATION_SUPABASE_USER_ID = '33333333-3333-4333-8333-333333333333';

describe('Supabase JWT mode', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    mockIsSupabaseAuthEnabled.mockReturnValue(true);
    mockIsSupabaseJwtEnabled.mockReturnValue(true);
    mockIsSupabaseTotpEnabled.mockReturnValue(false);
    mockRevokeSupabaseAccessToken.mockResolvedValue(undefined);
    mockGetSupabaseMfaAssuranceLevel.mockResolvedValue({
      currentLevel: 'aal1',
      nextLevel: 'aal1',
      currentAuthenticationMethods: ['password'],
    });

    await prisma.user.deleteMany({
      where: {
        NOT: { email: ADMIN_EMAIL },
        OR: [
          { supabaseAuthUserId: SUPABASE_USER_ID },
          { supabaseAuthUserId: PENDING_CONFIRMATION_SUPABASE_USER_ID },
          { email: { startsWith: 'pending-confirmation-' } },
        ],
      },
    });

    await prisma.user.updateMany({
      where: { email: ADMIN_EMAIL },
      data: {
        supabaseAuthUserId: null,
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaEnabledAt: null,
      },
    });
  });

  it('returns Supabase access and refresh tokens on login', async () => {
    mockSignInSupabaseUser.mockResolvedValue({
      token: 'supabase-access-token',
      refreshToken: 'supabase-refresh-token',
      tokenType: 'Bearer',
      sessionId: SUPABASE_SESSION_ID,
      expiresAt: '2026-04-02T00:00:00.000Z',
      refreshExpiresAt: null,
      userId: SUPABASE_USER_ID,
      email: ADMIN_EMAIL,
    });

    const response = await request(app).post(`${API_V1}/auth/login`).send({
      email: ADMIN_EMAIL,
      password: 'Password123!',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      token: 'supabase-access-token',
      refreshToken: 'supabase-refresh-token',
      tokenType: 'Bearer',
      sessionId: SUPABASE_SESSION_ID,
    });
    expect(response.body.user).toHaveProperty('email', ADMIN_EMAIL);
    expect(mockSignInSupabaseUser).toHaveBeenCalledWith({
      email: ADMIN_EMAIL,
      password: 'Password123!',
    });
  });

  it('returns 201 with email confirmation required and no session tokens when Supabase registration cannot sign in immediately', async () => {
    const registrationEmail = `pending-confirmation-${Date.now()}@xypes.local`;

    mockRegisterSupabaseAuthUser.mockResolvedValue({
      id: PENDING_CONFIRMATION_SUPABASE_USER_ID,
      email: registrationEmail,
    });
    mockSignInSupabaseUser.mockRejectedValue(
      new SupabaseAuthServiceError(
        'EMAIL_NOT_CONFIRMED',
        'Confirm your email before signing in.',
        401,
      ),
    );

    const response = await request(app).post(`${API_V1}/auth/register`).send({
      name: 'Pending Citizen Reporter',
      email: registrationEmail,
      password: 'Password123!',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      message: 'Registration succeeded. Confirm your email before signing in.',
      emailConfirmationRequired: true,
      user: {
        email: registrationEmail,
        role: 'CITIZEN_REPORTER',
      },
    });
    expect(response.body).not.toHaveProperty('token');
    expect(response.body).not.toHaveProperty('accessToken');
    expect(response.body).not.toHaveProperty('refreshToken');
    expect(mockRegisterSupabaseAuthUser).toHaveBeenCalledWith({
      email: registrationEmail,
      password: 'Password123!',
      name: 'Pending Citizen Reporter',
      role: 'CITIZEN_REPORTER',
    });
    expect(mockSignInSupabaseUser).toHaveBeenCalledWith({
      email: registrationEmail,
      password: 'Password123!',
    });
  });

  it('rejects mobile registration when Supabase JWT mode is enabled', async () => {
    const mobileNumber = '09171239999';

    const response = await request(app).post(`${API_V1}/auth/mobile/register`).send({
      name: 'Mobile Citizen Reporter',
      mobileNumber,
      password: 'Password123!',
    });

    expect(response.status).toBe(501);
    expect(response.body).toMatchObject({
      message: 'Mobile auth is only available when local app auth and app JWT sessions are enabled',
    });

    const createdUser = await prisma.user.findUnique({
      where: { mobileNumber: '+639171239999' },
      select: { id: true },
    });

    expect(createdUser).toBeNull();
  });

  it('rejects mobile login when Supabase JWT mode is enabled', async () => {
    const passwordHash = await import('bcryptjs').then(({ default: bcrypt }) =>
      bcrypt.hash('Password123!', 10),
    );

    await prisma.user.create({
      data: {
        name: 'Mobile Login Citizen',
        email: 'mobile.login@xypes.local',
        mobileNumber: '+639179998888',
        mobileNumberVerifiedAt: new Date(),
        passwordHash,
        role: 'CITIZEN_REPORTER',
      },
    });

    const response = await request(app).post(`${API_V1}/auth/mobile/login`).send({
      mobileNumber: '09179998888',
      password: 'Password123!',
    });

    expect(response.status).toBe(501);
    expect(response.body).toMatchObject({
      message: 'Mobile auth is only available when local app auth and app JWT sessions are enabled',
    });
  });

  it('accepts a Supabase bearer token on protected routes and links the local user', async () => {
    mockVerifySupabaseAccessToken.mockResolvedValue({
      id: SUPABASE_USER_ID,
      email: ADMIN_EMAIL,
      sessionId: SUPABASE_SESSION_ID,
      accessTokenIssuedAt: Math.floor(Date.now() / 1000),
      currentAuthenticatorLevel: 'aal1',
      nextAuthenticatorLevel: 'aal1',
      currentAuthenticationMethods: ['password'],
    });

    const response = await request(app)
      .get(`${API_V1}/users/capabilities`)
      .set('Authorization', 'Bearer supabase-access-token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      role: 'NATIONAL_ADMIN',
      label: 'National Admin',
      canUpdateUser: true,
      canDeleteUser: true,
    });

    const adminUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: { supabaseAuthUserId: true },
    });

    expect(adminUser?.supabaseAuthUserId).toBe(SUPABASE_USER_ID);
  });

  it('refreshes via Supabase when JWT mode is enabled', async () => {
    mockRefreshSupabaseSession.mockResolvedValue({
      token: 'refreshed-access-token',
      refreshToken: 'refreshed-refresh-token',
      tokenType: 'Bearer',
      sessionId: SUPABASE_SESSION_ID,
      expiresAt: '2026-04-02T01:00:00.000Z',
      refreshExpiresAt: null,
      userId: SUPABASE_USER_ID,
      email: ADMIN_EMAIL,
    });

    const response = await request(app).post(`${API_V1}/auth/refresh`).send({
      refreshToken: 'supabase-refresh-token',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      token: 'refreshed-access-token',
      refreshToken: 'refreshed-refresh-token',
      sessionId: SUPABASE_SESSION_ID,
    });
    expect(response.body.user).toHaveProperty('email', ADMIN_EMAIL);
    expect(mockRefreshSupabaseSession).toHaveBeenCalledWith('supabase-refresh-token');
  });

  it('returns 501 for session listing in Supabase JWT mode', async () => {
    mockVerifySupabaseAccessToken.mockResolvedValue({
      id: SUPABASE_USER_ID,
      email: ADMIN_EMAIL,
      sessionId: SUPABASE_SESSION_ID,
      accessTokenIssuedAt: Math.floor(Date.now() / 1000),
      currentAuthenticatorLevel: 'aal1',
      nextAuthenticatorLevel: 'aal1',
      currentAuthenticationMethods: ['password'],
    });

    const response = await request(app)
      .get(`${API_V1}/auth/sessions`)
      .set('Authorization', 'Bearer supabase-access-token');

    expect(response.status).toBe(501);
    expect(response.body.message).toContain('Session listing is not available');
  });

  it('logs out via Supabase token revocation in JWT mode', async () => {
    mockVerifySupabaseAccessToken.mockResolvedValue({
      id: SUPABASE_USER_ID,
      email: ADMIN_EMAIL,
      sessionId: SUPABASE_SESSION_ID,
      accessTokenIssuedAt: Math.floor(Date.now() / 1000),
      currentAuthenticatorLevel: 'aal1',
      nextAuthenticatorLevel: 'aal1',
      currentAuthenticationMethods: ['password'],
    });

    const response = await request(app)
      .post(`${API_V1}/auth/logout`)
      .set('Authorization', 'Bearer supabase-access-token');

    expect(response.status).toBe(204);
    expect(mockRevokeSupabaseAccessToken).toHaveBeenCalledWith('supabase-access-token', 'local');
  });

  it('requires an MFA code for privileged Supabase JWT login when Supabase TOTP is enabled', async () => {
    mockIsSupabaseTotpEnabled.mockReturnValue(true);
    mockSignInSupabaseUser.mockResolvedValue({
      token: 'supabase-access-token',
      refreshToken: 'supabase-refresh-token',
      tokenType: 'Bearer',
      sessionId: SUPABASE_SESSION_ID,
      expiresAt: '2026-04-02T00:00:00.000Z',
      refreshExpiresAt: null,
      userId: SUPABASE_USER_ID,
      email: ADMIN_EMAIL,
    });
    mockGetSupabaseMfaAssuranceLevel.mockResolvedValue({
      currentLevel: 'aal1',
      nextLevel: 'aal2',
      currentAuthenticationMethods: ['password'],
    });

    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: {
        mfaEnabled: true,
      },
    });

    const response = await request(app).post(`${API_V1}/auth/login`).send({
      email: ADMIN_EMAIL,
      password: 'Password123!',
    });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      message: 'MFA code required',
      mfaRequired: true,
    });
    expect(mockRevokeSupabaseAccessToken).toHaveBeenCalledWith('supabase-access-token', 'local');
  });

  it('completes the Supabase TOTP challenge during login when a valid code is supplied', async () => {
    mockIsSupabaseTotpEnabled.mockReturnValue(true);
    mockSignInSupabaseUser.mockResolvedValue({
      token: 'supabase-access-token',
      refreshToken: 'supabase-refresh-token',
      tokenType: 'Bearer',
      sessionId: SUPABASE_SESSION_ID,
      expiresAt: '2026-04-02T00:00:00.000Z',
      refreshExpiresAt: null,
      userId: SUPABASE_USER_ID,
      email: ADMIN_EMAIL,
    });
    mockGetSupabaseMfaAssuranceLevel.mockResolvedValue({
      currentLevel: 'aal1',
      nextLevel: 'aal2',
      currentAuthenticationMethods: ['password'],
    });
    mockListSupabaseMfaFactors.mockResolvedValue({
      all: [
        {
          id: 'totp-factor-1',
          factorType: 'totp',
          friendlyName: 'Admin Authenticator',
          status: 'verified',
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-01T00:00:00.000Z',
        },
      ],
      totp: [
        {
          id: 'totp-factor-1',
          factorType: 'totp',
          friendlyName: 'Admin Authenticator',
          status: 'verified',
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-01T00:00:00.000Z',
        },
      ],
    });
    mockChallengeAndVerifySupabaseTotpFactor.mockResolvedValue({
      token: 'supabase-aal2-access-token',
      refreshToken: 'supabase-aal2-refresh-token',
      tokenType: 'Bearer',
      sessionId: SUPABASE_SESSION_ID,
      expiresAt: '2026-04-02T00:10:00.000Z',
      refreshExpiresAt: null,
      userId: SUPABASE_USER_ID,
      email: ADMIN_EMAIL,
    });

    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: {
        mfaEnabled: true,
      },
    });

    const response = await request(app).post(`${API_V1}/auth/login`).send({
      email: ADMIN_EMAIL,
      password: 'Password123!',
      mfaCode: '123456',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      token: 'supabase-aal2-access-token',
      refreshToken: 'supabase-aal2-refresh-token',
      sessionId: SUPABASE_SESSION_ID,
    });
    expect(mockChallengeAndVerifySupabaseTotpFactor).toHaveBeenCalledWith({
      accessToken: 'supabase-access-token',
      refreshToken: 'supabase-refresh-token',
      factorId: 'totp-factor-1',
      code: '123456',
    });
  });

  it('creates Supabase TOTP setup details for authenticated privileged users', async () => {
    mockIsSupabaseTotpEnabled.mockReturnValue(true);
    mockVerifySupabaseAccessToken.mockResolvedValue({
      id: SUPABASE_USER_ID,
      email: ADMIN_EMAIL,
      sessionId: SUPABASE_SESSION_ID,
      accessTokenIssuedAt: Math.floor(Date.now() / 1000),
      currentAuthenticatorLevel: 'aal1',
      nextAuthenticatorLevel: 'aal1',
      currentAuthenticationMethods: ['password'],
    });
    mockListSupabaseAdminMfaFactors.mockResolvedValue([]);
    mockEnrollSupabaseTotpFactor.mockResolvedValue({
      id: 'totp-factor-setup',
      friendlyName: `${ADMIN_EMAIL} TOTP`,
      qrCode: 'data:image/svg+xml;utf-8,<svg></svg>',
      secret: 'SECRET123',
      uri: 'otpauth://totp/Supabase:admin@xypes.local?secret=SECRET123',
      issuer: 'Supabase',
      status: 'unverified',
    });

    const response = await request(app)
      .post(`${API_V1}/auth/mfa/setup`)
      .set('Authorization', 'Bearer supabase-access-token')
      .send({ refreshToken: 'supabase-refresh-token' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      factorId: 'totp-factor-setup',
      secret: 'SECRET123',
      qrCode: 'data:image/svg+xml;utf-8,<svg></svg>',
    });
    expect(mockEnrollSupabaseTotpFactor).toHaveBeenCalledWith({
      accessToken: 'supabase-access-token',
      refreshToken: 'supabase-refresh-token',
      friendlyName: `${ADMIN_EMAIL} TOTP`,
    });
  });

  it('returns 422 for Supabase TOTP setup when refresh token is missing from the request body', async () => {
    mockIsSupabaseTotpEnabled.mockReturnValue(true);
    mockVerifySupabaseAccessToken.mockResolvedValue({
      id: SUPABASE_USER_ID,
      email: ADMIN_EMAIL,
      sessionId: SUPABASE_SESSION_ID,
      accessTokenIssuedAt: Math.floor(Date.now() / 1000),
      currentAuthenticatorLevel: 'aal1',
      nextAuthenticatorLevel: 'aal1',
      currentAuthenticationMethods: ['password'],
    });

    const response = await request(app)
      .post(`${API_V1}/auth/mfa/setup`)
      .set('Authorization', 'Bearer supabase-access-token');

    expect(response.status).toBe(422);
    expect(response.body).toHaveProperty(
      'message',
      'refreshToken is required when Supabase TOTP mode is enabled',
    );
  });

  it('enables Supabase TOTP and returns the promoted session bundle', async () => {
    mockIsSupabaseTotpEnabled.mockReturnValue(true);
    mockVerifySupabaseAccessToken.mockResolvedValue({
      id: SUPABASE_USER_ID,
      email: ADMIN_EMAIL,
      sessionId: SUPABASE_SESSION_ID,
      accessTokenIssuedAt: Math.floor(Date.now() / 1000),
      currentAuthenticatorLevel: 'aal1',
      nextAuthenticatorLevel: 'aal1',
      currentAuthenticationMethods: ['password'],
    });
    mockListSupabaseMfaFactors.mockResolvedValue({
      all: [
        {
          id: 'totp-factor-setup',
          factorType: 'totp',
          friendlyName: 'Admin Authenticator',
          status: 'unverified',
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-01T00:00:00.000Z',
        },
      ],
      totp: [],
    });
    mockChallengeAndVerifySupabaseTotpFactor.mockResolvedValue({
      token: 'supabase-aal2-access-token',
      refreshToken: 'supabase-aal2-refresh-token',
      tokenType: 'Bearer',
      sessionId: SUPABASE_SESSION_ID,
      expiresAt: '2026-04-02T00:10:00.000Z',
      refreshExpiresAt: null,
      userId: SUPABASE_USER_ID,
      email: ADMIN_EMAIL,
    });

    const response = await request(app)
      .post(`${API_V1}/auth/mfa/enable`)
      .set('Authorization', 'Bearer supabase-access-token')
      .send({ code: '123456', refreshToken: 'supabase-refresh-token' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      message: 'MFA enabled.',
      token: 'supabase-aal2-access-token',
      refreshToken: 'supabase-aal2-refresh-token',
    });

    const adminUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: { mfaEnabled: true },
    });

    expect(adminUser?.mfaEnabled).toBe(true);
  });

  it('rejects protected routes until the Supabase TOTP challenge has been satisfied', async () => {
    mockIsSupabaseTotpEnabled.mockReturnValue(true);
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: {
        mfaEnabled: true,
        supabaseAuthUserId: SUPABASE_USER_ID,
      },
    });
    mockVerifySupabaseAccessToken.mockResolvedValue({
      id: SUPABASE_USER_ID,
      email: ADMIN_EMAIL,
      sessionId: SUPABASE_SESSION_ID,
      accessTokenIssuedAt: Math.floor(Date.now() / 1000),
      currentAuthenticatorLevel: 'aal1',
      nextAuthenticatorLevel: 'aal2',
      currentAuthenticationMethods: ['password'],
    });

    const response = await request(app)
      .get(`${API_V1}/users/capabilities`)
      .set('Authorization', 'Bearer supabase-access-token');

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('satisfy MFA requirements');
  });
});
