import { getFeatureSelectionForTests } from '../featureSelection.js';

describe('feature selection', () => {
  it('derives runtime defaults from existing env toggles', () => {
    const selection = getFeatureSelectionForTests({
      NODE_ENV: 'test',
      SUPABASE_AUTH_ENABLED: 'true',
      SUPABASE_JWT_ENABLED: 'true',
      SUPABASE_TOTP_ENABLED: 'false',
      SUPABASE_STORAGE_ENABLED: 'true',
      ARCHIVE_RECORDS_ENABLED: 'true',
    });

    expect(selection.authProvider).toBe('supabase');
    expect(selection.tokenMode).toBe('supabase-jwt');
    expect(selection.mfaMode).toBe('local-totp');
    expect(selection.mediaStorage).toBe('supabase-storage');
    expect(selection.recordDeletion).toBe('archive');
  });

  it('rejects invalid feature combinations', () => {
    expect(() =>
      getFeatureSelectionForTests({
        NODE_ENV: 'test',
        FEATURE_AUTH_PROVIDER: 'local',
        FEATURE_TOKEN_MODE: 'supabase-jwt',
        FEATURE_MFA_MODE: 'disabled',
        FEATURE_MEDIA_STORAGE: 'disabled',
        FEATURE_RECORD_DELETION: 'archive',
      }),
    ).toThrow('tokenMode=supabase-jwt requires authProvider=supabase');
  });
});
