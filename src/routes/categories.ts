import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from '../controllers/categoriesController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createCategoryValidator, updateCategoryValidator } from '../validators/bodyValidators.js';
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
router.patch(
  '/:id',
  requireJwtAuth,
  requireRole(...ADMIN_ROLES),
  updateCategoryValidator,
  validateRequest,
  asyncHandler(updateCategory)
);
router.delete('/:id', requireJwtAuth, requireRole(...ADMIN_ROLES), asyncHandler(deleteCategory));

export default router;
