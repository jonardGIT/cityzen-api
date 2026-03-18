import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import citizensRouter from './routes/citizens.js';
import respondersRouter from './routes/responders.js';
import statusesRouter from './routes/statuses.js';
import categoriesRouter from './routes/categories.js';
import severitiesRouter from './routes/severities.js';
import locationsRouter from './routes/locations.js';
import incidentsRouter from './routes/incidents.js';
import assignmentsRouter from './routes/assignments.js';
import usersRouter from './routes/users.js';
import { openApiDocument } from './docs/openapi.js';
import { createApiKeyAuthMiddleware } from './middleware/apiKeyAuth.js';
import { createRateLimitMiddleware } from './middleware/rateLimit.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

// Use dedicated env files per runtime mode (dev/prod).
const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenv.config({ path: envFile });

const app = express();
export const API_V1 = process.env.API_BASE_PATH ?? '/api/v1';
const isProduction = process.env.NODE_ENV === 'production';
const publicApiPaths = ['/health', '/openapi.json', '/docs'];
const corsOriginConfig = process.env.CORS_ORIGIN ?? '*';
const allowedCorsOrigins = corsOriginConfig
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

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
  })
);
// Log incoming HTTP requests in development-friendly format.
app.use(morgan(isProduction ? 'combined' : 'dev'));

// Parse JSON request bodies for API handlers.
app.use(express.json());

app.get(`${API_V1}/health`, (_req, res) => {
  res.json({ status: 'ok' });
});

// Enforce per-client request limits for versioned API routes.
app.use(API_V1, createRateLimitMiddleware(publicApiPaths));
// Require valid API keys on protected versioned API routes.
app.use(API_V1, createApiKeyAuthMiddleware(publicApiPaths));

if (!isProduction) {
  app.get(`${API_V1}/openapi.json`, (_req, res) => {
    res.json(openApiDocument);
  });

  // Serve interactive Swagger UI in non-production environments.
  app.use(`${API_V1}/docs`, swaggerUi.serve, swaggerUi.setup(openApiDocument));
}

// Mount citizens resource routes.
app.use(`${API_V1}/citizens`, citizensRouter);
// Mount responders resource routes.
app.use(`${API_V1}/responders`, respondersRouter);
// Mount statuses resource routes.
app.use(`${API_V1}/statuses`, statusesRouter);
// Mount categories resource routes.
app.use(`${API_V1}/categories`, categoriesRouter);
// Mount severities resource routes.
app.use(`${API_V1}/severities`, severitiesRouter);
// Mount locations resource routes.
app.use(`${API_V1}/locations`, locationsRouter);
// Mount incidents resource routes.
app.use(`${API_V1}/incidents`, incidentsRouter);
// Mount assignments resource routes.
app.use(`${API_V1}/assignments`, assignmentsRouter);
// Mount users resource routes.
app.use(`${API_V1}/users`, usersRouter);

// Return a 404 response for unmatched routes.
app.use(notFoundHandler);
// Centralize and format all uncaught request errors.
app.use(errorHandler);

export default app;
