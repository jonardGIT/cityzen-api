import { Router } from 'express';
import {
  createResponder,
  deleteResponder,
  getResponderById,
  getResponders,
  restoreResponder,
  updateResponder,
} from '../controllers/respondersController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isArchiveEnabled } from '../utils/archive.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createResponderValidator,
  updateResponderValidator,
} from '../validators/bodyValidators.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { ADMIN_ROLES, DISPATCH_ROLES } from '../types/auth.js';

const router = Router();

router.get('/', requireJwtAuth, requireRole(...DISPATCH_ROLES), asyncHandler(getResponders));
router.get('/:id', requireJwtAuth, requireRole(...DISPATCH_ROLES), asyncHandler(getResponderById));
router.post(
  '/',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  createResponderValidator,
  validateRequest,
  asyncHandler(createResponder),
);
router.patch(
  '/:id',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  updateResponderValidator,
  validateRequest,
  asyncHandler(updateResponder),
);
router.delete('/:id', requireJwtAuth, requireRole(...ADMIN_ROLES), asyncHandler(deleteResponder));

if (isArchiveEnabled()) {
  router.post(
    '/:id/restore',
    requireJwtAuth,
    requireRole(...ADMIN_ROLES),
    asyncHandler(restoreResponder),
  );
}

export default router;
