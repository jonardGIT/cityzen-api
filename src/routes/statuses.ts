import { Router } from 'express';
import {
  createStatus,
  deleteStatus,
  getStatusById,
  getStatuses,
  restoreStatus,
  updateStatus,
} from '../controllers/statusesController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createStatusValidator, updateStatusValidator } from '../validators/bodyValidators.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { ADMIN_ROLES } from '../types/auth.js';

const router = Router();

router.get('/', requireJwtAuth, asyncHandler(getStatuses));
router.get('/:id', requireJwtAuth, asyncHandler(getStatusById));
router.post(
  '/',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  createStatusValidator,
  validateRequest,
  asyncHandler(createStatus),
);
router.patch(
  '/:id',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  updateStatusValidator,
  validateRequest,
  asyncHandler(updateStatus),
);
router.delete('/:id', requireJwtAuth, requireRole(...ADMIN_ROLES), asyncHandler(deleteStatus));
router.post(
  '/:id/restore',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  asyncHandler(restoreStatus),
);

export default router;
