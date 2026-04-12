import { createCrudRouter } from '../engine/routeFactory.js';
import {
  getRegions,
  getRegionById,
  createRegion,
  updateRegion,
  deleteRegion,
  restoreRegion,
  validators,
} from '../controllers/regionsController.js';
import { GEO_READ_ROLES, GEO_ADMIN_ROLES } from '../types/auth.js';

export default createCrudRouter({
  handlers: {
    getAll: getRegions,
    getById: getRegionById,
    create: createRegion,
    update: updateRegion,
    remove: deleteRegion,
    restore: restoreRegion,
  },
  readRoles: [...GEO_READ_ROLES],
  writeRoles: [...GEO_ADMIN_ROLES],
  createValidator: validators.create,
  updateValidator: validators.update,
});
