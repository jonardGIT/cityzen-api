import type { FeatureSelection } from '../featureSelection.js';
import { validateStartupEnvironment } from '../utils/startupEnv.js';

function createSelection(overrides: Partial<FeatureSelection> = {}): FeatureSelection {
  return {
    profileSource: 'runtime-env',
    profileName: 'test-profile',
    authProvider: 'local',
    tokenMode: 'app-jwt',
    mfaMode: 'disabled',
    mediaStorage: 'disabled',
    recordDeletion: 'archive',
    ...overrides,
  };
}

describe('startup environment validation', () => {
  it('allows strong production secrets', () => {
    expect(() =>
      validateStartupEnvironment({
        env: {
          NODE_ENV: 'production',
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          API_KEYS: 'prod-api-key-0123456789',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_SERVICE_ROLE_KEY: 'prod-service-role-key-0123456789-abcdef-uvwxyz',
          SUPABASE_STORAGE_ACCESS_MODE: 'signed',
          SUPABASE_STORAGE_SCAN_WEBHOOK_URL: 'https://security.example.gov/media-scan',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
          SECURITY_ALERT_WEBHOOK_URL: 'https://security.example.gov/alerts',
        },
        selection: createSelection({
          mfaMode: 'local-totp',
          mediaStorage: 'supabase-storage',
        }),
      }),
    ).not.toThrow();
  });

  it('rejects production builds that disable MFA entirely', () => {
    expect(() =>
      validateStartupEnvironment({
        env: {
          NODE_ENV: 'production',
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
        },
        selection: createSelection({ mfaMode: 'disabled' }),
      }),
    ).toThrow('FEATURE_MFA_MODE must not be disabled in production');
  });

  it('rejects weak JWT secrets in production', () => {
    expect(() =>
      validateStartupEnvironment({
        env: {
          NODE_ENV: 'production',
          JWT_SECRET: 'test-jwt-secret',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
        },
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).toThrow('JWT_SECRET must be at least 32 characters in production');
  });

  it('does not require JWT_SECRET in production when Supabase JWT mode is selected', () => {
    expect(() =>
      validateStartupEnvironment({
        env: {
          NODE_ENV: 'production',
          API_KEYS: 'prod-api-key-0123456789',
          SUPABASE_SERVICE_ROLE_KEY: 'prod-service-role-key-0123456789-abcdef-uvwxyz',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
        },
        selection: createSelection({
          authProvider: 'supabase',
          tokenMode: 'supabase-jwt',
          mfaMode: 'supabase-totp',
        }),
      }),
    ).not.toThrow();
  });

  it('rejects development API keys in production', () => {
    expect(() =>
      validateStartupEnvironment({
        env: {
          NODE_ENV: 'production',
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          API_KEYS: 'local-dev-key',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
        },
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).toThrow('API_KEYS must contain values that are at least 16 characters in production');
  });

  it('requires a strong MFA encryption key when local TOTP is enabled', () => {
    expect(() =>
      validateStartupEnvironment({
        env: {
          NODE_ENV: 'production',
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          MFA_ENCRYPTION_KEY: 'test-only-mfa-encryption-key',
        },
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).toThrow('MFA_ENCRYPTION_KEY must be at least 32 characters in production');
  });

  it('requires a strong Supabase service role key when Supabase-backed features are enabled', () => {
    expect(() =>
      validateStartupEnvironment({
        env: {
          NODE_ENV: 'production',
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_SERVICE_ROLE_KEY: 'your-service-role-key',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_STORAGE_SCAN_WEBHOOK_URL: 'https://security.example.gov/media-scan',
        },
        selection: createSelection({ mfaMode: 'local-totp', mediaStorage: 'supabase-storage' }),
      }),
    ).toThrow('SUPABASE_SERVICE_ROLE_KEY must be at least 32 characters in production');
  });

  it('requires signed Supabase media access in production when incident media storage is enabled', () => {
    expect(() =>
      validateStartupEnvironment({
        env: {
          NODE_ENV: 'production',
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_SERVICE_ROLE_KEY: 'prod-service-role-key-0123456789-abcdef-uvwxyz',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_STORAGE_ACCESS_MODE: 'public',
          SUPABASE_STORAGE_SCAN_WEBHOOK_URL: 'https://security.example.gov/media-scan',
        },
        selection: createSelection({ mfaMode: 'local-totp', mediaStorage: 'supabase-storage' }),
      }),
    ).toThrow(
      'SUPABASE_STORAGE_ACCESS_MODE must be set to signed in production when Supabase media storage is enabled',
    );
  });

  it('requires incident media scan webhook configuration in production when media storage is enabled', () => {
    expect(() =>
      validateStartupEnvironment({
        env: {
          NODE_ENV: 'production',
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_SERVICE_ROLE_KEY: 'prod-service-role-key-0123456789-abcdef-uvwxyz',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_STORAGE_ACCESS_MODE: 'signed',
        },
        selection: createSelection({ mfaMode: 'local-totp', mediaStorage: 'supabase-storage' }),
      }),
    ).toThrow('SUPABASE_STORAGE_SCAN_WEBHOOK_URL must be configured in production');
  });

  it('rejects non-HTTPS password reset delivery webhooks in production', () => {
    expect(() =>
      validateStartupEnvironment({
        env: {
          NODE_ENV: 'production',
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_STORAGE_SCAN_WEBHOOK_URL: 'https://security.example.gov/media-scan',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'http://insecure.example.test/reset',
        },
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).toThrow('PASSWORD_RESET_DELIVERY_WEBHOOK_URL must use HTTPS in production');
  });

  it('requires password reset delivery to be configured in production', () => {
    expect(() =>
      validateStartupEnvironment({
        env: {
          NODE_ENV: 'production',
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_STORAGE_SCAN_WEBHOOK_URL: 'https://security.example.gov/media-scan',
        },
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).toThrow('PASSWORD_RESET_DELIVERY_WEBHOOK_URL must be configured in production');
  });

  it('rejects invalid security alert webhook URLs in production', () => {
    expect(() =>
      validateStartupEnvironment({
        env: {
          NODE_ENV: 'production',
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_STORAGE_SCAN_WEBHOOK_URL: 'https://security.example.gov/media-scan',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
          SECURITY_ALERT_WEBHOOK_URL: 'not-a-url',
        },
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).toThrow('SECURITY_ALERT_WEBHOOK_URL must be a valid absolute URL in production');
  });

  it('skips strict validation outside production', () => {
    expect(() =>
      validateStartupEnvironment({
        env: {
          NODE_ENV: 'test',
          JWT_SECRET: 'test-jwt-secret',
          API_KEYS: 'local-dev-key',
        },
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).not.toThrow();
  });
});
