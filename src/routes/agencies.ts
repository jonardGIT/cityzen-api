import { createCrudRouter } from '../engine/routeFactory.js';
import {
  getAgencies,
  getAgencyById,
  createAgency,
  updateAgency,
  deleteAgency,
  restoreAgency,
} from '../controllers/agenciesController.js';
import { createAgencyValidator, updateAgencyValidator } from '../validators/bodyValidators.js';
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
  createValidator: createAgencyValidator,
  updateValidator: updateAgencyValidator,
});
