import { Router } from 'express';
import { getAuditLogById, getAuditLogs } from '../controllers/auditLogsController.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { AUDIT_READ_ROLES } from '../types/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', requireJwtAuth, requireRole(...AUDIT_READ_ROLES), asyncHandler(getAuditLogs));
router.get('/:id', requireJwtAuth, requireRole(...AUDIT_READ_ROLES), asyncHandler(getAuditLogById));

export default router;
