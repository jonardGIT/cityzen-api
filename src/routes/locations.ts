import { Router } from 'express';
import {
  createLocation,
  getLocationById,
  getLocations,
} from '../controllers/locationsController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createLocationValidator } from '../validators/bodyValidators.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { ADMIN_ROLES } from '../types/auth.js';

const router = Router();

router.get('/', asyncHandler(getLocations));
router.get('/:id', asyncHandler(getLocationById));
router.post(
  '/',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  createLocationValidator,
  validateRequest,
  asyncHandler(createLocation)
);

export default router;
