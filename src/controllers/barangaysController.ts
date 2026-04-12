import { createCrudController } from '../engine/crudControllerFactory.js';
import { createBodyValidators } from '../engine/validatorFactory.js';
import { barangaysListQueryConfig } from '../utils/listQueryConfig.js';
import type { ContentTypeConfig } from '../engine/types.js';

const config: ContentTypeConfig = {
  modelName: 'barangay',
  displayName: 'Barangay',
  listQueryConfig: barangaysListQueryConfig,
  fields: [
    { name: 'code', requiredOnCreate: true, requiredOnUpdate: true },
    { name: 'name', requiredOnCreate: true, requiredOnUpdate: true },
    { name: 'cityMunicipalityId', requiredOnCreate: true },
  ],
  include: { cityMunicipality: true },
  allowedIncludes: {
    cityMunicipality: {
      children: {
        province: {
          children: { region: true },
        },
      },
    },
  },
  foreignKeys: [
    {
      field: 'cityMunicipalityId',
      targetModel: 'cityMunicipality',
      message: 'cityMunicipalityId does not reference a valid City/Municipality',
    },
  ],
  restoreGuards: [
    {
      foreignKeyOnRecord: 'cityMunicipalityId',
      targetModel: 'cityMunicipality',
      message: 'Conflict: barangay cannot be restored while its city/municipality is archived',
    },
  ],
};

const handlers = createCrudController(config);
export const validators = createBodyValidators(config.fields);

export const getBarangays = handlers.getAll;
export const getBarangayById = handlers.getById;
export const createBarangay = handlers.create;
export const updateBarangay = handlers.update;
export const deleteBarangay = handlers.remove;
export const restoreBarangay = handlers.restore;
