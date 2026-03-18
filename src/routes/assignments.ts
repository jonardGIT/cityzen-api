import { Router } from 'express';
import {
  createAssignment,
  getAssignmentById,
  getAssignments,
} from '../controllers/assignmentsController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createAssignmentValidator } from '../validators/bodyValidators.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { DISPATCH_ROLES } from '../types/auth.js';

const router = Router();

router.get('/', asyncHandler(getAssignments));
router.get('/:id', asyncHandler(getAssignmentById));
router.post(
  '/',
  requireJwtAuth,
  requireRole(...DISPATCH_ROLES),
  createAssignmentValidator,
  validateRequest,
  asyncHandler(createAssignment)
);

export default router;
