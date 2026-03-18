import { Router } from 'express';
import { getAllUsersForAdmin } from '../controllers/adminController.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';

const router = Router();

router.get('/users', requireJwtAuth, requireRole('SUPER_ADMIN', 'ADMIN'), getAllUsersForAdmin);

export default router;
