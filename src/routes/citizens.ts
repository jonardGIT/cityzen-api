import { Router } from 'express';
import {
  createCitizen,
  deleteCitizen,
  getCitizenById,
  getCitizens,
  linkMyCitizenProfile,
  restoreCitizen,
  updateCitizen,
} from '../controllers/citizensController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createCitizenValidator,
  linkMyCitizenProfileValidator,
  updateCitizenValidator,
} from '../validators/bodyValidators.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { ADMIN_ROLES } from '../types/auth.js';

const router = Router();

router.get('/', requireJwtAuth, requireRole(...ADMIN_ROLES), asyncHandler(getCitizens));
router.get('/:id', requireJwtAuth, requireRole(...ADMIN_ROLES), asyncHandler(getCitizenById));
router.post(
  '/',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  createCitizenValidator,
  validateRequest,
  asyncHandler(createCitizen),
);
router.post(
  '/link-me',
  requireJwtAuth,
  requireRole('CITIZEN_REPORTER'),
  linkMyCitizenProfileValidator,
  validateRequest,
  asyncHandler(linkMyCitizenProfile),
);
router.patch(
  '/:id',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  updateCitizenValidator,
  validateRequest,
  asyncHandler(updateCitizen),
);
router.delete('/:id', requireJwtAuth, requireRole(...ADMIN_ROLES), asyncHandler(deleteCitizen));
router.post(
  '/:id/restore',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  asyncHandler(restoreCitizen),
);

export default router;
