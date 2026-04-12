import { Router } from 'express';
import { getPublicCaseByToken } from '../controllers/incidentsController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createEnvRateLimitMiddleware } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { caseTokenParamValidator } from '../validators/incidentTrustValidators.js';

const router = Router();

const publicCaseLookupRateLimit = createEnvRateLimitMiddleware({
  scope: 'public-case-lookup',
  windowMsEnvVar: 'PUBLIC_CASE_LOOKUP_RATE_LIMIT_WINDOW_MS',
  maxRequestsEnvVar: 'PUBLIC_CASE_LOOKUP_RATE_LIMIT_MAX_REQUESTS',
  defaultWindowMs: 600_000,
  defaultMaxRequests: 20,
});

router.get(
  '/:caseToken',
  publicCaseLookupRateLimit,
  caseTokenParamValidator,
  validateRequest,
  asyncHandler(getPublicCaseByToken),
);

export default router;
