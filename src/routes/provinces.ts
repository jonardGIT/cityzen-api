import { createCrudRouter } from '../engine/routeFactory.js';
import {
  getProvinces,
  getProvinceById,
  createProvince,
  updateProvince,
  deleteProvince,
  restoreProvince,
  validators,
} from '../controllers/provincesController.js';
import { GEO_READ_ROLES, GEO_ADMIN_ROLES } from '../types/auth.js';

export default createCrudRouter({
  handlers: {
    getAll: getProvinces,
    getById: getProvinceById,
    create: createProvince,
    update: updateProvince,
    remove: deleteProvince,
    restore: restoreProvince,
  },
  readRoles: [...GEO_READ_ROLES],
  writeRoles: [...GEO_ADMIN_ROLES],
  createValidator: validators.create,
  updateValidator: validators.update,
});
