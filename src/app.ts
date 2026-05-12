import './env.js';
import * as Sentry from '@sentry/node';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import citizensRouter from './routes/citizens.js';
import agenciesRouter from './routes/agencies.js';
import respondersRouter from './routes/responders.js';
import statusesRouter from './routes/statuses.js';
import categoriesRouter from './routes/categories.js';
import severitiesRouter from './routes/severities.js';
import incidentsRouter from './routes/incidents.js';
import casesRouter from './routes/cases.js';
import assignmentsRouter from './routes/assignments.js';
import usersRouter from './routes/users.js';
import auditLogsRouter from './routes/auditLogs.js';
import regionsRouter from './routes/regions.js';
import provincesRouter from './routes/provinces.js';
import citiesMunicipalitiesRouter from './routes/citiesMunicipalities.js';
import barangaysRouter from './routes/barangays.js';
import incidentEscalationsRouter from './routes/incidentEscalations.js';
import mutualAidRequestsRouter from './routes/mutualAidRequests.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import mobileRouter from './routes/mobile.js';
import mobileContentRouter from './routes/mobileContent.js';
import privacyRequestsRouter from './routes/privacyRequests.js';
import { loadRuntimeOpenApiDocument } from './docs/runtimeOpenapi.js';
import { getFeatureSelection } from './featureSelection.js';
import { createApiKeyAuthMiddleware } from './middleware/apiKeyAuth.js';
import { createRateLimitMiddleware } from './middleware/rateLimit.js';
import { auditLogMiddleware } from './middleware/auditLog.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { validateStartupEnvironment } from './utils/startupEnv.js';

function sanitizeLoggedUrl(url: string | undefined): string {
  if (!url) {
    return '/';
  }

  const [path, queryString] = url.split('?', 2);
  const sanitizedPath = path.replace(/(\/cases\/)([^/?#]+)/i, '$1[REDACTED]');

  if (!queryString) {
    return sanitizedPath;
  }

  const params = new URLSearchParams(queryString);
  if (params.has('caseToken')) {
    params.set('caseToken', '[REDACTED]');
  }

  const sanitizedQuery = params.toString();
  return sanitizedQuery ? `${sanitizedPath}?${sanitizedQuery}` : sanitizedPath;
}

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

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be configured`);
  }

  return value;
}

function requireJwtSecretForSelection(): void {
  if (featureSelection.tokenMode !== 'app-jwt') {
    return;
  }

  requireEnv('JWT_SECRET');
}

morgan.token('safe-url', (req) => {
  const request = req as express.Request;
  return sanitizeLoggedUrl(request.originalUrl || request.url);
});

const app = express();
export const API_V1 = process.env.API_BASE_PATH ?? '/api/v1';
const isProduction = process.env.NODE_ENV === 'production';
const runtimeOpenApiDocument = !isProduction ? loadRuntimeOpenApiDocument() : null;
const featureSelection = getFeatureSelection();
const apiKeyBypassPaths = ['/health', '/openapi.json', '/docs', '/auth', '/cases', '/mobile'];
const rateLimitBypassPaths = ['/health', '/openapi.json', '/docs', '/cases'];
const corsOriginConfig = process.env.CORS_ORIGIN ?? '*';
const allowedCorsOrigins = corsOriginConfig
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

export function validateAppStartup(): void {
  requireJwtSecretForSelection();
  validateStartupEnvironment({ env: process.env, selection: featureSelection });
}

app.set('trust proxy', parseBooleanEnv(process.env.TRUST_PROXY, false));

if (!isProduction) {
  app.disable('etag');
  // Disable response caching in development to avoid stale API reads.
  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
}

// Secure HTTP headers against common web vulnerabilities.
app.use(helmet());

// Enable cross-origin requests for API consumers.
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests and configured browser origins.
      if (!origin || allowedCorsOrigins.includes('*') || allowedCorsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
  }),
);
// Log incoming HTTP requests in development-friendly format.
app.use(
  morgan(
    isProduction
      ? ':remote-addr - :remote-user [:date[clf]] ":method :safe-url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
      : ':method :safe-url :status :response-time ms - :res[content-length]',
  ),
);

// Parse JSON request bodies for API handlers.
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT?.trim() || '12mb' }));
// Persist audit records for configured auth and mutating API operations.
app.use(API_V1, auditLogMiddleware);

app.get(`${API_V1}/health`, (_req, res) => {
  res.json({ status: 'ok' });
});

// Enforce per-client request limits for versioned API routes.
app.use(API_V1, createRateLimitMiddleware(rateLimitBypassPaths));
// Require valid API keys on protected versioned API routes.
app.use(API_V1, createApiKeyAuthMiddleware(apiKeyBypassPaths));

if (!isProduction && runtimeOpenApiDocument) {
  app.get(`${API_V1}/openapi.json`, (_req, res) => {
    res.json(runtimeOpenApiDocument);
  });

  // Serve interactive Swagger UI in non-production environments.
  app.use(`${API_V1}/docs`, swaggerUi.serve, swaggerUi.setup(runtimeOpenApiDocument));
}

// Mount citizens resource routes.
app.use(`${API_V1}/citizens`, citizensRouter);
// Mount agency resource routes.
app.use(`${API_V1}/agencies`, agenciesRouter);
// Mount responders resource routes.
app.use(`${API_V1}/responders`, respondersRouter);
// Mount statuses resource routes.
app.use(`${API_V1}/statuses`, statusesRouter);
// Mount categories resource routes.
app.use(`${API_V1}/categories`, categoriesRouter);
// Mount severities resource routes.
app.use(`${API_V1}/severities`, severitiesRouter);
// Mount incidents resource routes.
app.use(`${API_V1}/incidents`, incidentsRouter);
// Mount public case token lookup routes.
app.use(`${API_V1}/cases`, casesRouter);
// Mount assignments resource routes.
app.use(`${API_V1}/assignments`, assignmentsRouter);
// Mount users resource routes.
app.use(`${API_V1}/users`, usersRouter);
// Mount audit log read routes.
app.use(`${API_V1}/audit-logs`, auditLogsRouter);
// Mount geographic hierarchy routes.
app.use(`${API_V1}/regions`, regionsRouter);
app.use(`${API_V1}/provinces`, provincesRouter);
app.use(`${API_V1}/cities-municipalities`, citiesMunicipalitiesRouter);
app.use(`${API_V1}/barangays`, barangaysRouter);
// Mount cross-jurisdiction routes.
app.use(`${API_V1}/incident-escalations`, incidentEscalationsRouter);
app.use(`${API_V1}/mutual-aid-requests`, mutualAidRequestsRouter);
// Mount auth endpoints (JWT login/me).
app.use(`${API_V1}/auth`, authRouter);
// Mount authenticated data-subject request endpoints.
app.use(`${API_V1}/privacy-requests`, privacyRequestsRouter);
// Mount admin endpoints (JWT + role-protected).
app.use(`${API_V1}/admin`, adminRouter);
// Mount first-party mobile app routes.
app.use(`${API_V1}/mobile`, mobileRouter);
// Mount mobile content admin CRUD routes.
app.use(`${API_V1}/mobile-content`, mobileContentRouter);

if (Sentry.isEnabled()) {
  Sentry.setupExpressErrorHandler(app);
}

// Return a 404 response for unmatched routes.
app.use(notFoundHandler);
// Centralize and format all uncaught request errors.
app.use(errorHandler);

export default app;
