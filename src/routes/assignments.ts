import { Router } from 'express';
import { param } from 'express-validator';
import {
  createAssignment,
  deleteAssignment,
  getAssignmentById,
  getAssignments,
  restoreAssignment,
  updateAssignment,
} from '../controllers/assignmentsController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createAssignmentValidator,
  isPostgresUuid,
  updateAssignmentValidator,
} from '../validators/bodyValidators.js';
import { isArchiveEnabled } from '../utils/archive.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { ASSIGNMENT_MANAGEMENT_ROLES } from '../types/auth.js';

const router = Router();
const idValidators = [
  param('id')
    .custom((value) => isPostgresUuid(value))
    .withMessage('id must be a valid UUID'),
];

router.get(
  '/',
  requireJwtAuth,
  requireRole(...ASSIGNMENT_MANAGEMENT_ROLES),
  asyncHandler(getAssignments),
);
router.get(
  '/:id',
  requireJwtAuth,
  requireRole(...ASSIGNMENT_MANAGEMENT_ROLES),
  ...idValidators,
  validateRequest,
  asyncHandler(getAssignmentById),
);
router.post(
  '/',
  requireJwtAuth,
  requireRole(...ASSIGNMENT_MANAGEMENT_ROLES),
  createAssignmentValidator,
  validateRequest,
  asyncHandler(createAssignment),
);
router.patch(
  '/:id',
  requireJwtAuth,
  requireRole(...ASSIGNMENT_MANAGEMENT_ROLES),
  ...idValidators,
  updateAssignmentValidator,
  validateRequest,
  asyncHandler(updateAssignment),
);
router.delete(
  '/:id',
  requireJwtAuth,
  requireRole(...ASSIGNMENT_MANAGEMENT_ROLES),
  ...idValidators,
  validateRequest,
  asyncHandler(deleteAssignment),
);

if (isArchiveEnabled()) {
  router.post(
    '/:id/restore',
    requireJwtAuth,
    requireRole(...ASSIGNMENT_MANAGEMENT_ROLES),
    ...idValidators,
    validateRequest,
    asyncHandler(restoreAssignment),
  );
}

export default router;
