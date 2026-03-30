import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import citizensRouter from './routes/citizens.js';
import agenciesRouter from './routes/agencies.js';
import respondersRouter from './routes/responders.js';
import statusesRouter from './routes/statuses.js';
import categoriesRouter from './routes/categories.js';
import severitiesRouter from './routes/severities.js';
import incidentsRouter from './routes/incidents.js';
import assignmentsRouter from './routes/assignments.js';
import usersRouter from './routes/users.js';
import auditLogsRouter from './routes/auditLogs.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import { openApiDocument } from './docs/openapi.js';
import { createApiKeyAuthMiddleware } from './middleware/apiKeyAuth.js';
import { createRateLimitMiddleware } from './middleware/rateLimit.js';
import { auditLogMiddleware } from './middleware/auditLog.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

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

// Use dedicated env files per runtime mode so test runs are isolated from local dev settings.
const envFile =
  process.env.NODE_ENV === 'production'
    ? '.env'
    : process.env.NODE_ENV === 'test'
      ? '.env.test'
      : '.env.development';
dotenv.config({ path: envFile });

const app = express();
export const API_V1 = process.env.API_BASE_PATH ?? '/api/v1';
const isProduction = process.env.NODE_ENV === 'production';
const apiKeyBypassPaths = ['/health', '/openapi.json', '/docs', '/auth'];
const rateLimitBypassPaths = ['/health', '/openapi.json', '/docs'];
const corsOriginConfig = process.env.CORS_ORIGIN ?? '*';
const allowedCorsOrigins = corsOriginConfig
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

requireEnv('JWT_SECRET');
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
app.use(morgan(isProduction ? 'combined' : 'dev'));

// Parse JSON request bodies for API handlers.
app.use(express.json());
// Persist audit records for configured auth and mutating API operations.
app.use(API_V1, auditLogMiddleware);

app.get(`${API_V1}/health`, (_req, res) => {
  res.json({ status: 'ok' });
});

// Enforce per-client request limits for versioned API routes.
app.use(API_V1, createRateLimitMiddleware(rateLimitBypassPaths));
// Require valid API keys on protected versioned API routes.
app.use(API_V1, createApiKeyAuthMiddleware(apiKeyBypassPaths));

if (!isProduction) {
  app.get(`${API_V1}/openapi.json`, (_req, res) => {
    res.json(openApiDocument);
  });

  // Serve interactive Swagger UI in non-production environments.
  app.use(`${API_V1}/docs`, swaggerUi.serve, swaggerUi.setup(openApiDocument));
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
// Mount assignments resource routes.
app.use(`${API_V1}/assignments`, assignmentsRouter);
// Mount users resource routes.
app.use(`${API_V1}/users`, usersRouter);
// Mount audit log read routes.
app.use(`${API_V1}/audit-logs`, auditLogsRouter);
// Mount auth endpoints (JWT login/me).
app.use(`${API_V1}/auth`, authRouter);
// Mount admin endpoints (JWT + role-protected).
app.use(`${API_V1}/admin`, adminRouter);

// Return a 404 response for unmatched routes.
app.use(notFoundHandler);
// Centralize and format all uncaught request errors.
app.use(errorHandler);

export default app;
