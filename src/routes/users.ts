import { Router } from 'express';
import { param } from 'express-validator';
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
import {
  createUserValidator,
  isPostgresUuid,
  updateUserValidator,
} from '../validators/bodyValidators.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
const idValidators = [
  param('id')
    .custom((value) => isPostgresUuid(value))
    .withMessage('id must be a valid UUID'),
];

router.get('/capabilities', requireJwtAuth, asyncHandler(getUserCapabilities));
router.get('/', requireJwtAuth, requireRole(...ADMIN_ROLES), asyncHandler(getUsers));
router.get(
  '/:id',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  ...idValidators,
  validateRequest,
  asyncHandler(getUserById),
);
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
  ...idValidators,
  updateUserValidator,
  validateRequest,
  asyncHandler(updateUser),
);
router.delete(
  '/:id',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  ...idValidators,
  validateRequest,
  asyncHandler(deleteUser),
);

if (isArchiveEnabled()) {
  router.post(
    '/:id/restore',
    requireJwtAuth,
    requireRole(...ADMIN_ROLES),
    ...idValidators,
    validateRequest,
    asyncHandler(restoreUser),
  );
}

export default router;
