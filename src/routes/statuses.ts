import { Router } from 'express';
import { createStatus, getStatusById, getStatuses } from '../controllers/statusesController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createStatusValidator } from '../validators/bodyValidators.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { ADMIN_ROLES } from '../types/auth.js';

const router = Router();

router.get('/', asyncHandler(getStatuses));
router.get('/:id', asyncHandler(getStatusById));
router.post(
	'/',
	requireJwtAuth,
	requireRole(...ADMIN_ROLES),
	createStatusValidator,
	validateRequest,
	asyncHandler(createStatus)
);

export default router;
