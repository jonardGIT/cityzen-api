import { Router } from 'express';
import { body } from 'express-validator';
import {
  getIncidentEscalations,
  getIncidentEscalationById,
  createIncidentEscalation,
  updateIncidentEscalation,
  deleteIncidentEscalation,
  restoreIncidentEscalation,
  validators,
  VALID_LEVELS,
  LEVEL_ORDER,
  VALID_STATUSES,
} from '../controllers/incidentEscalationsController.js';
import { DISPATCH_ROLES, ESCALATION_ROLES } from '../types/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isArchiveEnabled } from '../utils/archive.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

const readMiddleware = [requireJwtAuth, requireRole(...DISPATCH_ROLES)];
const writeMiddleware = [requireJwtAuth, requireRole(...ESCALATION_ROLES)];

// Inject authenticated user's ID as escalatedById
function injectActorId(req: Request, _res: Response, next: NextFunction): void {
  const authReq = req as any;
  if (authReq.authUser?.id) {
    req.body.escalatedById = authReq.authUser.id;
  }
  next();
}

// Custom validators for enum fields
const levelValidator = (field: string) =>
  body(field)
    .isIn([...VALID_LEVELS])
    .withMessage(`${field} must be one of: ${VALID_LEVELS.join(', ')}`);

const escalationHierarchyValidator = body('toLevel').custom((toLevel, { req }) => {
  const fromLevel = req.body?.fromLevel;
  if (!fromLevel || !toLevel) return true;
  if (LEVEL_ORDER[toLevel] === undefined || LEVEL_ORDER[fromLevel] === undefined) return true;
  if (LEVEL_ORDER[toLevel] <= LEVEL_ORDER[fromLevel]) {
    throw new Error('toLevel must be higher than fromLevel in the administrative hierarchy');
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

router.get('/', ...readMiddleware, asyncHandler(getIncidentEscalations));
router.get('/:id', ...readMiddleware, asyncHandler(getIncidentEscalationById));
router.post(
  '/',
  ...writeMiddleware,
  injectActorId,
  ...validators.create,
  levelValidator('fromLevel'),
  levelValidator('toLevel'),
  escalationHierarchyValidator,
  statusCreateValidator,
  validateRequest,
  asyncHandler(createIncidentEscalation),
);
router.patch(
  '/:id',
  ...writeMiddleware,
  ...validators.update,
  statusUpdateValidator,
  validateRequest,
  asyncHandler(updateIncidentEscalation),
);
router.delete('/:id', ...writeMiddleware, asyncHandler(deleteIncidentEscalation));

if (isArchiveEnabled()) {
  router.post('/:id/restore', ...writeMiddleware, asyncHandler(restoreIncidentEscalation));
}

export default router;
