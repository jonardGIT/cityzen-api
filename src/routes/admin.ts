import { Router } from 'express';
import { getAllUsersForAdmin, getPrivilegedMfaComplianceReport } from '../controllers/adminController.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';

const router = Router();

router.get(
	'/users/mfa-compliance',
	requireJwtAuth,
	requireRole('SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'),
	getPrivilegedMfaComplianceReport,
);

router.get(
	'/users',
	requireJwtAuth,
	requireRole('SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'),
	getAllUsersForAdmin,
);

export default router;
