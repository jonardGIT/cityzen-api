import { Router } from 'express';
import {
  createSeverity,
  getSeverityById,
  getSeverities,
} from '../controllers/severitiesController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createSeverityValidator } from '../validators/bodyValidators.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { ADMIN_ROLES } from '../types/auth.js';

const router = Router();

router.get('/', asyncHandler(getSeverities));
router.get('/:id', asyncHandler(getSeverityById));
router.post(
  '/',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  createSeverityValidator,
  validateRequest,
  asyncHandler(createSeverity)
);

export default router;
