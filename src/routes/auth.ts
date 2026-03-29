import { Router } from 'express';
import {
  confirmPasswordReset,
  disableMfa,
  enableMfa,
  login,
  listSessions,
  logout,
  me,
  requestPasswordReset,
  refresh,
  register,
  revokeSession,
  setupMfa,
} from '../controllers/authController.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { MFA_REQUIRED_ROLES } from '../types/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/password-reset/request', requestPasswordReset);
router.post('/password-reset/confirm', confirmPasswordReset);
router.post('/refresh', refresh);
router.get('/me', requireJwtAuth, me);
router.get('/sessions', requireJwtAuth, listSessions);
router.delete('/sessions/:id', requireJwtAuth, revokeSession);
router.post('/logout', requireJwtAuth, logout);
router.post('/mfa/setup', requireJwtAuth, requireRole(...MFA_REQUIRED_ROLES), setupMfa);
router.post('/mfa/enable', requireJwtAuth, requireRole(...MFA_REQUIRED_ROLES), enableMfa);
router.post('/mfa/disable', requireJwtAuth, requireRole(...MFA_REQUIRED_ROLES), disableMfa);

export default router;
