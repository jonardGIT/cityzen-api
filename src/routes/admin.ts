import { Router } from 'express';
import {
  listAdminSessionInventory,
  revokeAdminSessionInventoryEntry,
} from '../controllers/adminSessionInventoryController.js';
import {
  getDataGovernanceSummary,
  getAllUsersForAdmin,
  getPrivilegedAccessReviewReport,
  getPrivilegedMfaComplianceReport,
} from '../controllers/adminController.js';
import {
  getAdminDataSubjectRequestById,
  listAdminDataSubjectRequests,
  updateAdminDataSubjectRequest,
} from '../controllers/privacyRequestsController.js';
import {
  createPrivacyIncident,
  getPrivacyIncidentById,
  listPrivacyIncidents,
  updatePrivacyIncident,
} from '../controllers/privacyIncidentsController.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { ADMIN_ROLES, AUDIT_READ_ROLES } from '../types/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { param } from 'express-validator';
import {
  createPrivacyIncidentValidator,
  isPostgresUuid,
  updateDataSubjectRequestValidator,
  updatePrivacyIncidentValidator,
} from '../validators/bodyValidators.js';

const router = Router();

const privacyRequestIdValidator = [
  param('id')
    .custom((value) => isPostgresUuid(value))
    .withMessage('id must be a valid UUID'),
];

const privacyIncidentIdValidator = [
  param('id')
    .custom((value) => isPostgresUuid(value))
    .withMessage('id must be a valid UUID'),
];

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
  '/privacy-requests',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES, 'AUDITOR'),
  asyncHandler(listAdminDataSubjectRequests),
);

router.get(
  '/privacy-requests/:id',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES, 'AUDITOR'),
  ...privacyRequestIdValidator,
  validateRequest,
  asyncHandler(getAdminDataSubjectRequestById),
);

router.patch(
  '/privacy-requests/:id',
  requireJwtAuth,
  requireRole('NATIONAL_ADMIN'),
  ...privacyRequestIdValidator,
  ...updateDataSubjectRequestValidator,
  validateRequest,
  asyncHandler(updateAdminDataSubjectRequest),
);

router.get(
  '/security/privacy-incidents',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES, 'AUDITOR'),
  asyncHandler(listPrivacyIncidents),
);

router.post(
  '/security/privacy-incidents',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  ...createPrivacyIncidentValidator,
  validateRequest,
  asyncHandler(createPrivacyIncident),
);

router.get(
  '/security/privacy-incidents/:id',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES, 'AUDITOR'),
  ...privacyIncidentIdValidator,
  validateRequest,
  asyncHandler(getPrivacyIncidentById),
);

router.patch(
  '/security/privacy-incidents/:id',
  requireJwtAuth,
  requireRole('NATIONAL_ADMIN'),
  ...privacyIncidentIdValidator,
  ...updatePrivacyIncidentValidator,
  validateRequest,
  asyncHandler(updatePrivacyIncident),
);

router.get(
  '/users',
  requireJwtAuth,
  requireRole('NATIONAL_ADMIN'),
  asyncHandler(getAllUsersForAdmin),
);

router.get(
  '/session-inventory',
  requireJwtAuth,
  requireRole(...AUDIT_READ_ROLES),
  asyncHandler(listAdminSessionInventory),
);

router.delete(
  '/session-inventory/:id',
  requireJwtAuth,
  requireRole('NATIONAL_ADMIN'),
  ...privacyIncidentIdValidator,
  validateRequest,
  asyncHandler(revokeAdminSessionInventoryEntry),
);

export default router;
