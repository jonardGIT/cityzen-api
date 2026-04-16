import { Router } from 'express';
import {
  getDataGovernanceSummary,
  getAllUsersForAdmin,
  getPrivilegedAccessReviewReport,
  getPrivilegedMfaComplianceReport,
} from '../controllers/adminController.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { ADMIN_ROLES, AUDIT_READ_ROLES } from '../types/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/users/mfa-compliance',
  requireJwtAuth,
  requireRole('NATIONAL_ADMIN'),
  asyncHandler(getPrivilegedMfaComplianceReport),
);

router.get(
  '/users/access-review',
  requireJwtAuth,
  requireRole('NATIONAL_ADMIN'),
  asyncHandler(getPrivilegedAccessReviewReport),
);

router.get(
  '/security/data-governance',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES, 'AUDITOR'),
  asyncHandler(getDataGovernanceSummary),
);

router.get(
  '/users',
  requireJwtAuth,
  requireRole('NATIONAL_ADMIN'),
  asyncHandler(getAllUsersForAdmin),
);

export default router;
