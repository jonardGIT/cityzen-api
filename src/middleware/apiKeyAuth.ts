import type { Request, RequestHandler } from 'express';

const API_KEY_HEADER = 'x-api-key';

// Builds the accepted API key set from list and single-key env vars.
function getConfiguredApiKeys(): Set<string> {
  if (process.env.JEST_WORKER_ID && process.env.TEST_API_KEYS_ENABLED !== 'true') {
    return new Set();
  }

  const fromList = (process.env.API_KEYS ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);

  const fallbackKey = (process.env.API_KEY ?? '').trim();

  if (fallbackKey) {
    fromList.push(fallbackKey);
  }

  return new Set(fromList);
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

// Reads and trims the API key from the request header.
function getRequestApiKey(req: Request): string | undefined {
  const headerValue = req.header(API_KEY_HEADER);
  return headerValue?.trim();
}

// Creates API key middleware that protects routes unless no keys are configured.
export function createApiKeyAuthMiddleware(
  bypassPaths: readonly string[] = ['/health', '/openapi.json', '/docs'],
): RequestHandler {
  return (req, res, next) => {
    if (shouldBypassPath(req.path, bypassPaths)) {
      next();
      return;
    }

    const validKeys = getConfiguredApiKeys();

    if (validKeys.size === 0) {
      next();
      return;
    }

    const apiKey = getRequestApiKey(req);

    if (!apiKey || !validKeys.has(apiKey)) {
      res.status(401).json({
        message: 'Unauthorized: valid API key required',
      });
      return;
    }

    next();
  };
}
