import { Router } from 'express';
import {
  createIncident,
  getIncidentById,
  getIncidents,
} from '../controllers/incidentsController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createIncidentValidator } from '../validators/bodyValidators.js';

const router = Router();

router.get('/', asyncHandler(getIncidents));
router.get('/:id', asyncHandler(getIncidentById));
router.post('/', createIncidentValidator, validateRequest, asyncHandler(createIncident));

export default router;
