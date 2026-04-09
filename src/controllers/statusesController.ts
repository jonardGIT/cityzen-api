import { createCrudController } from '../engine/crudControllerFactory.js';
import { createBodyValidators } from '../engine/validatorFactory.js';
import { statusesListQueryConfig } from '../utils/listQueryConfig.js';
import type { ContentTypeConfig } from '../engine/types.js';

const config: ContentTypeConfig = {
  modelName: 'status',
  displayName: 'Status',
  listQueryConfig: statusesListQueryConfig,
  fields: [{ name: 'name', requiredOnCreate: true, requiredOnUpdate: true }],
  deleteGuards: [
    {
      model: 'citizenIncident',
      foreignKey: 'statusId',
      message: 'Conflict: status is still referenced by active incidents',
    },
  ],
};

const handlers = createCrudController(config);
export const validators = createBodyValidators(config.fields);

export const getStatuses = handlers.getAll;
export const getStatusById = handlers.getById;
export const createStatus = handlers.create;
export const updateStatus = handlers.update;
export const deleteStatus = handlers.remove;
export const restoreStatus = handlers.restore;
