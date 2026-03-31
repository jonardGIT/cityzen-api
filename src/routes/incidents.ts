import { Router } from 'express';
import {
  createCitizenIncidentReport,
  createIncident,
  deleteIncident,
  getIncidentById,
  getIncidents,
  updateIncident,
} from '../controllers/incidentsController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createCitizenIncidentReportValidator,
  createIncidentValidator,
  updateIncidentValidator,
} from '../validators/bodyValidators.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { INCIDENT_WRITE_ROLES } from '../types/auth.js';

const router = Router();

router.get('/', requireJwtAuth, asyncHandler(getIncidents));
router.get('/:id', requireJwtAuth, asyncHandler(getIncidentById));
router.post(
  '/report',
  requireJwtAuth,
  requireRole('CITIZEN_REPORTER'),
  createCitizenIncidentReportValidator,
  validateRequest,
  asyncHandler(createCitizenIncidentReport)
);
router.post(
  '/',
  requireJwtAuth,
  requireRole(...INCIDENT_WRITE_ROLES),
  createIncidentValidator,
  validateRequest,
  asyncHandler(createIncident)
);
router.patch(
  '/:id',
  requireJwtAuth,
  requireRole(...INCIDENT_WRITE_ROLES),
  updateIncidentValidator,
  validateRequest,
  asyncHandler(updateIncident)
);
router.delete('/:id', requireJwtAuth, requireRole(...INCIDENT_WRITE_ROLES), asyncHandler(deleteIncident));

export default router;
