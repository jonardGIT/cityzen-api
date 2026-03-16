import { Router } from 'express';
import {
  createSeverity,
  getSeverityById,
  getSeverities,
} from '../controllers/severitiesController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createSeverityValidator } from '../validators/bodyValidators.js';

const router = Router();

router.get('/', asyncHandler(getSeverities));
router.get('/:id', asyncHandler(getSeverityById));
router.post('/', createSeverityValidator, validateRequest, asyncHandler(createSeverity));

export default router;
