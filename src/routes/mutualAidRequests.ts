import { Router } from 'express';
import { body } from 'express-validator';
import {
  getMutualAidRequests,
  getMutualAidRequestById,
  createMutualAidRequest,
  updateMutualAidRequest,
  deleteMutualAidRequest,
  restoreMutualAidRequest,
  validators,
  VALID_STATUSES,
} from '../controllers/mutualAidRequestsController.js';
import { DISPATCH_ROLES, CITY_ROLES } from '../types/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isArchiveEnabled } from '../utils/archive.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

const readMiddleware = [requireJwtAuth, requireRole(...DISPATCH_ROLES)];
const writeMiddleware = [requireJwtAuth, requireRole(...CITY_ROLES)];

// Inject authenticated user's ID as requestedById
function injectActorId(req: Request, _res: Response, next: NextFunction): void {
  const authReq = req as any;
  if (authReq.authUser?.id) {
    req.body.requestedById = authReq.authUser.id;
  }
  next();
}

// Validate requesting and target jurisdictions are different
const jurisdictionDifferenceValidator = body('targetJurisdictionId').custom((targetId, { req }) => {
  if (targetId === req.body?.requestingJurisdictionId) {
    throw new Error('targetJurisdictionId must be different from requestingJurisdictionId');
  }
  return true;
});

const statusCreateValidator = body('status')
  .isIn([...VALID_STATUSES])
  .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`);

const statusUpdateValidator = body('status')
  .optional()
  .isIn([...VALID_STATUSES])
  .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`);

router.get('/', ...readMiddleware, asyncHandler(getMutualAidRequests));
router.get('/:id', ...readMiddleware, asyncHandler(getMutualAidRequestById));
router.post(
  '/',
  ...writeMiddleware,
  injectActorId,
  ...validators.create,
  jurisdictionDifferenceValidator,
  statusCreateValidator,
  validateRequest,
  asyncHandler(createMutualAidRequest),
);
router.patch(
  '/:id',
  ...writeMiddleware,
  ...validators.update,
  statusUpdateValidator,
  validateRequest,
  asyncHandler(updateMutualAidRequest),
);
router.delete('/:id', ...writeMiddleware, asyncHandler(deleteMutualAidRequest));

if (isArchiveEnabled()) {
  router.post('/:id/restore', ...writeMiddleware, asyncHandler(restoreMutualAidRequest));
}

export default router;
