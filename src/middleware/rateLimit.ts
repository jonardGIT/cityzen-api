import type { Request, RequestHandler, Response } from 'express';
import prisma from '../lib/prisma.js';

type ClientWindow = {
  count: number;
  windowStart: number;
};

type RateLimitKeyGenerator = (req: Request) => string;

type ScopedRateLimitOptions = {
  enabled: boolean;
  scope: string;
  windowMs: number;
  maxRequests: number;
  keyGenerator?: RateLimitKeyGenerator;
};

type EnvScopedRateLimitOptions = {
  enabledEnvVar?: string;
  scope: string;
  windowMsEnvVar: string;
  maxRequestsEnvVar: string;
  defaultWindowMs: number;
  defaultMaxRequests: number;
  keyGenerator?: RateLimitKeyGenerator;
};

type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
};

type RateLimitStoreOptions = {
  scope: string;
  windowMs: number;
  maxRequests: number;
};

type RateLimitStore = {
  increment(key: string, options: RateLimitStoreOptions): Promise<RateLimitDecision>;
};

type RateLimitBucketRow = {
  count: number | bigint;
  resetAtMs: number | bigint;
};

class RateLimitStoreUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitStoreUnavailableError';
  }
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 100;
const DATABASE_BUCKET_CLEANUP_INTERVAL_MS = 300_000;

let lastDatabaseBucketCleanupAt = 0;
let hasLoggedDatabaseLimiterFallback = false;
let hasLoggedDatabaseLimiterFailure = false;

// Parses a positive integer from env, falling back to a safe default.
function toPositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// Parses boolean-like env values while preserving a default on invalid input.
function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return fallback;
}

// Normalizes paths so trailing slashes do not affect comparisons.
function normalizePath(path: string): string {
  return path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
}

// Matches a request path against bypassed public paths.
function shouldBypassPath(path: string, bypassPaths: readonly string[]): boolean {
  const normalizedPath = normalizePath(path);

  return bypassPaths.some((candidate) => {
    const normalizedCandidate = normalizePath(candidate);
    return (
      normalizedPath === normalizedCandidate || normalizedPath.startsWith(`${normalizedCandidate}/`)
    );
  });
}

// Derives a stable client identifier used for per-client rate tracking.
function getClientId(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function getBucketKey(scope: string, key: string): string {
  return `${scope}:${key}`;
}

function toNumber(value: number | bigint): number {
  return typeof value === 'bigint' ? Number(value) : value;
}

function getRateLimitStoreMode(): 'memory' | 'database' {
  const configured = process.env.RATE_LIMIT_STORE?.trim().toLowerCase();

  if (configured === 'memory' || configured === 'database') {
    return configured;
  }

  return process.env.NODE_ENV === 'production' ? 'database' : 'memory';
}

function shouldFailClosedForDatabaseLimiter(): boolean {
  return getRateLimitStoreMode() === 'database' && process.env.NODE_ENV === 'production';
}

async function maybePruneExpiredDatabaseBuckets(): Promise<void> {
  const now = Date.now();

  if (now - lastDatabaseBucketCleanupAt < DATABASE_BUCKET_CLEANUP_INTERVAL_MS) {
    return;
  }

  lastDatabaseBucketCleanupAt = now;
  await prisma.$executeRawUnsafe('DELETE FROM rate_limit_buckets WHERE "expiresAt" <= NOW()');
}

class MemoryRateLimitStore implements RateLimitStore {
  private readonly clients = new Map<string, ClientWindow>();

  async increment(key: string, options: RateLimitStoreOptions): Promise<RateLimitDecision> {
    const bucketKey = getBucketKey(options.scope, key);
    const now = Date.now();
    const existing = this.clients.get(bucketKey);

    if (!existing || now - existing.windowStart >= options.windowMs) {
      this.clients.set(bucketKey, { count: 1, windowStart: now });
      return {
        allowed: true,
        remaining: options.maxRequests - 1,
        resetAt: now + options.windowMs,
      };
    }

    existing.count += 1;
    this.clients.set(bucketKey, existing);

    const resetAt = existing.windowStart + options.windowMs;
    const allowed = existing.count <= options.maxRequests;

    return {
      allowed,
      remaining: Math.max(0, options.maxRequests - existing.count),
      resetAt,
      retryAfterSeconds: allowed ? undefined : Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }
}

class DatabaseRateLimitStore implements RateLimitStore {
  constructor(private readonly fallbackStore: RateLimitStore) {}

  async increment(key: string, options: RateLimitStoreOptions): Promise<RateLimitDecision> {
    const bucketKey = getBucketKey(options.scope, key);
    const now = Date.now();
    const resetAt = now + options.windowMs;

    try {
      await maybePruneExpiredDatabaseBuckets();

      const rows = await prisma.$queryRawUnsafe<RateLimitBucketRow[]>(
        `INSERT INTO rate_limit_buckets ("bucketKey", count, "windowStart", "expiresAt")
         VALUES ($1, 1, to_timestamp($2 / 1000.0), to_timestamp($3 / 1000.0))
         ON CONFLICT ("bucketKey") DO UPDATE
         SET count = CASE
             WHEN rate_limit_buckets."expiresAt" <= to_timestamp($2 / 1000.0) THEN 1
             ELSE rate_limit_buckets.count + 1
           END,
           "windowStart" = CASE
             WHEN rate_limit_buckets."expiresAt" <= to_timestamp($2 / 1000.0)
               THEN to_timestamp($2 / 1000.0)
             ELSE rate_limit_buckets."windowStart"
           END,
           "expiresAt" = CASE
             WHEN rate_limit_buckets."expiresAt" <= to_timestamp($2 / 1000.0)
               THEN to_timestamp($3 / 1000.0)
             ELSE rate_limit_buckets."expiresAt"
           END,
           "updatedAt" = NOW()
         RETURNING count,
           CAST(EXTRACT(EPOCH FROM "expiresAt") * 1000 AS bigint) AS "resetAtMs"`,
        bucketKey,
        now,
        resetAt,
      );

      const [row] = rows;

      if (!row) {
        throw new Error('Database rate-limit increment returned no rows');
      }

      const count = toNumber(row.count);
      const persistedResetAt = toNumber(row.resetAtMs);
      const allowed = count <= options.maxRequests;

      return {
        allowed,
        remaining: Math.max(0, options.maxRequests - count),
        resetAt: persistedResetAt,
        retryAfterSeconds: allowed
          ? undefined
          : Math.max(1, Math.ceil((persistedResetAt - now) / 1000)),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';

      if (shouldFailClosedForDatabaseLimiter()) {
        if (!hasLoggedDatabaseLimiterFailure) {
          hasLoggedDatabaseLimiterFailure = true;
          console.error(
            `Rejecting requests because the database-backed rate limiter is unavailable in production: ${message}`,
          );
        }

        throw new RateLimitStoreUnavailableError(
          'Rate limiting is temporarily unavailable because the shared limiter store cannot be reached',
        );
      }

      if (!hasLoggedDatabaseLimiterFallback) {
        hasLoggedDatabaseLimiterFallback = true;
        console.warn(
          `Falling back to in-memory rate limiting because the database-backed store is unavailable: ${message}`,
        );
      }

      return this.fallbackStore.increment(key, options);
    }
  }
}

const sharedMemoryRateLimitStore = new MemoryRateLimitStore();
const sharedDatabaseRateLimitStore = new DatabaseRateLimitStore(sharedMemoryRateLimitStore);

function createRateLimitStore(): RateLimitStore {
  return getRateLimitStoreMode() === 'database'
    ? sharedDatabaseRateLimitStore
    : sharedMemoryRateLimitStore;
}

function applyRateLimitHeaders(
  res: Response,
  limit: number,
  remaining: number,
  resetAt: number,
): void {
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining).toString());
  res.setHeader('X-RateLimit-Reset', new Date(resetAt).toISOString());
}

function buildScopedRateLimitMiddleware(options: ScopedRateLimitOptions): RequestHandler {
  if (!options.enabled) {
    return (_req, _res, next) => {
      next();
    };
  }

  const keyGenerator = options.keyGenerator ?? getClientId;
  const store = createRateLimitStore();

  return async (req, res, next) => {
    try {
      const decision = await store.increment(keyGenerator(req), {
        scope: options.scope,
        windowMs: options.windowMs,
        maxRequests: options.maxRequests,
      });

      applyRateLimitHeaders(res, options.maxRequests, decision.remaining, decision.resetAt);

      if (!decision.allowed) {
        res.setHeader('Retry-After', (decision.retryAfterSeconds ?? 1).toString());
        res.status(429).json({
          message: 'Too many requests, please try again later',
        });
        return;
      }

      next();
    } catch (error) {
      if (error instanceof RateLimitStoreUnavailableError) {
        res.status(503).json({ message: error.message });
        return;
      }

      next(error);
    }
  };
}

export function createEnvRateLimitMiddleware(options: EnvScopedRateLimitOptions): RequestHandler {
  const enabled = parseBoolean(
    options.enabledEnvVar ? process.env[options.enabledEnvVar] : process.env.RATE_LIMIT_ENABLED,
    true,
  );

  return buildScopedRateLimitMiddleware({
    enabled,
    scope: options.scope,
    windowMs: toPositiveInteger(process.env[options.windowMsEnvVar], options.defaultWindowMs),
    maxRequests: toPositiveInteger(
      process.env[options.maxRequestsEnvVar],
      options.defaultMaxRequests,
    ),
    keyGenerator: options.keyGenerator,
  });
}

// Creates in-memory rate-limit middleware for API routes.
export function createRateLimitMiddleware(
  bypassPaths: readonly string[] = ['/health', '/openapi.json', '/docs'],
): RequestHandler {
  const enabled = parseBoolean(process.env.RATE_LIMIT_ENABLED, true);
  const windowMs = toPositiveInteger(process.env.RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS);
  const maxRequests = toPositiveInteger(process.env.RATE_LIMIT_MAX_REQUESTS, DEFAULT_MAX_REQUESTS);

  const baseLimiter = buildScopedRateLimitMiddleware({
    enabled,
    scope: 'api-global',
    windowMs,
    maxRequests,
  });

  return (req, res, next) => {
    if (shouldBypassPath(req.path, bypassPaths)) {
      next();
      return;
    }

    baseLimiter(req, res, next);
  };
}
