import type { FeatureSelection } from '../featureSelection.js';

type StartupValidationOptions = {
  env: NodeJS.ProcessEnv;
  selection: FeatureSelection;
};

const MIN_SECRET_LENGTH = 32;
const MIN_API_KEY_LENGTH = 16;
const WEAK_SECRET_VALUES = new Set([
  'change-me',
  'changeme',
  'default',
  'example',
  'example-secret',
  'jwt-secret',
  'local-dev-key',
  'password',
  'password123',
  'replace-me',
  'replace-with-a-long-random-secret',
  'replace-with-a-separate-long-random-secret',
  'secret',
  'supabase-service-role-key',
  'test-jwt-secret',
  'test-only-mfa-encryption-key',
  'your-jwt-secret',
  'your-service-role-key',
]);

function isTrue(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

function shouldSkipStrictValidation(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.JEST_WORKER_ID) && !isTrue(env.SECURITY_STRICT_ENV_VALIDATION);
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

function validateRequiredSecret(
  env: NodeJS.ProcessEnv,
  name: string,
  minimumLength: number,
): void {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be configured`);
  }

  if (value.length < minimumLength) {
    throw new Error(
      `${name} must be at least ${minimumLength} characters in production`,
    );
  }

  if (WEAK_SECRET_VALUES.has(normalizeValue(value))) {
    throw new Error(`${name} must not use a placeholder or test value in production`);
  }
}

function validateApiKeys(env: NodeJS.ProcessEnv): void {
  const rawValue = env.API_KEYS?.trim() || env.API_KEY?.trim();
  if (!rawValue) {
    return;
  }

  const keys = rawValue
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  for (const key of keys) {
    if (key.length < MIN_API_KEY_LENGTH) {
      throw new Error(
        `API_KEYS must contain values that are at least ${MIN_API_KEY_LENGTH} characters in production`,
      );
    }

    if (WEAK_SECRET_VALUES.has(normalizeValue(key))) {
      throw new Error('API_KEYS must not use placeholder or development values in production');
    }
  }
}

function requiresSupabaseServiceRoleKey(selection: FeatureSelection): boolean {
  return (
    selection.authProvider === 'supabase' ||
    selection.tokenMode === 'supabase-jwt' ||
    selection.mfaMode === 'supabase-totp' ||
    selection.mediaStorage === 'supabase-storage'
  );
}

export function validateStartupEnvironment({ env, selection }: StartupValidationOptions): void {
  if (env.NODE_ENV !== 'production' || shouldSkipStrictValidation(env)) {
    return;
  }

  validateRequiredSecret(env, 'JWT_SECRET', MIN_SECRET_LENGTH);
  validateApiKeys(env);

  if (selection.mfaMode === 'local-totp') {
    validateRequiredSecret(env, 'MFA_ENCRYPTION_KEY', MIN_SECRET_LENGTH);
  }

  if (requiresSupabaseServiceRoleKey(selection)) {
    validateRequiredSecret(env, 'SUPABASE_SERVICE_ROLE_KEY', MIN_SECRET_LENGTH);
  }
}