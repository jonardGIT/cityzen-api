import { createCrudRouter } from '../engine/routeFactory.js';
import {
  getAgencies,
  getAgencyById,
  createAgency,
  updateAgency,
  deleteAgency,
  restoreAgency,
  validators,
} from '../controllers/agenciesController.js';
import { ADMIN_ROLES, DISPATCH_ROLES } from '../types/auth.js';

export default createCrudRouter({
  handlers: {
    getAll: getAgencies,
    getById: getAgencyById,
    create: createAgency,
    update: updateAgency,
    remove: deleteAgency,
    restore: restoreAgency,
  },
  readRoles: [...DISPATCH_ROLES],
  writeRoles: [...ADMIN_ROLES],
  createValidator: validators.create,
  updateValidator: validators.update,
});
