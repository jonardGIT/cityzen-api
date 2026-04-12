import { createCrudRouter } from '../engine/routeFactory.js';
import {
  getCitiesMunicipalities,
  getCityMunicipalityById,
  createCityMunicipality,
  updateCityMunicipality,
  deleteCityMunicipality,
  restoreCityMunicipality,
  validators,
} from '../controllers/citiesMunicipalitiesController.js';
import { GEO_READ_ROLES, GEO_ADMIN_ROLES } from '../types/auth.js';

export default createCrudRouter({
  handlers: {
    getAll: getCitiesMunicipalities,
    getById: getCityMunicipalityById,
    create: createCityMunicipality,
    update: updateCityMunicipality,
    remove: deleteCityMunicipality,
    restore: restoreCityMunicipality,
  },
  readRoles: [...GEO_READ_ROLES],
  writeRoles: [...GEO_ADMIN_ROLES],
  createValidator: validators.create,
  updateValidator: validators.update,
});
