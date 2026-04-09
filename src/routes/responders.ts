import { createCrudRouter } from '../engine/routeFactory.js';
import {
  getResponders,
  getResponderById,
  createResponder,
  updateResponder,
  deleteResponder,
  restoreResponder,
} from '../controllers/respondersController.js';
import {
  createResponderValidator,
  updateResponderValidator,
} from '../validators/bodyValidators.js';
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
  createValidator: createResponderValidator,
  updateValidator: updateResponderValidator,
});
