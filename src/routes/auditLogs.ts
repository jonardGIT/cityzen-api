import { Router } from 'express';
import { param } from 'express-validator';
import { getAuditLogById, getAuditLogs } from '../controllers/auditLogsController.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { AUDIT_READ_ROLES } from '../types/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isPostgresUuid } from '../validators/bodyValidators.js';

const router = Router();
const idValidators = [
  param('id')
    .custom((value) => isPostgresUuid(value))
    .withMessage('id must be a valid UUID'),
];

router.get('/', requireJwtAuth, requireRole(...AUDIT_READ_ROLES), asyncHandler(getAuditLogs));
router.get(
  '/:id',
  requireJwtAuth,
  requireRole(...AUDIT_READ_ROLES),
  ...idValidators,
  validateRequest,
  asyncHandler(getAuditLogById),
);

export default router;
