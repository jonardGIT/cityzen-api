import { Router } from 'express';
import {
  createAssignment,
  getAssignmentById,
  getAssignments,
} from '../controllers/assignmentsController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createAssignmentValidator } from '../validators/bodyValidators.js';

const router = Router();

router.get('/', asyncHandler(getAssignments));
router.get('/:id', asyncHandler(getAssignmentById));
router.post('/', createAssignmentValidator, validateRequest, asyncHandler(createAssignment));

export default router;
