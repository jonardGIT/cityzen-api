import { Router } from 'express';
import {
	createCitizen,
	deleteCitizen,
	getCitizenById,
	getCitizens,
	linkMyCitizenProfile,
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

router.get('/', asyncHandler(getCitizens));
router.get('/:id', asyncHandler(getCitizenById));
router.post('/', createCitizenValidator, validateRequest, asyncHandler(createCitizen));
router.post(
	'/link-me',
	requireJwtAuth,
	requireRole('VIEWER'),
	linkMyCitizenProfileValidator,
	validateRequest,
	asyncHandler(linkMyCitizenProfile)
);
router.patch('/:id', requireJwtAuth, requireRole(...ADMIN_ROLES), updateCitizenValidator, validateRequest, asyncHandler(updateCitizen));
router.delete('/:id', requireJwtAuth, requireRole(...ADMIN_ROLES), asyncHandler(deleteCitizen));

export default router;
