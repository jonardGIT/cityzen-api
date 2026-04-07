import { Router } from 'express';
import {
  getDataGovernanceSummary,
  getAllUsersForAdmin,
  getPrivilegedAccessReviewReport,
  getPrivilegedMfaComplianceReport,
} from '../controllers/adminController.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/users/mfa-compliance',
  requireJwtAuth,
  requireRole('SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'),
  asyncHandler(getPrivilegedMfaComplianceReport),
);

router.get(
  '/users/access-review',
  requireJwtAuth,
  requireRole('SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'),
  asyncHandler(getPrivilegedAccessReviewReport),
);

router.get(
  '/security/data-governance',
  requireJwtAuth,
  requireRole('SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'AUDITOR'),
  asyncHandler(getDataGovernanceSummary),
);

router.get(
  '/users',
  requireJwtAuth,
  requireRole('SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'),
  asyncHandler(getAllUsersForAdmin),
);

export default router;
