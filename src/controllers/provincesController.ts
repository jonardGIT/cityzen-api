import { createCrudController } from '../engine/crudControllerFactory.js';
import { createBodyValidators } from '../engine/validatorFactory.js';
import { provincesListQueryConfig } from '../utils/listQueryConfig.js';
import type { ContentTypeConfig } from '../engine/types.js';
import { withActiveRecords } from '../utils/archive.js';

const config: ContentTypeConfig = {
  modelName: 'province',
  displayName: 'Province',
  listQueryConfig: provincesListQueryConfig,
  fields: [
    { name: 'code', requiredOnCreate: true, requiredOnUpdate: true },
    { name: 'name', requiredOnCreate: true, requiredOnUpdate: true },
    { name: 'regionId', requiredOnCreate: true },
  ],
  include: { region: true },
  allowedIncludes: {
    region: true,
    cities: {
      fragment: { where: withActiveRecords() },
    },
  },
  foreignKeys: [
    {
      field: 'regionId',
      targetModel: 'region',
      message: 'regionId does not reference a valid Region',
    },
  ],
  deleteGuards: [
    {
      model: 'cityMunicipality',
      foreignKey: 'provinceId',
      message: 'Conflict: province still has active cities/municipalities',
    },
  ],
  restoreGuards: [
    {
      foreignKeyOnRecord: 'regionId',
      targetModel: 'region',
      message: 'Conflict: province cannot be restored while its region is archived',
    },
  ],
};

const handlers = createCrudController(config);
export const validators = createBodyValidators(config.fields);

export const getProvinces = handlers.getAll;
export const getProvinceById = handlers.getById;
export const createProvince = handlers.create;
export const updateProvince = handlers.update;
export const deleteProvince = handlers.remove;
export const restoreProvince = handlers.restore;
