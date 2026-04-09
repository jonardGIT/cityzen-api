import { createCrudRouter } from '../engine/routeFactory.js';
import {
  getStatuses,
  getStatusById,
  createStatus,
  updateStatus,
  deleteStatus,
  restoreStatus,
  validators,
} from '../controllers/statusesController.js';
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
  createValidator: validators.create,
  updateValidator: validators.update,
});
