import { Router } from 'express';
import {
  createCategory,
  getCategories,
  getCategoryById,
} from '../controllers/categoriesController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createCategoryValidator } from '../validators/bodyValidators.js';

const router = Router();

router.get('/', asyncHandler(getCategories));
router.get('/:id', asyncHandler(getCategoryById));
router.post('/', createCategoryValidator, validateRequest, asyncHandler(createCategory));

export default router;
