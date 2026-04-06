import { Router } from 'express';
import {
  getDataGovernanceSummary,
  getAllUsersForAdmin,
  getPrivilegedAccessReviewReport,
  getPrivilegedMfaComplianceReport,
} from '../controllers/adminController.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';

const router = Router();

router.get(
  '/users/mfa-compliance',
  requireJwtAuth,
  requireRole('SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'),
  getPrivilegedMfaComplianceReport,
);

router.get(
  '/users/access-review',
  requireJwtAuth,
  requireRole('SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'),
  getPrivilegedAccessReviewReport,
);

router.get(
  '/security/data-governance',
  requireJwtAuth,
  requireRole('SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'AUDITOR'),
  getDataGovernanceSummary,
);

router.get(
  '/users',
  requireJwtAuth,
  requireRole('SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'),
  getAllUsersForAdmin,
);

export default router;
