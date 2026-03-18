import { Router } from 'express';
import {
  createResponder,
  getResponderById,
  getResponders,
} from '../controllers/respondersController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createResponderValidator } from '../validators/bodyValidators.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { ADMIN_ROLES } from '../types/auth.js';

const router = Router();

router.get('/', asyncHandler(getResponders));
router.get('/:id', asyncHandler(getResponderById));
router.post(
  '/',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  createResponderValidator,
  validateRequest,
  asyncHandler(createResponder)
);

export default router;
