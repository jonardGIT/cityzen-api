#!/usr/bin/env node

import process from 'node:process';

const DEFAULT_SAFE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  'postgres',
  'xypes-cirs-test-db',
  'host.docker.internal',
]);

const DEFAULT_SAFE_DATABASES = new Set(['xypes_test']);
const MANAGED_HOST_PATTERN =
  /(supabase\.co|rds\.amazonaws\.com|neon\.tech|render\.com|railway\.app|aivencloud\.com|googleapis\.com|azure\.com)$/i;
const PRODUCTION_LIKE_PATTERN = /(^|[._-])(prod|production|live|primary)([._-]|$)/i;
const TESTISH_DATABASE_PATTERN = /(?:^|[_-])(test|local)(?:$|[_-])/i;

function parseArgs(argv) {
  const options = {
    allowHosts: [],
    allowDbs: [],
    label: 'destructive Prisma command',
  };

  for (const arg of argv) {
    if (arg.startsWith('--label=')) {
      options.label = arg.slice('--label='.length);
      continue;
    }

    if (arg.startsWith('--allow-host=')) {
      options.allowHosts.push(arg.slice('--allow-host='.length).toLowerCase());
      continue;
    }

    if (arg.startsWith('--allow-db=')) {
      options.allowDbs.push(arg.slice('--allow-db='.length).toLowerCase());
    }
  }

  return options;
}

function fail(label, reason) {
  console.error(`[guard] Blocked ${label}. ${reason}`);
  console.error(
    '[guard] Destructive Prisma reset/seed scripts are limited to local or test database targets.',
  );
  process.exit(1);
}

function normalizeDatabaseName(pathname) {
  return decodeURIComponent(pathname.replace(/^\/+/, '').split('/')[0] ?? '').toLowerCase();
}

function assessConnectionString(name, rawValue, safeHosts, safeDatabases) {
  if (!rawValue) {
    return;
  }

  let parsed;

  try {
    parsed = new URL(rawValue);
  } catch {
    fail(name, `${name} is set but could not be parsed as a URL.`);
  }

  const protocol = parsed.protocol.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();
  const databaseName = normalizeDatabaseName(parsed.pathname);
  const safeHost = safeHosts.has(hostname);
  const safeDatabase =
    safeDatabases.has(databaseName) ||
    databaseName.endsWith('_test') ||
    databaseName.endsWith('_local') ||
    TESTISH_DATABASE_PATTERN.test(databaseName);
  const productionLikeHost =
    MANAGED_HOST_PATTERN.test(hostname) || PRODUCTION_LIKE_PATTERN.test(hostname);
  const productionLikeDatabase = PRODUCTION_LIKE_PATTERN.test(databaseName);

  if (process.env.NODE_ENV?.toLowerCase() === 'production') {
    fail(name, 'NODE_ENV=production is never allowed for destructive Prisma reset/seed commands.');
  }

  if (protocol === 'file:') {
    return;
  }

  if (productionLikeHost || productionLikeDatabase) {
    fail(
      name,
      `${name} points at a production-like target (${hostname || 'unknown host'}${databaseName ? `/${databaseName}` : ''}).`,
    );
  }

  if (safeHost || safeDatabase) {
    return;
  }

  fail(
    name,
    `${name} is not clearly local or test-safe (${hostname || 'unknown host'}${databaseName ? `/${databaseName}` : ''}).`,
  );
}

const options = parseArgs(process.argv.slice(2));
const safeHosts = new Set([...DEFAULT_SAFE_HOSTS, ...options.allowHosts]);
const safeDatabases = new Set([...DEFAULT_SAFE_DATABASES, ...options.allowDbs]);

if (process.env.NODE_ENV?.toLowerCase() === 'production') {
  fail(
    options.label,
    'NODE_ENV=production is never allowed for destructive Prisma reset/seed commands.',
  );
}

assessConnectionString('DATABASE_URL', process.env.DATABASE_URL, safeHosts, safeDatabases);
assessConnectionString('DIRECT_URL', process.env.DIRECT_URL, safeHosts, safeDatabases);

if (
  !process.env.DATABASE_URL &&
  !process.env.DIRECT_URL &&
  safeDatabases.size === 0 &&
  safeHosts.size === 0
) {
  fail(options.label, 'No database target hints were provided.');
}
