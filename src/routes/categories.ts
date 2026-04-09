import { createCrudRouter } from '../engine/routeFactory.js';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
  validators,
} from '../controllers/categoriesController.js';
import { ADMIN_ROLES } from '../types/auth.js';

export default createCrudRouter({
  handlers: {
    getAll: getCategories,
    getById: getCategoryById,
    create: createCategory,
    update: updateCategory,
    remove: deleteCategory,
    restore: restoreCategory,
  },
  writeRoles: [...ADMIN_ROLES],
  createValidator: validators.create,
  updateValidator: validators.update,
});
