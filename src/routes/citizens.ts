import { Router } from 'express';
import { createCitizen, getCitizenById, getCitizens } from '../controllers/citizensController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createCitizenValidator } from '../validators/bodyValidators.js';

const router = Router();

router.get('/', asyncHandler(getCitizens));
router.get('/:id', asyncHandler(getCitizenById));
router.post('/', createCitizenValidator, validateRequest, asyncHandler(createCitizen));

export default router;
