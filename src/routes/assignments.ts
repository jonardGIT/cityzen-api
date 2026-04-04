import { Router } from 'express';
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
  updateAssignmentValidator,
} from '../validators/bodyValidators.js';
import { isArchiveEnabled } from '../utils/archive.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { ASSIGNMENT_MANAGEMENT_ROLES } from '../types/auth.js';

const router = Router();

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
  updateAssignmentValidator,
  validateRequest,
  asyncHandler(updateAssignment),
);
router.delete(
  '/:id',
  requireJwtAuth,
  requireRole(...ASSIGNMENT_MANAGEMENT_ROLES),
  asyncHandler(deleteAssignment),
);

if (isArchiveEnabled()) {
  router.post(
    '/:id/restore',
    requireJwtAuth,
    requireRole(...ASSIGNMENT_MANAGEMENT_ROLES),
    asyncHandler(restoreAssignment),
  );
}

export default router;
