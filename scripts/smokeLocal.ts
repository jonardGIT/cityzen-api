import dotenv from 'dotenv';
import request from 'supertest';

dotenv.config({ path: '.env.development' });

delete process.env.CIRS_BUNDLE_FEATURE_LOCKED;
delete process.env.CIRS_BUNDLE_FEATURE_PROFILE_NAME;
delete process.env.CIRS_BUNDLE_FEATURE_AUTH_PROVIDER;
delete process.env.CIRS_BUNDLE_FEATURE_TOKEN_MODE;
delete process.env.CIRS_BUNDLE_FEATURE_MFA_MODE;
delete process.env.CIRS_BUNDLE_FEATURE_MEDIA_STORAGE;
delete process.env.CIRS_BUNDLE_FEATURE_RECORD_DELETION;

process.env.FEATURE_PROFILE_NAME = 'local-smoke';
process.env.FEATURE_AUTH_PROVIDER = 'local';
process.env.FEATURE_TOKEN_MODE = 'app-jwt';
process.env.FEATURE_MFA_MODE = 'local-totp';
process.env.FEATURE_MEDIA_STORAGE = 'disabled';
process.env.FEATURE_RECORD_DELETION = 'archive';

const { default: app, API_V1 } = await import('../src/app.js');

type LoginSummary = {
  status: number | null;
  ok: boolean;
  hasToken: boolean;
  bodySummary: string | null;
  error?: string;
};

type EndpointSummary = {
  path: string;
  status: number | null;
  ok: boolean;
  bodySummary: string | null;
  error?: string;
};

type SmokeSummary = {
  login: LoginSummary;
  protectedChecks: EndpointSummary[];
  skippedChecks: string[];
  ok: boolean;
};

const email = process.env.LOCAL_SMOKE_EMAIL?.trim() || 'admin@xypes.local';
const password = process.env.LOCAL_SMOKE_PASSWORD?.trim() || 'Password123!';
const apiKey = process.env.LOCAL_SMOKE_API_KEY?.trim() || 'local-dev-key';

function summarizeBody(body: unknown): string | null {
  if (body == null) {
    return null;
  }

  if (Array.isArray(body)) {
    return JSON.stringify({
      type: 'array',
      length: body.length,
      sampleKeys:
        body.length > 0 && body[0] && typeof body[0] === 'object'
          ? Object.keys(body[0] as Record<string, unknown>).slice(0, 8)
          : [],
    });
  }

  if (typeof body === 'object') {
    const record = body as Record<string, unknown>;

    return JSON.stringify({
      type: 'object',
      keys: Object.keys(record).slice(0, 12),
      count:
        typeof record.count === 'number'
          ? record.count
          : typeof record.total === 'number'
            ? record.total
            : undefined,
      hasData: Object.prototype.hasOwnProperty.call(record, 'data'),
      hasItems: Object.prototype.hasOwnProperty.call(record, 'items'),
      hasResults: Object.prototype.hasOwnProperty.call(record, 'results'),
      message: typeof record.message === 'string' ? record.message : undefined,
    });
  }

  return String(body).replace(/\s+/g, ' ').slice(0, 220);
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.replace(/\s+/g, ' ').slice(0, 220);
  }

  return String(error);
}

async function main() {
  const summary: SmokeSummary = {
    login: {
      status: null,
      ok: false,
      hasToken: false,
      bodySummary: null,
    },
    protectedChecks: [],
    skippedChecks: [
      'Dashboard-side unauthenticated frontend probes skipped because this API repo does not own those routes.',
    ],
    ok: false,
  };

  try {
    const loginResponse = await request(app)
      .post(`${API_V1}/auth/login`)
      .set('Content-Type', 'application/json')
      .set('x-api-key', apiKey)
      .send({ email, password });

    const token = typeof loginResponse.body?.token === 'string' ? loginResponse.body.token : null;

    summary.login = {
      status: loginResponse.status,
      ok: loginResponse.status === 200 && Boolean(token),
      hasToken: Boolean(token),
      bodySummary: summarizeBody(loginResponse.body),
    };

    if (!summary.login.ok || !token) {
      console.log(JSON.stringify(summary, null, 2));
      process.exitCode = 1;
      return;
    }

    const protectedPaths = ['/users', '/mobile-content', '/audit-logs'];

    for (const path of protectedPaths) {
      try {
        const response = await request(app)
          .get(`${API_V1}${path}`)
          .set('Authorization', `Bearer ${token}`)
          .set('x-api-key', apiKey);

        summary.protectedChecks.push({
          path: `${API_V1}${path}`,
          status: response.status,
          ok: response.status >= 200 && response.status < 300,
          bodySummary: summarizeBody(response.body ?? response.text),
        });
      } catch (error) {
        summary.protectedChecks.push({
          path: `${API_V1}${path}`,
          status: null,
          ok: false,
          bodySummary: null,
          error: normalizeError(error),
        });
      }
    }

    summary.ok = summary.login.ok && summary.protectedChecks.every((check) => check.ok);
    console.log(JSON.stringify(summary, null, 2));

    if (!summary.ok) {
      process.exitCode = 1;
    }
  } catch (error) {
    summary.login.error = normalizeError(error);
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(normalizeError(error));
  process.exitCode = 1;
});
