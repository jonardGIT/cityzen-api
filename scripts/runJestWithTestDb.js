import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import EmbeddedPostgres from 'embedded-postgres';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const developmentEnvFilePath = path.join(repoRoot, '.env.development');
const runnerArgs = process.argv.slice(2);
const shouldUseDevelopmentDatabaseFlag = runnerArgs.includes('--development-db');
const allowNonTestDatabaseFlag = runnerArgs.includes('--allow-non-test-database');
const defaultTestEnvironment = {
  API_BASE_PATH: '/api/v1',
  CORS_ORIGIN: 'http://localhost:3001',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:55432/xypes_test?schema=public',
  DIRECT_URL: 'postgresql://postgres:postgres@localhost:55432/xypes_test?schema=public',
  HOST: '0.0.0.0',
  JWT_SECRET: 'test-only-jwt-secret-change-me',
  LOG_LEVEL: 'error',
  NODE_ENV: 'test',
  PORT: '3000',
  RATE_LIMIT_ENABLED: 'false',
  TRUST_PROXY: 'false',
};

function getArgValue(name) {
  const exactPrefix = `${name}=`;

  for (let index = 0; index < runnerArgs.length; index += 1) {
    const arg = runnerArgs[index];

    if (arg === name) {
      return runnerArgs[index + 1];
    }

    if (arg.startsWith(exactPrefix)) {
      return arg.slice(exactPrefix.length);
    }
  }

  return undefined;
}

function resolveEnvFilePath() {
  const selectedEnvFile =
    getArgValue('--test-env-file') ?? process.env.TEST_ENV_FILE ?? '.env.test';

  if (!selectedEnvFile.trim()) {
    return path.join(repoRoot, '.env.test');
  }

  return path.isAbsolute(selectedEnvFile)
    ? selectedEnvFile
    : path.resolve(repoRoot, selectedEnvFile);
}

function isTrue(value) {
  return value?.trim().toLowerCase() === 'true';
}

function resolveSqlSslOption(url) {
  const sslMode = url.searchParams.get('sslmode')?.trim().toLowerCase();

  if (sslMode === 'require') {
    return 'require';
  }

  return undefined;
}

export function applyDevelopmentDatabaseEnv(targetEnv, developmentEnv, options = {}) {
  const { preserveDatabaseUrl = false, preserveDirectUrl = false } = options;

  if (!preserveDatabaseUrl && developmentEnv.DATABASE_URL?.trim()) {
    targetEnv.DATABASE_URL = developmentEnv.DATABASE_URL.trim();
  }

  if (!preserveDirectUrl && developmentEnv.DIRECT_URL?.trim()) {
    targetEnv.DIRECT_URL = developmentEnv.DIRECT_URL.trim();
  }
}

const explicitDatabaseUrl = process.env.DATABASE_URL;
const explicitDirectUrl = process.env.DIRECT_URL;
const envFilePath = resolveEnvFilePath();
const developmentEnv = fs.existsSync(developmentEnvFilePath)
  ? dotenv.parse(fs.readFileSync(developmentEnvFilePath))
  : {};
const shouldUseDevelopmentDatabase =
  shouldUseDevelopmentDatabaseFlag || isTrue(process.env.TEST_USE_DEVELOPMENT_DATABASE);

if (fs.existsSync(envFilePath)) {
  dotenv.config({ path: envFilePath, override: false });
}

if (shouldUseDevelopmentDatabase) {
  applyDevelopmentDatabaseEnv(process.env, developmentEnv, {
    preserveDatabaseUrl: Boolean(explicitDatabaseUrl),
    preserveDirectUrl: Boolean(explicitDirectUrl),
  });

  process.env.JEST_TEST_TIMEOUT_MS ??= '180000';
}

for (const [key, value] of Object.entries(defaultTestEnvironment)) {
  process.env[key] ??= value;
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required to run tests.');
  process.exit(1);
}

const databaseTarget = new URL(databaseUrl);
const isLocalDatabase = ['localhost', '127.0.0.1'].includes(databaseTarget.hostname);
const requestedDatabaseName = databaseTarget.pathname.replace(/^\//, '') || 'postgres';
const isNamedTestDatabase = /(^|[_-])test([_-]|$)/i.test(requestedDatabaseName);
const shouldAllowNonTestDatabase =
  allowNonTestDatabaseFlag || isTrue(process.env.TEST_ALLOW_NON_TEST_DATABASE);
const shouldAutoStartDatabase =
  process.env.CI !== 'true' &&
  process.env.TEST_DB_AUTO_START !== 'false' &&
  isLocalDatabase &&
  databaseTarget.port === '55432';

if (!isLocalDatabase && !shouldAllowNonTestDatabase) {
  console.error(
    `Refusing to run Jest against non-local database ${databaseTarget.host}. Use --allow-non-test-database or TEST_ALLOW_NON_TEST_DATABASE=true to override deliberately.`,
  );
  process.exit(1);
}

if (!isNamedTestDatabase && !shouldAllowNonTestDatabase) {
  console.error(
    `Refusing to run Jest against database ${requestedDatabaseName}. Select a dedicated test database or pass --allow-non-test-database to override deliberately.`,
  );
  process.exit(1);
}

const embeddedDatabaseBaseDir = path.join(
  repoRoot,
  'node_modules',
  '.cache',
  'embedded-postgres-test-db',
);
let embeddedDatabaseDir = embeddedDatabaseBaseDir;

let embeddedPostgresInstance = null;
let embeddedPostgresShutdownPromise = null;
let embeddedPostgresSignalHandlersRegistered = false;

function createEmbeddedPostgresInstance() {
  return new EmbeddedPostgres({
    authMethod: 'password',
    databaseDir: embeddedDatabaseDir,
    onError: (message) => {
      const text = String(message).trim();

      if (text) {
        console.error(text);
      }
    },
    onLog: () => undefined,
    password: databaseTarget.password || 'postgres',
    persistent: true,
    port: Number(databaseTarget.port),
    user: databaseTarget.username || 'postgres',
  });
}

async function canConnectToDatabase() {
  const sql = postgres({
    connect_timeout: 2,
    database: requestedDatabaseName,
    host: databaseTarget.hostname,
    idle_timeout: 1,
    max: 1,
    pass: decodeURIComponent(databaseTarget.password),
    port: Number(databaseTarget.port || '5432'),
    prepare: false,
    ssl: resolveSqlSslOption(databaseTarget),
    username: decodeURIComponent(databaseTarget.username),
  });

  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}

async function hasStableDatabaseConnection({
  pollIntervalMs = 250,
  requiredConsecutiveSuccesses = 3,
  timeoutAt = Date.now(),
} = {}) {
  let consecutiveSuccesses = 0;

  while (Date.now() <= timeoutAt) {
    if (await canConnectToDatabase()) {
      consecutiveSuccesses += 1;

      if (consecutiveSuccesses >= requiredConsecutiveSuccesses) {
        return true;
      }
    } else {
      consecutiveSuccesses = 0;
    }

    if (Date.now() >= timeoutAt) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return false;
}

function runCompose(args) {
  const result = spawnSync('sh', ['./scripts/runTestDbCompose.sh', ...args], {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
  });

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    throw result.error;
  }
}

function canRunCompose() {
  const result = spawnSync('sh', ['./scripts/runTestDbCompose.sh', 'config'], {
    cwd: repoRoot,
    env: process.env,
    stdio: 'ignore',
  });

  return result.status === 0;
}

function resetEmbeddedPostgresState() {
  embeddedPostgresInstance = null;
  embeddedPostgresShutdownPromise = null;
}

function clearEmbeddedDatabaseDir() {
  fs.rmSync(embeddedDatabaseDir, { force: true, recursive: true });
}

function resetEmbeddedDatabaseDir() {
  embeddedDatabaseDir = embeddedDatabaseBaseDir;
}

function useFreshEmbeddedDatabaseDir() {
  embeddedDatabaseDir = path.join(
    tmpdir(),
    `xypes-cirs-api-embedded-postgres-test-db-${process.pid}`,
  );
}

async function ensureEmbeddedDatabaseOnce() {
  fs.mkdirSync(path.dirname(embeddedDatabaseDir), { recursive: true });

  if (!embeddedPostgresInstance) {
    embeddedPostgresInstance = createEmbeddedPostgresInstance();
  }

  if (!fs.existsSync(path.join(embeddedDatabaseDir, 'PG_VERSION'))) {
    await embeddedPostgresInstance.initialise();
  }

  await embeddedPostgresInstance.start();

  if (!embeddedPostgresSignalHandlersRegistered) {
    const handleSignal = (signal) => {
      void shutdownEmbeddedDatabase(signal).finally(() => {
        process.exit(128 + signal);
      });
    };

    process.once('SIGINT', () => handleSignal(2));
    process.once('SIGTERM', () => handleSignal(15));
    embeddedPostgresSignalHandlersRegistered = true;
  }

  try {
    await embeddedPostgresInstance.createDatabase(requestedDatabaseName);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!message.toLowerCase().includes('already exists')) {
      throw error;
    }
  }
}

async function ensureEmbeddedDatabase() {
  try {
    await ensureEmbeddedDatabaseOnce();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error(`Embedded Postgres failed; retrying with a fresh data dir. ${message}`);

    await shutdownEmbeddedDatabase();
    resetEmbeddedDatabaseDir();
    clearEmbeddedDatabaseDir();
    useFreshEmbeddedDatabaseDir();
    clearEmbeddedDatabaseDir();
    resetEmbeddedPostgresState();

    try {
      await ensureEmbeddedDatabaseOnce();
    } catch (retryError) {
      const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
      console.error(`Embedded Postgres retry failed. ${retryMessage}`);
      throw retryError;
    }
  }
}

async function shutdownEmbeddedDatabase() {
  if (!embeddedPostgresInstance) {
    return;
  }

  if (!embeddedPostgresShutdownPromise) {
    embeddedPostgresShutdownPromise = embeddedPostgresInstance
      .stop()
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(message);
      })
      .finally(() => {
        embeddedPostgresInstance = null;
        embeddedPostgresShutdownPromise = null;
      });
  }

  await embeddedPostgresShutdownPromise;
}

async function ensureLocalTestDatabase() {
  const initialProbeTimeoutMs = shouldAutoStartDatabase ? 1_000 : 10_000;
  const initialProbeSuccesses = shouldAutoStartDatabase ? 3 : 1;

  if (
    await hasStableDatabaseConnection({
      requiredConsecutiveSuccesses: initialProbeSuccesses,
      timeoutAt: Date.now() + initialProbeTimeoutMs,
    })
  ) {
    return;
  }

  if (!shouldAutoStartDatabase) {
    console.error(`Unable to connect to test database at ${databaseTarget.host}.`);
    process.exit(1);
  }

  if (canRunCompose()) {
    runCompose(['up', '-d']);
  } else {
    await ensureEmbeddedDatabase();
  }

  if (
    await hasStableDatabaseConnection({
      pollIntervalMs: 1_000,
      timeoutAt: Date.now() + 60_000,
    })
  ) {
    return;
  }

  console.error(`Timed out waiting for the local test database at ${databaseTarget.host}.`);
  process.exit(1);
}

export async function ensureTestDatabaseReady() {
  await ensureLocalTestDatabase();
}

async function main() {
  await ensureTestDatabaseReady();

  const jestBin = path.join(repoRoot, 'node_modules', 'jest', 'bin', 'jest.js');
  const forwardedArgs = [];

  for (let index = 0; index < runnerArgs.length; index += 1) {
    const arg = runnerArgs[index];

    if (arg === '--development-db' || arg === '--allow-non-test-database') {
      continue;
    }

    if (arg === '--test-env-file') {
      index += 1;
      continue;
    }

    if (arg.startsWith('--test-env-file=')) {
      continue;
    }

    forwardedArgs.push(arg);
  }

  const result = spawnSync(process.execPath, [jestBin, ...forwardedArgs], {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main()
    .then((statusCode) => {
      process.exit(statusCode);
    })
    .catch(async (error) => {
      console.error(error instanceof Error ? error.message : error);
      await shutdownEmbeddedDatabase();
      process.exit(1);
    });
}
