import { Router } from 'express';
import {
  createLocation,
  getLocationById,
  getLocations,
} from '../controllers/locationsController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createLocationValidator } from '../validators/bodyValidators.js';

const router = Router();

router.get('/', asyncHandler(getLocations));
router.get('/:id', asyncHandler(getLocationById));
router.post('/', createLocationValidator, validateRequest, asyncHandler(createLocation));

export default router;
