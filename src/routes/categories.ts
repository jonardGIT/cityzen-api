import { Router } from 'express';
import {
  createCategory,
  getCategories,
  getCategoryById,
} from '../controllers/categoriesController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createCategoryValidator } from '../validators/bodyValidators.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { ADMIN_ROLES } from '../types/auth.js';

const router = Router();

router.get('/', asyncHandler(getCategories));
router.get('/:id', asyncHandler(getCategoryById));
router.post(
  '/',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  createCategoryValidator,
  validateRequest,
  asyncHandler(createCategory)
);

export default router;
