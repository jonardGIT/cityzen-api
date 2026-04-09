import { createCrudRouter } from '../engine/routeFactory.js';
import {
  getSeverities,
  getSeverityById,
  createSeverity,
  updateSeverity,
  deleteSeverity,
  restoreSeverity,
} from '../controllers/severitiesController.js';
import { createSeverityValidator, updateSeverityValidator } from '../validators/bodyValidators.js';
import { ADMIN_ROLES } from '../types/auth.js';

export default createCrudRouter({
  handlers: {
    getAll: getSeverities,
    getById: getSeverityById,
    create: createSeverity,
    update: updateSeverity,
    remove: deleteSeverity,
    restore: restoreSeverity,
  },
  writeRoles: [...ADMIN_ROLES],
  createValidator: createSeverityValidator,
  updateValidator: updateSeverityValidator,
});
