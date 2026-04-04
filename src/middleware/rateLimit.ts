import type { Request, RequestHandler } from 'express';

type ClientWindow = {
  count: number;
  windowStart: number;
};

type RateLimitKeyGenerator = (req: Request) => string;

type ScopedRateLimitOptions = {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
  keyGenerator?: RateLimitKeyGenerator;
};

type EnvScopedRateLimitOptions = {
  enabledEnvVar?: string;
  windowMsEnvVar: string;
  maxRequestsEnvVar: string;
  defaultWindowMs: number;
  defaultMaxRequests: number;
  keyGenerator?: RateLimitKeyGenerator;
};

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 100;

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
    return normalizedPath === normalizedCandidate || normalizedPath.startsWith(`${normalizedCandidate}/`);
  });
}

// Derives a stable client identifier used for per-client rate tracking.
function getClientId(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function applyRateLimitHeaders(
  res: Request['res'] extends infer _T ? any : never,
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

  const clients = new Map<string, ClientWindow>();
  const keyGenerator = options.keyGenerator ?? getClientId;

  return (req, res, next) => {
    const now = Date.now();
    const clientId = keyGenerator(req);
    const existing = clients.get(clientId);

    if (!existing || now - existing.windowStart >= options.windowMs) {
      clients.set(clientId, { count: 1, windowStart: now });
      applyRateLimitHeaders(res, options.maxRequests, options.maxRequests - 1, now + options.windowMs);
      next();
      return;
    }

    if (existing.count >= options.maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((options.windowMs - (now - existing.windowStart)) / 1000),
      );

      applyRateLimitHeaders(
        res,
        options.maxRequests,
        0,
        existing.windowStart + options.windowMs,
      );
      res.setHeader('Retry-After', retryAfterSeconds.toString());
      res.status(429).json({
        message: 'Too many requests, please try again later',
      });
      return;
    }

    existing.count += 1;
    clients.set(clientId, existing);
    applyRateLimitHeaders(
      res,
      options.maxRequests,
      options.maxRequests - existing.count,
      existing.windowStart + options.windowMs,
    );

    next();
  };
}

export function createEnvRateLimitMiddleware(options: EnvScopedRateLimitOptions): RequestHandler {
  const enabled = parseBoolean(
    options.enabledEnvVar ? process.env[options.enabledEnvVar] : process.env.RATE_LIMIT_ENABLED,
    true,
  );

  return buildScopedRateLimitMiddleware({
    enabled,
    windowMs: toPositiveInteger(process.env[options.windowMsEnvVar], options.defaultWindowMs),
    maxRequests: toPositiveInteger(process.env[options.maxRequestsEnvVar], options.defaultMaxRequests),
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
