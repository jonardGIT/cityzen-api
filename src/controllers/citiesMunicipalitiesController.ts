import { createCrudController } from '../engine/crudControllerFactory.js';
import { createBodyValidators } from '../engine/validatorFactory.js';
import { citiesMunicipalitiesListQueryConfig } from '../utils/listQueryConfig.js';
import type { ContentTypeConfig } from '../engine/types.js';
import { withActiveRecords } from '../utils/archive.js';
import {
  buildCityMunicipalityScopeWhere,
  validateCityMunicipalityMutationScope,
} from '../utils/geographyScope.js';

const config: ContentTypeConfig = {
  modelName: 'cityMunicipality',
  displayName: 'City/Municipality',
  listQueryConfig: citiesMunicipalitiesListQueryConfig,
  fields: [
    { name: 'code', requiredOnCreate: true, requiredOnUpdate: true },
    { name: 'name', requiredOnCreate: true, requiredOnUpdate: true },
    { name: 'type', requiredOnCreate: true },
    { name: 'provinceId', requiredOnCreate: true },
  ],
  include: { province: true },
  allowedIncludes: {
    province: {
      children: { region: true },
    },
    barangays: {
      fragment: { where: withActiveRecords() },
    },
  },
  foreignKeys: [
    {
      field: 'provinceId',
      targetModel: 'province',
      message: 'provinceId does not reference a valid Province',
    },
  ],
  deleteGuards: [
    {
      model: 'barangay',
      foreignKey: 'cityMunicipalityId',
      message: 'Conflict: city/municipality still has active barangays',
    },
  ],
  restoreGuards: [
    {
      foreignKeyOnRecord: 'provinceId',
      targetModel: 'province',
      message: 'Conflict: city/municipality cannot be restored while its province is archived',
    },
  ],
  hooks: {
    buildScopeWhere: buildCityMunicipalityScopeWhere,
    beforeCreate: validateCityMunicipalityMutationScope,
    beforeUpdate: async (req, res, body, existing) =>
      validateCityMunicipalityMutationScope(req, res, body, existing),
  },
};

const handlers = createCrudController(config);
export const validators = createBodyValidators(config.fields);

export const getCitiesMunicipalities = handlers.getAll;
export const getCityMunicipalityById = handlers.getById;
export const createCityMunicipality = handlers.create;
export const updateCityMunicipality = handlers.update;
export const deleteCityMunicipality = handlers.remove;
export const restoreCityMunicipality = handlers.restore;
