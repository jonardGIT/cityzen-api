/// <reference types="node" />

import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

type SmokeCheck = {
  name: string;
  ok: boolean;
  status: number | null;
  summary: string | null;
  skipped?: boolean;
  error?: string;
};

type SmokeSummary = {
  baseUrl: string;
  apiBasePath: string;
  startedAt: string;
  finishedAt?: string;
  checks: SmokeCheck[];
  ok: boolean;
};

type AuthPayload = {
  token?: string;
  refreshToken?: string;
  sessionId?: string;
};

type RequestOptions = {
  authToken?: string;
  body?: unknown;
  expectedStatuses?: number[];
  includeApiKey?: boolean;
  retryStatuses?: number[];
  retryCount?: number;
  retryDelayMs?: number;
};

const HELP_TEXT = `
Usage: npm run smoke:remote

Environment:
  SMOKE_BASE_URL           Required base origin, e.g. https://api.example.gov
  SMOKE_API_BASE_PATH      Optional API prefix, defaults to /api/v1
  SMOKE_API_KEY            Optional x-api-key value for protected routes
  SMOKE_ADMIN_EMAIL        Prompted in an interactive terminal when omitted
  SMOKE_ADMIN_PASSWORD     Prompted in an interactive terminal when omitted
  SMOKE_ADMIN_MFA_CODE     Optional MFA code for admin login when the account requires TOTP
  SMOKE_CITIZEN_EMAIL      Optional citizen reporter login for mobile checks
  SMOKE_CITIZEN_PASSWORD   Optional citizen reporter password for mobile checks
  SMOKE_CITIZEN_MFA_CODE   Optional MFA code for citizen login when the account requires TOTP
  SMOKE_CASE_TOKEN         Optional public case token for /cases/{token} check

When the terminal is interactive, the script can prompt for MFA after the login step instead of requiring the code up front.

This script is a black-box smoke test for a running deployment. It never imports the app.
`.trim();

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(HELP_TEXT);
  process.exit(0);
}

const baseUrl = process.env.SMOKE_BASE_URL?.trim();
const apiBasePath = process.env.SMOKE_API_BASE_PATH?.trim() || '/api/v1';
const apiKey =
  process.env.SMOKE_API_KEY?.trim() ||
  process.env.API_KEYS?.split(',')
    .map((value) => value.trim())
    .find(Boolean) ||
  process.env.API_KEY?.trim();
const adminEmail = process.env.SMOKE_ADMIN_EMAIL?.trim();
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD?.trim();
const adminMfaCode = process.env.SMOKE_ADMIN_MFA_CODE?.trim();
const citizenEmail = process.env.SMOKE_CITIZEN_EMAIL?.trim();
const citizenPassword = process.env.SMOKE_CITIZEN_PASSWORD?.trim();
const citizenMfaCode = process.env.SMOKE_CITIZEN_MFA_CODE?.trim();
const caseToken = process.env.SMOKE_CASE_TOKEN?.trim();

if (!baseUrl) {
  console.error('SMOKE_BASE_URL must be configured');
  process.exit(1);
}

if ((!adminEmail || !adminPassword) && !canPromptForInput()) {
  console.error(
    'SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD must be configured unless the script is run in an interactive terminal',
  );
  process.exit(1);
}

const requiredBaseUrl = baseUrl;
let requiredAdminEmail = adminEmail;
let requiredAdminPassword = adminPassword;

function buildUrl(path: string): string {
  const normalizedBaseUrl = requiredBaseUrl.endsWith('/')
    ? requiredBaseUrl.slice(0, -1)
    : requiredBaseUrl;
  const normalizedApiBasePath = apiBasePath.startsWith('/') ? apiBasePath : `/${apiBasePath}`;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBaseUrl}${normalizedApiBasePath}${normalizedPath}`;
}

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
      message: typeof record.message === 'string' ? record.message : undefined,
      count:
        typeof record.count === 'number'
          ? record.count
          : typeof record.total === 'number'
            ? record.total
            : undefined,
      hasData: Object.prototype.hasOwnProperty.call(record, 'data'),
      hasItems: Object.prototype.hasOwnProperty.call(record, 'items'),
      hasResults: Object.prototype.hasOwnProperty.call(record, 'results'),
    });
  }

  return String(body).replace(/\s+/g, ' ').slice(0, 220);
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.replace(/\s+/g, ' ').slice(0, 220);
  }

  return String(error).replace(/\s+/g, ' ').slice(0, 220);
}

async function requestJson(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
): Promise<{ status: number; body: unknown }> {
  const expectedStatuses = options.expectedStatuses ?? [200];
  const retryStatuses = options.retryStatuses ?? [];
  const retryCount = options.retryCount ?? 0;
  const retryDelayMs = options.retryDelayMs ?? 400;

  for (let attempt = 0; ; attempt += 1) {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (options.authToken) {
      headers.Authorization = `Bearer ${options.authToken}`;
    }

    if (options.includeApiKey !== false && apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await fetch(buildUrl(path), {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const responseText = await response.text();
    let parsedBody: unknown = responseText;

    if (responseText) {
      try {
        parsedBody = JSON.parse(responseText);
      } catch {
        parsedBody = responseText;
      }
    }

    if (expectedStatuses.includes(response.status)) {
      return { status: response.status, body: parsedBody };
    }

    const shouldRetry = attempt < retryCount && retryStatuses.includes(response.status);

    if (!shouldRetry) {
      throw new Error(
        `${method} ${path} returned ${response.status}; expected ${expectedStatuses.join(', ')}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
}

function addCheck(summary: SmokeSummary, check: SmokeCheck): void {
  summary.checks.push(check);
}

async function runCheck(
  summary: SmokeSummary,
  name: string,
  runner: () => Promise<{ status: number; body: unknown }>,
): Promise<{ status: number; body: unknown } | null> {
  try {
    const result = await runner();
    addCheck(summary, {
      name,
      ok: true,
      status: result.status,
      summary: summarizeBody(result.body),
    });
    return result;
  } catch (error) {
    addCheck(summary, {
      name,
      ok: false,
      status: null,
      summary: null,
      error: normalizeError(error),
    });
    return null;
  }
}

function addSkippedCheck(summary: SmokeSummary, name: string, reason: string): void {
  addCheck(summary, {
    name,
    ok: true,
    skipped: true,
    status: null,
    summary: reason,
  });
}

function canPromptForInput(): boolean {
  return Boolean(input.isTTY && output.isTTY);
}

async function promptForMfaCode(name: string): Promise<string | undefined> {
  if (!canPromptForInput()) {
    return undefined;
  }

  const prompt = createInterface({ input, output });

  try {
    const answer = await prompt.question(`${name}: enter current MFA code: `);
    const trimmedAnswer = answer.trim();
    return trimmedAnswer || undefined;
  } finally {
    prompt.close();
  }
}

async function promptForRequiredValue(label: string, currentValue?: string): Promise<string> {
  if (currentValue?.trim()) {
    return currentValue.trim();
  }

  if (!canPromptForInput()) {
    throw new Error(`${label} must be configured`);
  }

  const prompt = createInterface({ input, output });

  try {
    const answer = await prompt.question(`${label}: `);
    const trimmedAnswer = answer.trim();

    if (!trimmedAnswer) {
      throw new Error(`${label} is required`);
    }

    return trimmedAnswer;
  } finally {
    prompt.close();
  }
}

function isMfaChallenge(status: number, body: unknown): boolean {
  if (![401, 422].includes(status) || !body || typeof body !== 'object') {
    return false;
  }

  const record = body as Record<string, unknown>;
  const message = typeof record.message === 'string' ? record.message.toLowerCase() : '';

  return (
    record.mfaRequired === true || message.includes('mfa') || message.includes('totp')
  );
}

async function requestLogin(
  email: string,
  password: string,
  mfaCode?: string,
): Promise<{ status: number; body: unknown }> {
  return requestJson('POST', '/auth/login', {
    body: {
      email,
      password,
      ...(mfaCode ? { mfaCode } : {}),
    },
    expectedStatuses: [200, 401, 422],
  });
}

async function loginUser(
  summary: SmokeSummary,
  name: string,
  email: string,
  password: string,
  mfaCode?: string,
): Promise<AuthPayload | null> {
  const resolvedEmail = await promptForRequiredValue(`${name} email`, email);
  const resolvedPassword = await promptForRequiredValue(`${name} password`, password);
  let effectiveMfaCode = mfaCode;
  let result = await runCheck(summary, name, () =>
    requestLogin(resolvedEmail, resolvedPassword, effectiveMfaCode),
  );

  if (!result) {
    return null;
  }

  const maybeErrorBody =
    result.body && typeof result.body === 'object'
      ? (result.body as Record<string, unknown>)
      : null;

  if (isMfaChallenge(result.status, result.body) && !effectiveMfaCode && canPromptForInput()) {
    const promptedMfaCode = await promptForMfaCode(name);

    if (!promptedMfaCode) {
      addCheck(summary, {
        name: `${name} auth requirement`,
        ok: false,
        status: result.status,
        summary: summarizeBody(result.body),
        error: 'MFA code required but no code was entered.',
      });
      return null;
    }

    effectiveMfaCode = promptedMfaCode;
    result = await runCheck(summary, `${name} with MFA`, () =>
      requestLogin(resolvedEmail, resolvedPassword, effectiveMfaCode),
    );

    if (!result) {
      return null;
    }
  }

  const maybeError =
    result.body && typeof result.body === 'object'
      ? (result.body as Record<string, unknown>)
      : null;

  if (result.status === 422) {
    addCheck(summary, {
      name: `${name} validation`,
      ok: false,
      status: result.status,
      summary: summarizeBody(result.body),
      error:
        typeof maybeError?.message === 'string' ? maybeError.message : 'Login validation failed.',
    });
    return null;
  }

  if (result.status === 401) {
    addCheck(summary, {
      name: `${name} auth requirement`,
      ok: false,
      status: result.status,
      summary: summarizeBody(result.body),
      error:
        isMfaChallenge(result.status, result.body) && !effectiveMfaCode
          ? 'MFA code required. Set the matching SMOKE_*_MFA_CODE env var, enter one when prompted, or use a non-MFA smoke account.'
          : 'Login failed.',
    });
    return null;
  }

  if (typeof result.body !== 'object' || !result.body) {
    return null;
  }

  const body = result.body as Record<string, unknown>;
  const token = typeof body.token === 'string' ? body.token : undefined;
  const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : undefined;
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : undefined;

  if (!token) {
    addCheck(summary, {
      name: `${name} token presence`,
      ok: false,
      status: result.status,
      summary: summarizeBody(body),
      error: 'Login response did not include token',
    });
    return null;
  }

  addCheck(summary, {
    name: `${name} token presence`,
    ok: true,
    status: result.status,
    summary: JSON.stringify({
      hasToken: true,
      hasRefreshToken: Boolean(refreshToken),
      hasSessionId: Boolean(sessionId),
    }),
  });

  return { token, refreshToken, sessionId };
}

async function main(): Promise<void> {
  requiredAdminEmail = await promptForRequiredValue('admin login email', requiredAdminEmail);
  requiredAdminPassword = await promptForRequiredValue(
    'admin login password',
    requiredAdminPassword,
  );

  const summary: SmokeSummary = {
    baseUrl: requiredBaseUrl,
    apiBasePath,
    startedAt: new Date().toISOString(),
    checks: [],
    ok: false,
  };

  await runCheck(summary, 'health', () =>
    requestJson('GET', '/health', {
      expectedStatuses: [200],
    }),
  );

  await runCheck(summary, 'public mobile content', () =>
    requestJson('GET', '/mobile/content', {
      expectedStatuses: [200],
      retryStatuses: [503],
      retryCount: 1,
    }),
  );

  if (caseToken) {
    await runCheck(summary, 'public case lookup', () =>
      requestJson('GET', `/cases/${caseToken}`, {
        expectedStatuses: [200],
      }),
    );
  } else {
    addSkippedCheck(
      summary,
      'public case lookup',
      'Set SMOKE_CASE_TOKEN to verify /cases/{token}.',
    );
  }

  const adminAuth = await loginUser(
    summary,
    'admin login',
    requiredAdminEmail,
    requiredAdminPassword,
    adminMfaCode,
  );

  if (adminAuth?.token) {
    await runCheck(summary, 'auth me', () =>
      requestJson('GET', '/auth/me', {
        authToken: adminAuth.token,
        expectedStatuses: [200],
      }),
    );

    await runCheck(summary, 'users capabilities', () =>
      requestJson('GET', '/users/capabilities', {
        authToken: adminAuth.token,
        expectedStatuses: [200],
      }),
    );

    await runCheck(summary, 'users list', () =>
      requestJson('GET', '/users', {
        authToken: adminAuth.token,
        expectedStatuses: [200],
      }),
    );

    await runCheck(summary, 'admin access review', () =>
      requestJson('GET', '/admin/users/access-review', {
        authToken: adminAuth.token,
        expectedStatuses: [200],
      }),
    );

    await runCheck(summary, 'admin mfa compliance', () =>
      requestJson('GET', '/admin/users/mfa-compliance', {
        authToken: adminAuth.token,
        expectedStatuses: [200],
      }),
    );

    await runCheck(summary, 'admin data governance', () =>
      requestJson('GET', '/admin/security/data-governance', {
        authToken: adminAuth.token,
        expectedStatuses: [200],
      }),
    );

    await runCheck(summary, 'audit logs list', () =>
      requestJson('GET', '/audit-logs', {
        authToken: adminAuth.token,
        expectedStatuses: [200],
      }),
    );

    await runCheck(summary, 'session inventory', () =>
      requestJson('GET', '/auth/sessions', {
        authToken: adminAuth.token,
        expectedStatuses: [200, 404],
      }),
    );

    let activeToken = adminAuth.token;
    let activeRefreshToken = adminAuth.refreshToken;

    if (activeRefreshToken) {
      const refreshResult = await runCheck(summary, 'refresh token rotation', () =>
        requestJson('POST', '/auth/refresh', {
          body: { refreshToken: activeRefreshToken },
          expectedStatuses: [200],
        }),
      );

      if (refreshResult && typeof refreshResult.body === 'object' && refreshResult.body) {
        const refreshBody = refreshResult.body as Record<string, unknown>;
        activeToken = typeof refreshBody.token === 'string' ? refreshBody.token : activeToken;
        activeRefreshToken =
          typeof refreshBody.refreshToken === 'string'
            ? refreshBody.refreshToken
            : activeRefreshToken;
      }
    } else {
      addSkippedCheck(
        summary,
        'refresh token rotation',
        'Login response did not include refreshToken for this feature profile.',
      );
    }

    await runCheck(summary, 'logout current session', () =>
      requestJson('POST', '/auth/logout', {
        authToken: activeToken,
        expectedStatuses: [204],
      }),
    );

    await runCheck(summary, 'post logout auth rejection', () =>
      requestJson('GET', '/auth/me', {
        authToken: activeToken,
        expectedStatuses: [401],
      }),
    );

    if (activeRefreshToken) {
      await runCheck(summary, 'post logout refresh rejection', () =>
        requestJson('POST', '/auth/refresh', {
          body: { refreshToken: activeRefreshToken },
          expectedStatuses: [401],
        }),
      );
    }
  }

  if (citizenEmail && citizenPassword) {
    const citizenAuth = await loginUser(
      summary,
      'citizen login',
      citizenEmail,
      citizenPassword,
      citizenMfaCode,
    );
    if (citizenAuth?.token) {
      await runCheck(summary, 'mobile profile', () =>
        requestJson('GET', '/mobile/profile', {
          authToken: citizenAuth.token,
          expectedStatuses: [200, 404],
        }),
      );

      await runCheck(summary, 'mobile incidents list', () =>
        requestJson('GET', '/mobile/incidents', {
          authToken: citizenAuth.token,
          expectedStatuses: [200],
        }),
      );
    }
  } else {
    addSkippedCheck(
      summary,
      'citizen mobile checks',
      'Set SMOKE_CITIZEN_EMAIL and SMOKE_CITIZEN_PASSWORD to verify mobile profile and incident endpoints.',
    );
  }

  summary.finishedAt = new Date().toISOString();
  summary.ok = summary.checks.every((check) => check.ok);
  console.log(JSON.stringify(summary, null, 2));

  if (!summary.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(normalizeError(error));
  process.exitCode = 1;
});
