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

dotenv.config({ path: resolveEnvFile() });
