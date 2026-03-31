import { Router } from 'express';
import { getAllUsersForAdmin } from '../controllers/adminController.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';

const router = Router();

router.get(
	'/users',
	requireJwtAuth,
	requireRole('SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'),
	getAllUsersForAdmin,
);

export default router;
