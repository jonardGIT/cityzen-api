import { Router } from 'express';
import { body } from 'express-validator';
import { param } from 'express-validator';
import {
  createIncidentEscalation,
  deleteIncidentEscalation,
  getIncidentEscalationById,
  getIncidentEscalations,
  PATCHABLE_STATUSES,
  restoreIncidentEscalation,
  updateIncidentEscalation,
} from '../controllers/incidentEscalationsController.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const readMiddleware = [
  requireJwtAuth,
  requireRole('CITY_ADMIN', 'DISPATCHER', 'PROVINCIAL_ADMIN'),
];
const createMiddleware = [requireJwtAuth, requireRole('CITY_ADMIN', 'DISPATCHER')];
const provinceWriteMiddleware = [requireJwtAuth, requireRole('PROVINCIAL_ADMIN')];

function exactBodyFields(allowedFields: readonly string[]) {
  return body().custom((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Request body must be an object');
    }

    const unexpectedFields = Object.keys(value).filter((field) => !allowedFields.includes(field));
    if (unexpectedFields.length > 0) {
      throw new Error(`Unexpected fields: ${unexpectedFields.join(', ')}`);
    }

    return true;
  });
}

const createValidators = [
  exactBodyFields(['incidentId', 'reason']),
  body('incidentId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('incidentId is required')
    .bail()
    .isUUID()
    .withMessage('incidentId must be a valid UUID'),
  body('reason').isString().trim().notEmpty().withMessage('reason is required'),
];

const patchValidators = [
  exactBodyFields(['status']),
  body('status')
    .isIn([...PATCHABLE_STATUSES])
    .withMessage(`status must be one of: ${PATCHABLE_STATUSES.join(', ')}`),
];

const idValidators = [param('id').isUUID().withMessage('id must be a valid UUID')];

router.get('/', ...readMiddleware, asyncHandler(getIncidentEscalations));
router.get(
  '/:id',
  ...readMiddleware,
  ...idValidators,
  validateRequest,
  asyncHandler(getIncidentEscalationById),
);
router.post(
  '/',
  ...createMiddleware,
  ...createValidators,
  validateRequest,
  asyncHandler(createIncidentEscalation),
);
router.patch(
  '/:id',
  ...provinceWriteMiddleware,
  ...idValidators,
  ...patchValidators,
  validateRequest,
  asyncHandler(updateIncidentEscalation),
);
router.delete(
  '/:id',
  ...readMiddleware,
  ...idValidators,
  validateRequest,
  asyncHandler(deleteIncidentEscalation),
);
router.post(
  '/:id/restore',
  ...readMiddleware,
  ...idValidators,
  validateRequest,
  asyncHandler(restoreIncidentEscalation),
);

export default router;
