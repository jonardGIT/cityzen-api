import { Router } from 'express';
import {
  createCitizenIncidentReport,
  createIncident,
  deleteIncident,
  getIncidentById,
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
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { INCIDENT_WRITE_ROLES, MEDIA_UPLOAD_ROLES } from '../types/auth.js';

const router = Router();

router.get('/', requireJwtAuth, asyncHandler(getIncidents));
router.post(
  '/media/upload',
  requireJwtAuth,
  requireRole(...MEDIA_UPLOAD_ROLES),
  uploadIncidentMediaValidator,
  validateRequest,
  asyncHandler(uploadIncidentMedia),
);
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
router.post(
  '/:id/restore',
  requireJwtAuth,
  requireRole(...INCIDENT_WRITE_ROLES),
  asyncHandler(restoreIncident),
);

export default router;
