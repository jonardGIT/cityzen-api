import * as Sentry from '@sentry/node';
import './env.js';

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
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

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const dsn = process.env.SENTRY_DSN?.trim();

export const isSentryEnabled = Boolean(dsn) && process.env.NODE_ENV !== 'test';

if (isSentryEnabled) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT?.trim() || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE?.trim() || undefined,
    sendDefaultPii: parseBooleanEnv(process.env.SENTRY_SEND_DEFAULT_PII, false),
    tracesSampleRate: parseOptionalNumber(process.env.SENTRY_TRACES_SAMPLE_RATE),
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
      Sentry.prismaIntegration(),
    ],
  });
}
