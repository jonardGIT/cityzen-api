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
import { openApiDocument } from './docs/openapi.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

// Use dedicated env files per runtime mode (dev/prod).
const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenv.config({ path: envFile });

const app = express();
export const API_V1 = process.env.API_BASE_PATH ?? '/api/v1';
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  app.disable('etag');
  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
}

// Secure HTTP headers against common web vulnerabilities.
app.use(helmet());

// Enable cross-origin requests for API consumers.
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
// Log incoming HTTP requests in development-friendly format.
app.use(morgan(isProduction ? 'combined' : 'dev'));

app.use(express.json());

app.get(`${API_V1}/health`, (_req, res) => {
  res.json({ status: 'ok' });
});

if (!isProduction) {
  app.get(`${API_V1}/openapi.json`, (_req, res) => {
    res.json(openApiDocument);
  });

  app.use(`${API_V1}/docs`, swaggerUi.serve, swaggerUi.setup(openApiDocument));
}

app.use(`${API_V1}/citizens`, citizensRouter);
app.use(`${API_V1}/responders`, respondersRouter);
app.use(`${API_V1}/statuses`, statusesRouter);
app.use(`${API_V1}/categories`, categoriesRouter);
app.use(`${API_V1}/severities`, severitiesRouter);
app.use(`${API_V1}/locations`, locationsRouter);
app.use(`${API_V1}/incidents`, incidentsRouter);
app.use(`${API_V1}/assignments`, assignmentsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
