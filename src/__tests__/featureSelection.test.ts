import { createOpenApiDocument } from '../docs/openapi';
import { getFeatureSelectionForTests, type FeatureSelection } from '../featureSelection.js';

function createSelection(overrides: Partial<FeatureSelection>): FeatureSelection {
  return {
    profileSource: 'runtime-env',
    profileName: 'test-profile',
    authProvider: 'local',
    tokenMode: 'app-jwt',
    mfaMode: 'local-totp',
    mediaStorage: 'supabase-storage',
    recordDeletion: 'archive',
    ...overrides,
  };
}

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

  it('publishes only local-only OpenAPI placeholder metadata in tracked source', () => {
    const document = createOpenApiDocument(
      createSelection({
        authProvider: 'supabase',
        tokenMode: 'supabase-jwt',
        mfaMode: 'disabled',
        mediaStorage: 'disabled',
        recordDeletion: 'hard-delete',
      }),
    );

    expect(document.paths).toEqual({});
    expect(document.info.version).toBe('local-only');
    expect(document.info.description).toContain('local-only artifact');
    expect(document['x-local-only-docs']).toBe(true);
    expect(document['x-feature-profile']).toEqual({
      profileSource: 'runtime-env',
      profileName: 'test-profile',
      authProvider: 'supabase',
      tokenMode: 'supabase-jwt',
      mfaMode: 'disabled',
      mediaStorage: 'disabled',
      recordDeletion: 'hard-delete',
    });
  });

  it('keeps feature metadata for local-only OpenAPI usage', () => {
    const document = createOpenApiDocument(createSelection({}));

    expect(document.paths).toEqual({});
    expect(document['x-local-only-docs']).toBe(true);
    expect(document['x-feature-profile']).toEqual({
      profileSource: 'runtime-env',
      profileName: 'test-profile',
      authProvider: 'local',
      tokenMode: 'app-jwt',
      mfaMode: 'local-totp',
      mediaStorage: 'supabase-storage',
      recordDeletion: 'archive',
    });
  });
});
