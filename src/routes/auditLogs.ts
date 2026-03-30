import { Router } from 'express';
import { getAuditLogById, getAuditLogs } from '../controllers/auditLogsController.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { ADMIN_ROLES } from '../types/auth.js';

const router = Router();

router.get('/', requireJwtAuth, requireRole(...ADMIN_ROLES), getAuditLogs);
router.get('/:id', requireJwtAuth, requireRole(...ADMIN_ROLES), getAuditLogById);

export default router;
