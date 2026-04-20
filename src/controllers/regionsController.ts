import { createCrudController } from '../engine/crudControllerFactory.js';
import { createBodyValidators } from '../engine/validatorFactory.js';
import { regionsListQueryConfig } from '../utils/listQueryConfig.js';
import type { ContentTypeConfig } from '../engine/types.js';
import { withActiveRecords } from '../utils/archive.js';

const config: ContentTypeConfig = {
  modelName: 'region',
  displayName: 'Region',
  listQueryConfig: regionsListQueryConfig,
  fields: [
    { name: 'code', requiredOnCreate: true, requiredOnUpdate: true },
    { name: 'name', requiredOnCreate: true, requiredOnUpdate: true },
    { name: 'designation', nullable: true },
  ],
  allowedIncludes: {
    provinces: {
      fragment: { where: withActiveRecords() },
    },
  },
  deleteGuards: [
    {
      model: 'province',
      foreignKey: 'regionId',
      message: 'Conflict: region still has active provinces',
    },
  ],
};

const handlers = createCrudController(config);
export const validators = createBodyValidators(config.fields);

export const getRegions = handlers.getAll;
export const getRegionById = handlers.getById;
export const createRegion = handlers.create;
export const updateRegion = handlers.update;
export const deleteRegion = handlers.remove;
export const restoreRegion = handlers.restore;
