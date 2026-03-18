import type { Request, RequestHandler } from 'express';

type ClientWindow = {
  count: number;
  windowStart: number;
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

// Creates in-memory rate-limit middleware for API routes.
export function createRateLimitMiddleware(
  bypassPaths: readonly string[] = ['/health', '/openapi.json', '/docs'],
): RequestHandler {
  const enabled = parseBoolean(process.env.RATE_LIMIT_ENABLED, true);

  if (!enabled) {
    return (_req, _res, next) => {
      next();
    };
  }

  const windowMs = toPositiveInteger(process.env.RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS);
  const maxRequests = toPositiveInteger(process.env.RATE_LIMIT_MAX_REQUESTS, DEFAULT_MAX_REQUESTS);
  const clients = new Map<string, ClientWindow>();

  return (req, res, next) => {
    if (shouldBypassPath(req.path, bypassPaths)) {
      next();
      return;
    }

    const now = Date.now();
    const clientId = getClientId(req);
    const existing = clients.get(clientId);

    if (!existing || now - existing.windowStart >= windowMs) {
      clients.set(clientId, { count: 1, windowStart: now });
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - 1).toString());
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
      next();
      return;
    }

    if (existing.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - existing.windowStart)) / 1000));
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(existing.windowStart + windowMs).toISOString());
      res.setHeader('Retry-After', retryAfterSeconds.toString());
      res.status(429).json({
        message: 'Too many requests, please try again later',
      });
      return;
    }

    existing.count += 1;
    clients.set(clientId, existing);

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (maxRequests - existing.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(existing.windowStart + windowMs).toISOString());

    next();
  };
}
