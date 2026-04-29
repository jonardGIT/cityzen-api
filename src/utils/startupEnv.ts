import type { FeatureSelection } from '../featureSelection.js';

type StartupValidationOptions = {
  env: NodeJS.ProcessEnv;
  selection: FeatureSelection;
};

const MIN_SECRET_LENGTH = 32;
const MIN_API_KEY_LENGTH = 16;
const PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS_BOUNDS = {
  min: 60_000,
  max: 3_600_000,
  recommended: 600_000,
} as const;
const PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS_BOUNDS = {
  min: 1,
  max: 30,
  recommended: 20,
} as const;
const INCIDENT_CASE_TOKEN_TTL_DAYS_BOUNDS = {
  min: 1,
  max: 30,
  recommended: 30,
} as const;
const PASSWORD_RESET_TOKEN_TTL_MINUTES_BOUNDS = {
  min: 5,
  max: 60,
  recommended: 30,
} as const;
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

function isFalse(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'false';
}

function shouldSkipStrictValidation(env: NodeJS.ProcessEnv): boolean {
  return (
    env.NODE_ENV !== 'production' &&
    Boolean(env.JEST_WORKER_ID) &&
    !isTrue(env.SECURITY_STRICT_ENV_VALIDATION)
  );
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

function validateRequiredSecret(env: NodeJS.ProcessEnv, name: string, minimumLength: number): void {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be configured`);
  }

  if (value.length < minimumLength) {
    throw new Error(`${name} must be at least ${minimumLength} characters in production`);
  }

  if (WEAK_SECRET_VALUES.has(normalizeValue(value))) {
    throw new Error(`${name} must not use a placeholder or test value in production`);
  }
}

function validateApiKeys(env: NodeJS.ProcessEnv): void {
  const rawValue = env.API_KEYS?.trim() || env.API_KEY?.trim();
  if (!rawValue) {
    throw new Error('API_KEYS or API_KEY must be configured in production');
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

function requiresSupabaseAuthPublicClient(selection: FeatureSelection): boolean {
  return (
    selection.authProvider === 'supabase' ||
    selection.tokenMode === 'supabase-jwt' ||
    selection.mfaMode === 'supabase-totp'
  );
}

function requiresSupabaseUrl(selection: FeatureSelection): boolean {
  return (
    requiresSupabaseAuthPublicClient(selection) || selection.mediaStorage === 'supabase-storage'
  );
}

function validateOptionalHttpsUrl(env: NodeJS.ProcessEnv, name: string): void {
  const value = env[name]?.trim();
  if (!value) {
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL in production`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`${name} must use HTTPS in production`);
  }
}

function validateRequiredHttpsUrl(env: NodeJS.ProcessEnv, name: string): void {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be configured in production`);
  }

  validateOptionalHttpsUrl(env, name);
}

function validateRequiredProductionInteger(
  env: NodeJS.ProcessEnv,
  name: string,
  bounds: { min: number; max: number; recommended: number },
): void {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} must be explicitly configured in production; use ${bounds.recommended} for the current partner-rollout baseline`,
    );
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be a positive integer in production`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < bounds.min || parsed > bounds.max) {
    throw new Error(`${name} must be between ${bounds.min} and ${bounds.max} in production`);
  }
}

function validateOptionalProductionInteger(
  env: NodeJS.ProcessEnv,
  name: string,
  bounds: { min: number; max: number; recommended: number },
): void {
  const value = env[name]?.trim();
  if (!value) {
    return;
  }

  validateRequiredProductionInteger(env, name, bounds);
}

function validateIncidentTrustProductionEnv(env: NodeJS.ProcessEnv): void {
  if (isFalse(env.RATE_LIMIT_ENABLED)) {
    throw new Error(
      'RATE_LIMIT_ENABLED must remain enabled in production so auth, recovery, and MFA throttles cannot be globally disabled',
    );
  }

  if (isFalse(env.PUBLIC_CASE_LOOKUP_RATE_LIMIT_ENABLED)) {
    throw new Error(
      'PUBLIC_CASE_LOOKUP_RATE_LIMIT_ENABLED must remain enabled in production for the public case lookup trust-layer endpoint',
    );
  }

  validateOptionalProductionInteger(
    env,
    'PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS',
    PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS_BOUNDS,
  );
  validateOptionalProductionInteger(
    env,
    'PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS',
    PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS_BOUNDS,
  );
  validateOptionalProductionInteger(
    env,
    'INCIDENT_CASE_TOKEN_TTL_DAYS',
    INCIDENT_CASE_TOKEN_TTL_DAYS_BOUNDS,
  );
}

function validateSupabaseStorageAccessMode(
  env: NodeJS.ProcessEnv,
  selection: FeatureSelection,
): void {
  if (selection.mediaStorage !== 'supabase-storage') {
    return;
  }

  const accessMode = env.SUPABASE_STORAGE_ACCESS_MODE?.trim().toLowerCase();
  if (accessMode !== 'signed') {
    throw new Error(
      'SUPABASE_STORAGE_ACCESS_MODE must be set to signed in production when Supabase media storage is enabled',
    );
  }
}

function validateSupabaseStorageScanWebhook(
  env: NodeJS.ProcessEnv,
  selection: FeatureSelection,
): void {
  if (selection.mediaStorage !== 'supabase-storage') {
    return;
  }

  validateOptionalHttpsUrl(env, 'SUPABASE_STORAGE_SCAN_WEBHOOK_URL');
}

function validateProductionPasswordResetDeliveryMode(env: NodeJS.ProcessEnv): void {
  const deliveryMode = env.PASSWORD_RESET_DELIVERY_MODE?.trim().toLowerCase();

  if (!deliveryMode || deliveryMode === 'webhook') {
    return;
  }

  throw new Error(
    'PASSWORD_RESET_DELIVERY_MODE must be webhook in production; unsafe delivery modes are not allowed',
  );
}

function validateProductionMfaMode(selection: FeatureSelection): void {
  if (selection.mfaMode === 'disabled') {
    throw new Error('FEATURE_MFA_MODE must not be disabled in production');
  }
}

export function validateStartupEnvironment({ env, selection }: StartupValidationOptions): void {
  if (env.NODE_ENV !== 'production' || shouldSkipStrictValidation(env)) {
    return;
  }

  validateIncidentTrustProductionEnv(env);
  validateOptionalProductionInteger(
    env,
    'PASSWORD_RESET_TOKEN_TTL_MINUTES',
    PASSWORD_RESET_TOKEN_TTL_MINUTES_BOUNDS,
  );
  validateProductionMfaMode(selection);

  if (selection.tokenMode === 'app-jwt') {
    validateRequiredSecret(env, 'JWT_SECRET', MIN_SECRET_LENGTH);
  }

  validateApiKeys(env);

  if (selection.mfaMode === 'local-totp') {
    validateRequiredSecret(env, 'MFA_ENCRYPTION_KEY', MIN_SECRET_LENGTH);
  }

  if (requiresSupabaseServiceRoleKey(selection)) {
    validateRequiredSecret(env, 'SUPABASE_SERVICE_ROLE_KEY', MIN_SECRET_LENGTH);
  }

  if (requiresSupabaseUrl(selection)) {
    validateRequiredHttpsUrl(env, 'SUPABASE_URL');
  }

  if (requiresSupabaseAuthPublicClient(selection)) {
    validateRequiredSecret(env, 'SUPABASE_ANON_KEY', MIN_SECRET_LENGTH);
  }

  validateSupabaseStorageAccessMode(env, selection);
  validateSupabaseStorageScanWebhook(env, selection);
  validateProductionPasswordResetDeliveryMode(env);

  validateRequiredHttpsUrl(env, 'PASSWORD_RESET_DELIVERY_WEBHOOK_URL');
  validateOptionalHttpsUrl(env, 'SECURITY_ALERT_WEBHOOK_URL');
}
