import { createCrudRouter } from '../engine/routeFactory.js';
import {
  getBarangays,
  getBarangayById,
  createBarangay,
  updateBarangay,
  deleteBarangay,
  restoreBarangay,
  validators,
} from '../controllers/barangaysController.js';
import { GEO_READ_ROLES, GEO_ADMIN_ROLES } from '../types/auth.js';

export default createCrudRouter({
  handlers: {
    getAll: getBarangays,
    getById: getBarangayById,
    create: createBarangay,
    update: updateBarangay,
    remove: deleteBarangay,
    restore: restoreBarangay,
  },
  readRoles: [...GEO_READ_ROLES],
  writeRoles: [...GEO_ADMIN_ROLES],
  createValidator: validators.create,
  updateValidator: validators.update,
});
