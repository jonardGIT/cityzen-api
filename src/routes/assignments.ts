import { Router } from 'express';
import {
  createAssignment,
  deleteAssignment,
  getAssignmentById,
  getAssignments,
  updateAssignment,
} from '../controllers/assignmentsController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createAssignmentValidator, updateAssignmentValidator } from '../validators/bodyValidators.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { DISPATCH_ROLES } from '../types/auth.js';

const router = Router();

router.get('/', requireJwtAuth, requireRole(...DISPATCH_ROLES), asyncHandler(getAssignments));
router.get('/:id', requireJwtAuth, requireRole(...DISPATCH_ROLES), asyncHandler(getAssignmentById));
router.post(
  '/',
  requireJwtAuth,
  requireRole(...DISPATCH_ROLES),
  createAssignmentValidator,
  validateRequest,
  asyncHandler(createAssignment)
);
router.patch(
  '/:id',
  requireJwtAuth,
  requireRole(...DISPATCH_ROLES),
  updateAssignmentValidator,
  validateRequest,
  asyncHandler(updateAssignment)
);
router.delete('/:id', requireJwtAuth, requireRole(...DISPATCH_ROLES), asyncHandler(deleteAssignment));

export default router;
