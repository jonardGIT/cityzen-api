import { createCrudRouter } from '../engine/routeFactory.js';
import {
  getCitizens,
  getCitizenById,
  createCitizen,
  linkMyCitizenProfile,
  updateCitizen,
  deleteCitizen,
  restoreCitizen,
  validators,
} from '../controllers/citizensController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { linkMyCitizenProfileValidator } from '../validators/bodyValidators.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { ADMIN_ROLES } from '../types/auth.js';

const router = createCrudRouter({
  handlers: {
    getAll: getCitizens,
    getById: getCitizenById,
    create: createCitizen,
    update: updateCitizen,
    remove: deleteCitizen,
    restore: restoreCitizen,
  },
  readRoles: [...ADMIN_ROLES],
  writeRoles: [...ADMIN_ROLES],
  createValidator: validators.create,
  updateValidator: validators.update,
});

router.post(
  '/link-me',
  requireJwtAuth,
  requireRole('CITIZEN_REPORTER'),
  ...linkMyCitizenProfileValidator,
  validateRequest,
  asyncHandler(linkMyCitizenProfile),
);

export default router;
