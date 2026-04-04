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

  it('rejects weak JWT secrets in production', () => {
    expect(() =>
      validateStartupEnvironment({
        env: {
          NODE_ENV: 'production',
          JWT_SECRET: 'test-jwt-secret',
        },
        selection: createSelection(),
      }),
    ).toThrow('JWT_SECRET must be at least 32 characters in production');
  });

  it('rejects development API keys in production', () => {
    expect(() =>
      validateStartupEnvironment({
        env: {
          NODE_ENV: 'production',
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          API_KEYS: 'local-dev-key',
        },
        selection: createSelection(),
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
        },
        selection: createSelection({ mediaStorage: 'supabase-storage' }),
      }),
    ).toThrow('SUPABASE_SERVICE_ROLE_KEY must be at least 32 characters in production');
  });

  it('rejects non-HTTPS password reset delivery webhooks in production', () => {
    expect(() =>
      validateStartupEnvironment({
        env: {
          NODE_ENV: 'production',
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'http://insecure.example.test/reset',
        },
        selection: createSelection(),
      }),
    ).toThrow('PASSWORD_RESET_DELIVERY_WEBHOOK_URL must use HTTPS in production');
  });

  it('rejects invalid security alert webhook URLs in production', () => {
    expect(() =>
      validateStartupEnvironment({
        env: {
          NODE_ENV: 'production',
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          SECURITY_ALERT_WEBHOOK_URL: 'not-a-url',
        },
        selection: createSelection(),
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
