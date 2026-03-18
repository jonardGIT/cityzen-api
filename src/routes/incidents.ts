import { Router } from 'express';
import {
  createIncident,
  getIncidentById,
  getIncidents,
} from '../controllers/incidentsController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createIncidentValidator } from '../validators/bodyValidators.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { INCIDENT_WRITE_ROLES } from '../types/auth.js';

const router = Router();

router.get('/', asyncHandler(getIncidents));
router.get('/:id', asyncHandler(getIncidentById));
router.post(
  '/',
  requireJwtAuth,
  requireRole(...INCIDENT_WRITE_ROLES),
  createIncidentValidator,
  validateRequest,
  asyncHandler(createIncident)
);

export default router;
