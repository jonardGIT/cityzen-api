import { createCrudRouter } from '../engine/routeFactory.js';
import {
  createMobileAppContent,
  deleteMobileAppContent,
  getMobileAppContentById,
  getMobileAppContents,
  mobileAppContentValidators,
  restoreMobileAppContent,
  updateMobileAppContent,
} from '../controllers/mobileAppContentsController.js';
import { MOBILE_CONTENT_ROLES } from '../types/auth.js';

export default createCrudRouter({
  handlers: {
    getAll: getMobileAppContents,
    getById: getMobileAppContentById,
    create: createMobileAppContent,
    update: updateMobileAppContent,
    remove: deleteMobileAppContent,
    restore: restoreMobileAppContent,
  },
  readRoles: [...MOBILE_CONTENT_ROLES],
  writeRoles: [...MOBILE_CONTENT_ROLES],
  createValidator: mobileAppContentValidators.create,
  updateValidator: mobileAppContentValidators.update,
});
