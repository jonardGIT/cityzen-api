import { Router, type Request } from 'express';
import {
  createCitizenIncidentReport,
  createIncident,
  deleteIncident,
  getAuditorIncidentById,
  getAuditorIncidents,
  getAuditorIncidentTimeline,
  getIncidentById,
  getIncidentMediaAccess,
  getIncidentTimeline,
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
import { incidentTimelineParamValidator } from '../validators/incidentTrustValidators.js';

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

const STANDARD_INCIDENT_READ_ROLES = [
  'CITIZEN_REPORTER',
  'CITY_ADMIN',
  'DISPATCHER',
  'RESPONDER',
  'REGIONAL_DIRECTOR',
  'PROVINCIAL_ADMIN',
  'NATIONAL_ADMIN',
] as const;
const PHASE_ONE_TRUST_TIMELINE_READ_ROLES = [
  'CITIZEN_REPORTER',
  'CITY_ADMIN',
  'DISPATCHER',
  'RESPONDER',
  'REGIONAL_DIRECTOR',
  'PROVINCIAL_ADMIN',
  'NATIONAL_ADMIN',
] as const;

router.get(
  '/',
  requireJwtAuth,
  requireRole(...STANDARD_INCIDENT_READ_ROLES),
  asyncHandler(getIncidents),
);

router.get('/audit', requireJwtAuth, requireRole('AUDITOR'), asyncHandler(getAuditorIncidents));

router.get(
  '/audit/:id/timeline',
  requireJwtAuth,
  requireRole('AUDITOR'),
  incidentTimelineParamValidator,
  validateRequest,
  asyncHandler(getAuditorIncidentTimeline),
);

router.get(
  '/audit/:id',
  requireJwtAuth,
  requireRole('AUDITOR'),
  asyncHandler(getAuditorIncidentById),
);

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

router.get(
  '/:id/media/:mediaId',
  requireJwtAuth,
  requireRole(...STANDARD_INCIDENT_READ_ROLES),
  asyncHandler(getIncidentMediaAccess),
);
router.get(
  '/:id/timeline',
  requireJwtAuth,
  requireRole(...PHASE_ONE_TRUST_TIMELINE_READ_ROLES),
  incidentTimelineParamValidator,
  validateRequest,
  asyncHandler(getIncidentTimeline),
);
router.get(
  '/:id',
  requireJwtAuth,
  requireRole(...STANDARD_INCIDENT_READ_ROLES),
  asyncHandler(getIncidentById),
);
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
