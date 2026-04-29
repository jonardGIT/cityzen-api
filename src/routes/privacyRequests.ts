import { Router } from 'express';
import { param } from 'express-validator';
import {
  createMyDataSubjectRequest,
  getMyDataSubjectRequestById,
  listMyDataSubjectRequests,
} from '../controllers/privacyRequestsController.js';
import { requireJwtAuth } from '../middleware/jwtAuth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createDataSubjectRequestValidator, isPostgresUuid } from '../validators/bodyValidators.js';

const router = Router();

const requestIdValidator = [
  param('id')
    .custom((value) => isPostgresUuid(value))
    .withMessage('id must be a valid UUID'),
];

router.get('/', requireJwtAuth, asyncHandler(listMyDataSubjectRequests));
router.get(
  '/:id',
  requireJwtAuth,
  ...requestIdValidator,
  validateRequest,
  asyncHandler(getMyDataSubjectRequestById),
);
router.post(
  '/',
  requireJwtAuth,
  ...createDataSubjectRequestValidator,
  validateRequest,
  asyncHandler(createMyDataSubjectRequest),
);

export default router;
