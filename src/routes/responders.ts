import { createCrudRouter } from '../engine/routeFactory.js';
import {
  getResponders,
  getResponderById,
  createResponder,
  updateResponder,
  deleteResponder,
  restoreResponder,
  validators,
} from '../controllers/respondersController.js';
import { ADMIN_ROLES, DISPATCH_ROLES } from '../types/auth.js';

export default createCrudRouter({
  handlers: {
    getAll: getResponders,
    getById: getResponderById,
    create: createResponder,
    update: updateResponder,
    remove: deleteResponder,
    restore: restoreResponder,
  },
  readRoles: [...DISPATCH_ROLES],
  writeRoles: [...ADMIN_ROLES],
  createValidator: validators.create,
  updateValidator: validators.update,
});
