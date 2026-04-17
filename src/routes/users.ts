import { Router } from 'express';
import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  getUserCapabilities,
  restoreUser,
  updateUser,
} from '../controllers/usersController.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { ADMIN_ROLES } from '../types/auth.js';
import { isArchiveEnabled } from '../utils/archive.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createUserValidator, updateUserValidator } from '../validators/bodyValidators.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/capabilities', requireJwtAuth, asyncHandler(getUserCapabilities));
router.get('/', requireJwtAuth, requireRole(...ADMIN_ROLES), asyncHandler(getUsers));
router.get('/:id', requireJwtAuth, requireRole(...ADMIN_ROLES), asyncHandler(getUserById));
router.post(
  '/',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  createUserValidator,
  validateRequest,
  asyncHandler(createUser),
);
router.patch(
  '/:id',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  updateUserValidator,
  validateRequest,
  asyncHandler(updateUser),
);
router.delete('/:id', requireJwtAuth, requireRole(...ADMIN_ROLES), asyncHandler(deleteUser));

if (isArchiveEnabled()) {
  router.post(
    '/:id/restore',
    requireJwtAuth,
    requireRole(...ADMIN_ROLES),
    asyncHandler(restoreUser),
  );
}

export default router;
