import { Router } from 'express';
import { createAgency, deleteAgency, getAgencyById, getAgencies, updateAgency } from '../controllers/agenciesController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createAgencyValidator, updateAgencyValidator } from '../validators/bodyValidators.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { ADMIN_ROLES } from '../types/auth.js';

const router = Router();

router.get('/', asyncHandler(getAgencies));
router.get('/:id', asyncHandler(getAgencyById));
router.post('/', requireJwtAuth, requireRole(...ADMIN_ROLES), createAgencyValidator, validateRequest, asyncHandler(createAgency));
router.patch('/:id', requireJwtAuth, requireRole(...ADMIN_ROLES), updateAgencyValidator, validateRequest, asyncHandler(updateAgency));
router.delete('/:id', requireJwtAuth, requireRole(...ADMIN_ROLES), asyncHandler(deleteAgency));

export default router;