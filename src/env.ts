import dotenv from 'dotenv';

function resolveEnvFile(): string {
  const explicitEnvFile = process.env.ENV_FILE?.trim();

  if (explicitEnvFile) {
    return explicitEnvFile;
  }

  if (process.env.NODE_ENV === 'production') {
    return '.env';
  }

  if (process.env.NODE_ENV === 'test') {
    return '.env.test';
  }

  return '.env.development';
}

function shouldOverrideExistingEnv(): boolean {
  return false;
}

dotenv.config({ path: resolveEnvFile(), override: shouldOverrideExistingEnv() });
