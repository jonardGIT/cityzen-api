import dotenv from 'dotenv';

function resolveEnvFile(): string {
  if (process.env.NODE_ENV === 'production') {
    return '.env';
  }

  if (process.env.NODE_ENV === 'test') {
    return '.env.test';
  }

  return '.env.development';
}

function shouldOverrideExistingEnv(): boolean {
  return process.env.NODE_ENV !== 'test';
}

dotenv.config({ path: resolveEnvFile(), override: shouldOverrideExistingEnv() });
