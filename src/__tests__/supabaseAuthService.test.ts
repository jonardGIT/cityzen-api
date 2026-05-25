import { createClient } from '@supabase/supabase-js';

import { resetFeatureSelectionCache } from '../featureSelection.js';
import {
  refreshSupabaseSession,
  SupabaseAuthServiceError,
  verifySupabaseAccessToken,
} from '../services/supabaseAuthService.js';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('supabaseAuthService auth error mapping', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...originalEnv,
      FEATURE_AUTH_PROVIDER: 'supabase',
      FEATURE_TOKEN_MODE: 'supabase-jwt',
      FEATURE_MFA_MODE: 'disabled',
      SUPABASE_AUTH_ENABLED: 'true',
      SUPABASE_JWT_ENABLED: 'true',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'supabase-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'supabase-service-role-key',
    };
    resetFeatureSelectionCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetFeatureSelectionCache();
  });

  it('normalizes invalid refresh token errors to 401', async () => {
    (createClient as jest.Mock).mockReturnValue({
      auth: {
        refreshSession: jest.fn().mockResolvedValue({
          data: { session: null },
          error: {
            message: 'Refresh token not found',
            status: 400,
          },
        }),
      },
    });

    await expect(refreshSupabaseSession('used-refresh-token')).rejects.toMatchObject<
      Partial<SupabaseAuthServiceError>
    >({
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Invalid or expired refresh token',
      status: 401,
    });
  });

  it('normalizes revoked access token errors to 401', async () => {
    (createClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: {
            message: 'Session from session_id claim in JWT does not exist',
            status: 403,
          },
        }),
      },
    });

    await expect(verifySupabaseAccessToken('revoked-access-token')).rejects.toMatchObject<
      Partial<SupabaseAuthServiceError>
    >({
      code: 'INVALID_ACCESS_TOKEN',
      message: 'Invalid or expired Supabase access token',
      status: 401,
    });
  });
});