import { createCrudRouter } from '../engine/routeFactory.js';
import {
  getStatuses,
  getStatusById,
  createStatus,
  updateStatus,
  deleteStatus,
  restoreStatus,
} from '../controllers/statusesController.js';
import { createStatusValidator, updateStatusValidator } from '../validators/bodyValidators.js';
import { ADMIN_ROLES } from '../types/auth.js';

export default createCrudRouter({
  handlers: {
    getAll: getStatuses,
    getById: getStatusById,
    create: createStatus,
    update: updateStatus,
    remove: deleteStatus,
    restore: restoreStatus,
  },
  writeRoles: [...ADMIN_ROLES],
  createValidator: createStatusValidator,
  updateValidator: updateStatusValidator,
});
