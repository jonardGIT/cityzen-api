import { Router, type Request } from 'express';
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
import { isAnyMfaFeatureEnabled, isSessionInventoryFeatureEnabled } from '../featureSelection.js';
import { createEnvRateLimitMiddleware } from '../middleware/rateLimit.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import { MFA_REQUIRED_ROLES } from '../types/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

function buildIpScopedKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function buildEmailScopedKey(req: Request): string {
  const email =
    typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'missing-email';
  return `${buildIpScopedKey(req)}:${email}`;
}

function buildAuthenticatedUserScopedKey(req: Request): string {
  const authUserId = (req as AuthenticatedRequest).authUser?.id ?? 'anonymous';
  return `${authUserId}:${buildIpScopedKey(req)}`;
}

const loginRateLimit = createEnvRateLimitMiddleware({
  scope: 'auth-login',
  windowMsEnvVar: 'AUTH_LOGIN_RATE_LIMIT_WINDOW_MS',
  maxRequestsEnvVar: 'AUTH_LOGIN_RATE_LIMIT_MAX_REQUESTS',
  defaultWindowMs: 60_000,
  defaultMaxRequests: 5,
  keyGenerator: buildEmailScopedKey,
});
const refreshRateLimit = createEnvRateLimitMiddleware({
  scope: 'auth-refresh',
  windowMsEnvVar: 'AUTH_REFRESH_RATE_LIMIT_WINDOW_MS',
  maxRequestsEnvVar: 'AUTH_REFRESH_RATE_LIMIT_MAX_REQUESTS',
  defaultWindowMs: 60_000,
  defaultMaxRequests: 10,
  keyGenerator: buildIpScopedKey,
});
const passwordResetRequestRateLimit = createEnvRateLimitMiddleware({
  scope: 'auth-password-reset-request',
  windowMsEnvVar: 'AUTH_PASSWORD_RESET_REQUEST_RATE_LIMIT_WINDOW_MS',
  maxRequestsEnvVar: 'AUTH_PASSWORD_RESET_REQUEST_RATE_LIMIT_MAX_REQUESTS',
  defaultWindowMs: 3_600_000,
  defaultMaxRequests: 5,
  keyGenerator: buildEmailScopedKey,
});
const passwordResetConfirmRateLimit = createEnvRateLimitMiddleware({
  scope: 'auth-password-reset-confirm',
  windowMsEnvVar: 'AUTH_PASSWORD_RESET_CONFIRM_RATE_LIMIT_WINDOW_MS',
  maxRequestsEnvVar: 'AUTH_PASSWORD_RESET_CONFIRM_RATE_LIMIT_MAX_REQUESTS',
  defaultWindowMs: 900_000,
  defaultMaxRequests: 10,
  keyGenerator: buildIpScopedKey,
});
const mfaSetupRateLimit = createEnvRateLimitMiddleware({
  scope: 'auth-mfa-setup',
  windowMsEnvVar: 'AUTH_MFA_SETUP_RATE_LIMIT_WINDOW_MS',
  maxRequestsEnvVar: 'AUTH_MFA_SETUP_RATE_LIMIT_MAX_REQUESTS',
  defaultWindowMs: 600_000,
  defaultMaxRequests: 5,
  keyGenerator: buildAuthenticatedUserScopedKey,
});
const mfaEnableRateLimit = createEnvRateLimitMiddleware({
  scope: 'auth-mfa-enable',
  windowMsEnvVar: 'AUTH_MFA_ENABLE_RATE_LIMIT_WINDOW_MS',
  maxRequestsEnvVar: 'AUTH_MFA_ENABLE_RATE_LIMIT_MAX_REQUESTS',
  defaultWindowMs: 600_000,
  defaultMaxRequests: 10,
  keyGenerator: buildAuthenticatedUserScopedKey,
});
const mfaDisableRateLimit = createEnvRateLimitMiddleware({
  scope: 'auth-mfa-disable',
  windowMsEnvVar: 'AUTH_MFA_DISABLE_RATE_LIMIT_WINDOW_MS',
  maxRequestsEnvVar: 'AUTH_MFA_DISABLE_RATE_LIMIT_MAX_REQUESTS',
  defaultWindowMs: 600_000,
  defaultMaxRequests: 10,
  keyGenerator: buildAuthenticatedUserScopedKey,
});

router.post('/register', asyncHandler(register));
router.post('/login', loginRateLimit, asyncHandler(login));
router.post('/password-reset/request', passwordResetRequestRateLimit, asyncHandler(requestPasswordReset));
router.post('/password-reset/confirm', passwordResetConfirmRateLimit, asyncHandler(confirmPasswordReset));
router.post('/refresh', refreshRateLimit, asyncHandler(refresh));
router.get('/me', requireJwtAuth, asyncHandler(me));

if (isSessionInventoryFeatureEnabled()) {
  router.get('/sessions', requireJwtAuth, asyncHandler(listSessions));
  router.delete('/sessions/:id', requireJwtAuth, asyncHandler(revokeSession));
}

router.post('/logout', requireJwtAuth, asyncHandler(logout));

if (isAnyMfaFeatureEnabled()) {
  router.post(
    '/mfa/setup',
    requireJwtAuth,
    requireRole(...MFA_REQUIRED_ROLES),
    mfaSetupRateLimit,
    asyncHandler(setupMfa),
  );
  router.post(
    '/mfa/enable',
    requireJwtAuth,
    requireRole(...MFA_REQUIRED_ROLES),
    mfaEnableRateLimit,
    asyncHandler(enableMfa),
  );
  router.post(
    '/mfa/disable',
    requireJwtAuth,
    requireRole(...MFA_REQUIRED_ROLES),
    mfaDisableRateLimit,
    asyncHandler(disableMfa),
  );
}

export default router;
