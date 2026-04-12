import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import EmbeddedPostgres from 'embedded-postgres';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const envFilePath = path.join(repoRoot, '.env.test');

if (fs.existsSync(envFilePath)) {
  dotenv.config({ path: envFilePath, override: false });
}

process.env.NODE_ENV ??= 'test';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required to run tests.');
  process.exit(1);
}

const databaseTarget = new URL(databaseUrl);
const isLocalDatabase = ['localhost', '127.0.0.1'].includes(databaseTarget.hostname);
const requestedDatabaseName = databaseTarget.pathname.replace(/^\//, '') || 'postgres';
const shouldAutoStartDatabase =
  process.env.CI !== 'true' &&
  process.env.TEST_DB_AUTO_START !== 'false' &&
  isLocalDatabase &&
  databaseTarget.port === '55432';

const embeddedDatabaseDir = path.join(
  repoRoot,
  'node_modules',
  '.cache',
  'embedded-postgres-test-db',
);

let embeddedPostgresInstance = null;
let embeddedPostgresShutdownPromise = null;
let embeddedPostgresSignalHandlersRegistered = false;

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

async function ensureEmbeddedDatabase() {
  fs.mkdirSync(path.dirname(embeddedDatabaseDir), { recursive: true });

  if (!embeddedPostgresInstance) {
    embeddedPostgresInstance = new EmbeddedPostgres({
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
  if (
    await hasStableDatabaseConnection({
      timeoutAt: Date.now() + 1_000,
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
  const result = spawnSync(process.execPath, [jestBin, ...process.argv.slice(2)], {
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
