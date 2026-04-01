import request from 'supertest';

import prisma from '../lib/prisma.js';

const mockAuthenticateSupabaseUser = jest.fn();
const mockDeleteSupabaseAuthUser = jest.fn();
const mockIsSupabaseAuthEnabled = jest.fn(() => true);
const mockIsSupabaseJwtEnabled = jest.fn(() => true);
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
    deleteSupabaseAuthUser: mockDeleteSupabaseAuthUser,
    isSupabaseAuthEnabled: mockIsSupabaseAuthEnabled,
    isSupabaseJwtEnabled: mockIsSupabaseJwtEnabled,
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

const ADMIN_EMAIL = 'admin@xypes.local';
const SUPABASE_USER_ID = '11111111-1111-4111-8111-111111111111';
const SUPABASE_SESSION_ID = '22222222-2222-4222-8222-222222222222';

describe('Supabase JWT mode', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    mockIsSupabaseAuthEnabled.mockReturnValue(true);
    mockIsSupabaseJwtEnabled.mockReturnValue(true);
    mockRevokeSupabaseAccessToken.mockResolvedValue(undefined);

    await prisma.user.updateMany({
      where: { email: ADMIN_EMAIL },
      data: {
        supabaseAuthUserId: null,
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

  it('accepts a Supabase bearer token on protected routes and links the local user', async () => {
    mockVerifySupabaseAccessToken.mockResolvedValue({
      id: SUPABASE_USER_ID,
      email: ADMIN_EMAIL,
      sessionId: SUPABASE_SESSION_ID,
      accessTokenIssuedAt: Math.floor(Date.now() / 1000),
    });

    const response = await request(app)
      .get(`${API_V1}/users/capabilities`)
      .set('Authorization', 'Bearer supabase-access-token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      role: 'SYSTEM_ADMIN',
      label: 'System Admin',
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
    });

    const response = await request(app)
      .post(`${API_V1}/auth/logout`)
      .set('Authorization', 'Bearer supabase-access-token');

    expect(response.status).toBe(204);
    expect(mockRevokeSupabaseAccessToken).toHaveBeenCalledWith('supabase-access-token', 'local');
  });
});
