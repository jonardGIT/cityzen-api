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

function createProductionEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS: '600000',
    PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS: '20',
    INCIDENT_CASE_TOKEN_TTL_DAYS: '30',
    ...overrides,
  };
}

describe('startup environment validation', () => {
  it('allows strong production secrets', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          API_KEYS: 'prod-api-key-0123456789',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_URL: 'https://project.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'prod-service-role-key-0123456789-abcdef-uvwxyz',
          SUPABASE_STORAGE_ACCESS_MODE: 'signed',
          SUPABASE_STORAGE_SCAN_WEBHOOK_URL: 'https://security.example.gov/media-scan',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
          SECURITY_ALERT_WEBHOOK_URL: 'https://security.example.gov/alerts',
        }),
        selection: createSelection({
          mfaMode: 'local-totp',
          mediaStorage: 'supabase-storage',
        }),
      }),
    ).not.toThrow();
  });

  it('accepts explicit production trust-layer envs', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          API_KEYS: 'prod-api-key-0123456789',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
        }),
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).not.toThrow();
  });

  it('allows production startup when trust baseline envs are omitted and other required config is valid', () => {
    const env = createProductionEnv({
      JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
      API_KEYS: 'prod-api-key-0123456789',
      MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
      PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
    });

    delete env.PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS;
    delete env.PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS;
    delete env.INCIDENT_CASE_TOKEN_TTL_DAYS;

    expect(() =>
      validateStartupEnvironment({
        env,
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).not.toThrow();
  });

  it('rejects production builds that explicitly disable public case lookup rate limiting', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          PUBLIC_CASE_LOOKUP_RATE_LIMIT_ENABLED: 'false',
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          API_KEYS: 'prod-api-key-0123456789',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
        }),
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).toThrow(
      'PUBLIC_CASE_LOOKUP_RATE_LIMIT_ENABLED must remain enabled in production for the public case lookup trust-layer endpoint',
    );
  });

  it('rejects production builds that explicitly disable global rate limiting', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          RATE_LIMIT_ENABLED: 'false',
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          API_KEYS: 'prod-api-key-0123456789',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
        }),
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).toThrow(
      'RATE_LIMIT_ENABLED must remain enabled in production so auth, recovery, and MFA throttles cannot be globally disabled',
    );
  });

  it('rejects production builds with JEST_WORKER_ID set when global rate limiting is disabled', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          JEST_WORKER_ID: '1',
          RATE_LIMIT_ENABLED: 'false',
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          API_KEYS: 'prod-api-key-0123456789',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
        }),
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).toThrow(
      'RATE_LIMIT_ENABLED must remain enabled in production so auth, recovery, and MFA throttles cannot be globally disabled',
    );
  });

  it.each([
    [
      'PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS',
      '0',
      'PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS must be between 60000 and 3600000 in production',
    ],
    [
      'PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS',
      'abc',
      'PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS must be a positive integer in production',
    ],
    [
      'PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS',
      '999',
      'PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS must be between 1 and 30 in production',
    ],
    [
      'INCIDENT_CASE_TOKEN_TTL_DAYS',
      '365',
      'INCIDENT_CASE_TOKEN_TTL_DAYS must be between 1 and 30 in production',
    ],
  ])('rejects invalid production trust-layer env %s=%s', (envName, envValue, message) => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          [envName]: envValue,
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          API_KEYS: 'prod-api-key-0123456789',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
        }),
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).toThrow(message);
  });

  it('rejects production builds that disable MFA entirely', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
        }),
        selection: createSelection({ mfaMode: 'disabled' }),
      }),
    ).toThrow('FEATURE_MFA_MODE must not be disabled in production');
  });

  it('rejects weak JWT secrets in production', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          JWT_SECRET: 'test-jwt-secret',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
        }),
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).toThrow('JWT_SECRET must be at least 32 characters in production');
  });

  it('does not require JWT_SECRET in production when Supabase JWT mode is selected', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          API_KEYS: 'prod-api-key-0123456789',
          SUPABASE_URL: 'https://project.supabase.co',
          SUPABASE_ANON_KEY: 'prod-anon-key-0123456789-abcdef-uvwxyz',
          SUPABASE_SERVICE_ROLE_KEY: 'prod-service-role-key-0123456789-abcdef-uvwxyz',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
        }),
        selection: createSelection({
          authProvider: 'supabase',
          tokenMode: 'supabase-jwt',
          mfaMode: 'supabase-totp',
        }),
      }),
    ).not.toThrow();
  });

  it('rejects production Supabase JWT mode when SUPABASE_URL is missing', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          API_KEYS: 'prod-api-key-0123456789',
          SUPABASE_ANON_KEY: 'prod-anon-key-0123456789-abcdef-uvwxyz',
          SUPABASE_SERVICE_ROLE_KEY: 'prod-service-role-key-0123456789-abcdef-uvwxyz',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
        }),
        selection: createSelection({
          authProvider: 'supabase',
          tokenMode: 'supabase-jwt',
          mfaMode: 'supabase-totp',
        }),
      }),
    ).toThrow('SUPABASE_URL must be configured in production');
  });

  it('rejects production Supabase JWT mode when SUPABASE_ANON_KEY is missing', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          API_KEYS: 'prod-api-key-0123456789',
          SUPABASE_URL: 'https://project.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'prod-service-role-key-0123456789-abcdef-uvwxyz',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
        }),
        selection: createSelection({
          authProvider: 'supabase',
          tokenMode: 'supabase-jwt',
          mfaMode: 'supabase-totp',
        }),
      }),
    ).toThrow('SUPABASE_ANON_KEY must be configured');
  });

  it('accepts a valid production Supabase JWT configuration with auth URL, anon key, service role key, and password reset delivery', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          API_KEYS: 'prod-api-key-0123456789',
          SUPABASE_URL: 'https://project.supabase.co',
          SUPABASE_ANON_KEY: 'prod-anon-key-0123456789-abcdef-uvwxyz',
          SUPABASE_SERVICE_ROLE_KEY: 'prod-service-role-key-0123456789-abcdef-uvwxyz',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
        }),
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
        env: createProductionEnv({
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          API_KEYS: 'local-dev-key',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
        }),
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).toThrow('API_KEYS must contain values that are at least 16 characters in production');
  });

  it('requires a strong MFA encryption key when local TOTP is enabled', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          MFA_ENCRYPTION_KEY: 'test-only-mfa-encryption-key',
        }),
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).toThrow('MFA_ENCRYPTION_KEY must be at least 32 characters in production');
  });

  it('requires a strong Supabase service role key when Supabase-backed features are enabled', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_SERVICE_ROLE_KEY: 'your-service-role-key',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_STORAGE_SCAN_WEBHOOK_URL: 'https://security.example.gov/media-scan',
        }),
        selection: createSelection({ mfaMode: 'local-totp', mediaStorage: 'supabase-storage' }),
      }),
    ).toThrow('SUPABASE_SERVICE_ROLE_KEY must be at least 32 characters in production');
  });

  it('requires signed Supabase media access in production when incident media storage is enabled', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_URL: 'https://project.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'prod-service-role-key-0123456789-abcdef-uvwxyz',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_STORAGE_ACCESS_MODE: 'public',
          SUPABASE_STORAGE_SCAN_WEBHOOK_URL: 'https://security.example.gov/media-scan',
        }),
        selection: createSelection({ mfaMode: 'local-totp', mediaStorage: 'supabase-storage' }),
      }),
    ).toThrow(
      'SUPABASE_STORAGE_ACCESS_MODE must be set to signed in production when Supabase media storage is enabled',
    );
  });

  it('allows production media storage without a scan webhook when signed access is configured', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_URL: 'https://project.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'prod-service-role-key-0123456789-abcdef-uvwxyz',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_STORAGE_ACCESS_MODE: 'signed',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
        }),
        selection: createSelection({ mfaMode: 'local-totp', mediaStorage: 'supabase-storage' }),
      }),
    ).not.toThrow();
  });

  it('rejects non-https scan webhooks when Supabase media storage is enabled in production', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_URL: 'https://project.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'prod-service-role-key-0123456789-abcdef-uvwxyz',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_STORAGE_ACCESS_MODE: 'signed',
          SUPABASE_STORAGE_SCAN_WEBHOOK_URL: 'http://security.example.gov/media-scan',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
        }),
        selection: createSelection({ mfaMode: 'local-totp', mediaStorage: 'supabase-storage' }),
      }),
    ).toThrow('SUPABASE_STORAGE_SCAN_WEBHOOK_URL must use HTTPS in production');
  });

  it('rejects production Supabase media storage mode when SUPABASE_URL is missing', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_SERVICE_ROLE_KEY: 'prod-service-role-key-0123456789-abcdef-uvwxyz',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_STORAGE_ACCESS_MODE: 'signed',
          SUPABASE_STORAGE_SCAN_WEBHOOK_URL: 'https://security.example.gov/media-scan',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
        }),
        selection: createSelection({ mfaMode: 'local-totp', mediaStorage: 'supabase-storage' }),
      }),
    ).toThrow('SUPABASE_URL must be configured in production');
  });

  it('rejects non-HTTPS password reset delivery webhooks in production', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_STORAGE_SCAN_WEBHOOK_URL: 'https://security.example.gov/media-scan',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'http://insecure.example.test/reset',
        }),
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).toThrow('PASSWORD_RESET_DELIVERY_WEBHOOK_URL must use HTTPS in production');
  });

  it('requires password reset delivery to be configured in production', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_STORAGE_SCAN_WEBHOOK_URL: 'https://security.example.gov/media-scan',
        }),
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).toThrow('PASSWORD_RESET_DELIVERY_WEBHOOK_URL must be configured in production');
  });

  it('rejects overlong password reset token TTL values in production', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
          PASSWORD_RESET_TOKEN_TTL_MINUTES: '180',
        }),
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).toThrow('PASSWORD_RESET_TOKEN_TTL_MINUTES must be between 5 and 60 in production');
  });

  it('accepts an explicit bounded password reset token TTL in production', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
          PASSWORD_RESET_TOKEN_TTL_MINUTES: '45',
        }),
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).not.toThrow();
  });

  it('rejects invalid security alert webhook URLs in production', () => {
    expect(() =>
      validateStartupEnvironment({
        env: createProductionEnv({
          JWT_SECRET: 'prod-jwt-secret-0123456789-abcdef-uvwxyz',
          MFA_ENCRYPTION_KEY: 'prod-mfa-secret-0123456789-abcdef-uvwxyz',
          SUPABASE_STORAGE_SCAN_WEBHOOK_URL: 'https://security.example.gov/media-scan',
          PASSWORD_RESET_DELIVERY_WEBHOOK_URL: 'https://security.example.gov/password-reset',
          SECURITY_ALERT_WEBHOOK_URL: 'not-a-url',
        }),
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).toThrow('SECURITY_ALERT_WEBHOOK_URL must be a valid absolute URL in production');
  });

  it('skips strict validation outside production', () => {
    expect(() =>
      validateStartupEnvironment({
        env: {
          NODE_ENV: 'test',
          PUBLIC_CASE_LOOKUP_RATE_LIMIT_ENABLED: 'false',
          JWT_SECRET: 'test-jwt-secret',
          API_KEYS: 'local-dev-key',
        },
        selection: createSelection({ mfaMode: 'local-totp' }),
      }),
    ).not.toThrow();
  });
});
