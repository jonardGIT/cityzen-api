import { Router } from 'express';
import { getAuditLogById, getAuditLogs } from '../controllers/auditLogsController.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';

const router = Router();

router.get('/', requireJwtAuth, requireRole('SYSTEM_ADMIN', 'AUDITOR'), getAuditLogs);
router.get('/:id', requireJwtAuth, requireRole('SYSTEM_ADMIN', 'AUDITOR'), getAuditLogById);

export default router;
