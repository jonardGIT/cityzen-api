import { Router } from 'express';
import { body } from 'express-validator';
import { param } from 'express-validator';
import {
  getMutualAidRequests,
  getMutualAidRequestById,
  createMutualAidRequest,
  updateMutualAidRequest,
  deleteMutualAidRequest,
  restoreMutualAidRequest,
  PATCHABLE_STATUSES,
  VALID_STATUSES,
} from '../controllers/mutualAidRequestsController.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const readMiddleware = [
  requireJwtAuth,
  requireRole('CITY_ADMIN', 'DISPATCHER', 'PROVINCIAL_ADMIN'),
];
const createMiddleware = [requireJwtAuth, requireRole('CITY_ADMIN', 'DISPATCHER')];
const patchMiddleware = [requireJwtAuth, requireRole('CITY_ADMIN', 'DISPATCHER')];

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
  exactBodyFields(['incidentId', 'targetJurisdictionId', 'notes']),
  body('incidentId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('incidentId is required')
    .bail()
    .isUUID()
    .withMessage('incidentId must be a valid UUID'),
  body('targetJurisdictionId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('targetJurisdictionId is required')
    .bail()
    .isUUID()
    .withMessage('targetJurisdictionId must be a valid UUID'),
  body('notes').optional({ nullable: true }).isString().withMessage('notes must be a string'),
];

const patchValidators = [
  exactBodyFields(['status']),
  body('status')
    .isIn([...PATCHABLE_STATUSES])
    .withMessage(`status must be one of: ${PATCHABLE_STATUSES.join(', ')}`),
];

const idValidators = [param('id').isUUID().withMessage('id must be a valid UUID')];

router.get('/', ...readMiddleware, asyncHandler(getMutualAidRequests));
router.get(
  '/:id',
  ...readMiddleware,
  ...idValidators,
  validateRequest,
  asyncHandler(getMutualAidRequestById),
);
router.post(
  '/',
  ...createMiddleware,
  ...createValidators,
  validateRequest,
  asyncHandler(createMutualAidRequest),
);
router.patch(
  '/:id',
  ...patchMiddleware,
  ...idValidators,
  ...patchValidators,
  validateRequest,
  asyncHandler(updateMutualAidRequest),
);
router.delete(
  '/:id',
  ...readMiddleware,
  ...idValidators,
  validateRequest,
  asyncHandler(deleteMutualAidRequest),
);
router.post(
  '/:id/restore',
  ...readMiddleware,
  ...idValidators,
  validateRequest,
  asyncHandler(restoreMutualAidRequest),
);

export default router;
