import { Router } from 'express';
import {
  createSeverity,
  deleteSeverity,
  getSeverityById,
  getSeverities,
  restoreSeverity,
  updateSeverity,
} from '../controllers/severitiesController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createSeverityValidator, updateSeverityValidator } from '../validators/bodyValidators.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { ADMIN_ROLES } from '../types/auth.js';

const router = Router();

router.get('/', requireJwtAuth, asyncHandler(getSeverities));
router.get('/:id', requireJwtAuth, asyncHandler(getSeverityById));
router.post(
  '/',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  createSeverityValidator,
  validateRequest,
  asyncHandler(createSeverity)
);
router.patch(
  '/:id',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  updateSeverityValidator,
  validateRequest,
  asyncHandler(updateSeverity)
);
router.delete('/:id', requireJwtAuth, requireRole(...ADMIN_ROLES), asyncHandler(deleteSeverity));
router.post('/:id/restore', requireJwtAuth, requireRole(...ADMIN_ROLES), asyncHandler(restoreSeverity));

export default router;
