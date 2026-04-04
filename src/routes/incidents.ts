import { Router, type Request } from 'express';
import {
  createCitizenIncidentReport,
  createIncident,
  deleteIncident,
  getIncidentById,
  getIncidentMediaAccess,
  getIncidents,
  restoreIncident,
  uploadIncidentMedia,
  updateIncident,
} from '../controllers/incidentsController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createCitizenIncidentReportValidator,
  createIncidentValidator,
  uploadIncidentMediaValidator,
  updateIncidentValidator,
} from '../validators/bodyValidators.js';
import { isIncidentMediaUploadFeatureEnabled } from '../featureSelection.js';
import { createEnvRateLimitMiddleware } from '../middleware/rateLimit.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import { INCIDENT_WRITE_ROLES, MEDIA_UPLOAD_ROLES } from '../types/auth.js';
import { isArchiveEnabled } from '../utils/archive.js';

const router = Router();

function buildAuthenticatedUserScopedKey(req: Request): string {
  const authUserId = (req as AuthenticatedRequest).authUser?.id ?? 'anonymous';
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  return `${authUserId}:${clientIp}`;
}

const incidentMediaUploadRateLimit = createEnvRateLimitMiddleware({
  scope: 'incident-media-upload',
  windowMsEnvVar: 'INCIDENT_MEDIA_UPLOAD_RATE_LIMIT_WINDOW_MS',
  maxRequestsEnvVar: 'INCIDENT_MEDIA_UPLOAD_RATE_LIMIT_MAX_REQUESTS',
  defaultWindowMs: 600_000,
  defaultMaxRequests: 10,
  keyGenerator: buildAuthenticatedUserScopedKey,
});

router.get('/', requireJwtAuth, asyncHandler(getIncidents));

if (isIncidentMediaUploadFeatureEnabled()) {
  router.post(
    '/media/upload',
    requireJwtAuth,
    requireRole(...MEDIA_UPLOAD_ROLES),
    incidentMediaUploadRateLimit,
    uploadIncidentMediaValidator,
    validateRequest,
    asyncHandler(uploadIncidentMedia),
  );
}

router.get('/:id/media/:mediaId', requireJwtAuth, asyncHandler(getIncidentMediaAccess));
router.get('/:id', requireJwtAuth, asyncHandler(getIncidentById));
router.post(
  '/report',
  requireJwtAuth,
  requireRole('CITIZEN_REPORTER'),
  createCitizenIncidentReportValidator,
  validateRequest,
  asyncHandler(createCitizenIncidentReport),
);
router.post(
  '/',
  requireJwtAuth,
  requireRole(...INCIDENT_WRITE_ROLES),
  createIncidentValidator,
  validateRequest,
  asyncHandler(createIncident),
);
router.patch(
  '/:id',
  requireJwtAuth,
  requireRole(...INCIDENT_WRITE_ROLES),
  updateIncidentValidator,
  validateRequest,
  asyncHandler(updateIncident),
);
router.delete(
  '/:id',
  requireJwtAuth,
  requireRole(...INCIDENT_WRITE_ROLES),
  asyncHandler(deleteIncident),
);

if (isArchiveEnabled()) {
  router.post(
    '/:id/restore',
    requireJwtAuth,
    requireRole(...INCIDENT_WRITE_ROLES),
    asyncHandler(restoreIncident),
  );
}

export default router;
