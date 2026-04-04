import { createOpenApiDocument } from '../docs/openapi.js';
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

  it('removes disabled conditional routes from the OpenAPI document', () => {
    const document = createOpenApiDocument(
      createSelection({
        authProvider: 'supabase',
        tokenMode: 'supabase-jwt',
        mfaMode: 'disabled',
        mediaStorage: 'disabled',
        recordDeletion: 'hard-delete',
      }),
    );

    expect(document.paths['/auth/mfa/setup']).toBeUndefined();
    expect(document.paths['/auth/sessions']).toBeUndefined();
    expect(document.paths['/auth/sessions/{id}']).toBeUndefined();
    expect(document.paths['/incidents/media/upload']).toBeUndefined();
    expect(document.paths['/users/{id}/restore']).toBeUndefined();
    expect(document.paths['/incidents/{id}/restore']).toBeUndefined();
    expect(document.paths['/users/{id}']?.delete?.summary).toBe('Delete user');
    expect(document.paths['/incidents/{id}']?.delete?.summary).toBe('Delete incident');

    const userListParameters = document.paths['/users']?.get?.parameters;
    expect(userListParameters).toBeDefined();
    expect(
      userListParameters?.some(
        (parameter) => !('$ref' in parameter) && parameter.name === 'includeArchived',
      ),
    ).toBe(false);
  });

  it('keeps conditional routes in the OpenAPI document when the profile enables them', () => {
    const document = createOpenApiDocument(createSelection({}));

    expect(document.paths['/auth/mfa/setup']).toBeDefined();
    expect(document.paths['/auth/sessions']).toBeDefined();
    expect(document.paths['/auth/sessions/{id}']).toBeDefined();
    expect(document.paths['/incidents/media/upload']).toBeDefined();
    expect(document.paths['/users/{id}/restore']).toBeDefined();
    expect(document.paths['/incidents/{id}/restore']).toBeDefined();
    expect(document.paths['/users/{id}']?.delete?.summary).toBe('Archive user');
  });
});
