type SessionStatus = 'active' | 'expired' | 'revoked';

interface SessionMetadata {
  browserFamily: string | null;
  osFamily: string | null;
  deviceLabel: string | null;
}

function detectBrowserFamily(userAgent: string): string | null {
  const checks: Array<[RegExp, string]> = [
    [/edg(e|ios|a)?\//i, 'Microsoft Edge'],
    [/opr\//i, 'Opera'],
    [/chrome\//i, 'Chrome'],
    [/firefox\//i, 'Firefox'],
    [/version\/.*safari\//i, 'Safari'],
    [/postmanruntime/i, 'Postman'],
    [/insomnia/i, 'Insomnia'],
    [/node-superagent/i, 'Superagent'],
    [/undici/i, 'Node.js'],
    [/curl\//i, 'curl'],
  ];

  for (const [pattern, label] of checks) {
    if (pattern.test(userAgent)) {
      return label;
    }
  }

  return null;
}

function detectOsFamily(userAgent: string): string | null {
  const checks: Array<[RegExp, string]> = [
    [/iphone|ipad|ipod/i, 'iOS'],
    [/android/i, 'Android'],
    [/windows nt/i, 'Windows'],
    [/mac os x|macintosh/i, 'macOS'],
    [/cros/i, 'ChromeOS'],
    [/linux/i, 'Linux'],
  ];

  for (const [pattern, label] of checks) {
    if (pattern.test(userAgent)) {
      return label;
    }
  }

  return null;
}

export function getSessionMetadata(userAgent: string | null | undefined): SessionMetadata {
  const normalizedUserAgent = userAgent?.trim();
  if (!normalizedUserAgent) {
    return {
      browserFamily: null,
      osFamily: null,
      deviceLabel: null,
    };
  }

  const browserFamily = detectBrowserFamily(normalizedUserAgent);
  const osFamily = detectOsFamily(normalizedUserAgent);
  const deviceLabel =
    browserFamily && osFamily
      ? `${browserFamily} on ${osFamily}`
      : (browserFamily ?? osFamily ?? 'Unknown device');

  return {
    browserFamily,
    osFamily,
    deviceLabel,
  };
}

export function getAuthSessionStatus(input: {
  revokedAt: string | Date | null;
  refreshExpiresAt: string | Date;
  now?: Date;
}): SessionStatus {
  if (input.revokedAt) {
    return 'revoked';
  }

  const refreshExpiresAt =
    input.refreshExpiresAt instanceof Date
      ? input.refreshExpiresAt
      : new Date(input.refreshExpiresAt);

  return refreshExpiresAt.getTime() > (input.now ?? new Date()).getTime() ? 'active' : 'expired';
}

export type { SessionStatus, SessionMetadata };
