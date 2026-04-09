import { createCrudController } from '../engine/crudControllerFactory.js';
import { createBodyValidators } from '../engine/validatorFactory.js';
import { agenciesListQueryConfig } from '../utils/listQueryConfig.js';
import type { ContentTypeConfig } from '../engine/types.js';
import { withActiveRecords } from '../utils/archive.js';

const config: ContentTypeConfig = {
  modelName: 'agency',
  displayName: 'Agency',
  listQueryConfig: agenciesListQueryConfig,
  fields: [
    { name: 'name', requiredOnCreate: true, requiredOnUpdate: true },
    { name: 'contactNumber', nullable: true, trim: true, maxLength: 20 },
  ],
  allowedIncludes: {
    responders: {
      fragment: { where: withActiveRecords() },
      children: {
        agency: true,
      },
    },
  },
  deleteGuards: [
    {
      model: 'responder',
      foreignKey: 'agencyId',
      message: 'Conflict: agency still has active responders',
    },
  ],
};

const handlers = createCrudController(config);
export const validators = createBodyValidators(config.fields);

export const getAgencies = handlers.getAll;
export const getAgencyById = handlers.getById;
export const createAgency = handlers.create;
export const updateAgency = handlers.update;
export const deleteAgency = handlers.remove;
export const restoreAgency = handlers.restore;
