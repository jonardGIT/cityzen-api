import { createCrudController } from '../engine/crudControllerFactory.js';
import { createBodyValidators } from '../engine/validatorFactory.js';
import { respondersListQueryConfig } from '../utils/listQueryConfig.js';
import type { ContentTypeConfig } from '../engine/types.js';

const config: ContentTypeConfig = {
  modelName: 'responder',
  displayName: 'Responder',
  listQueryConfig: respondersListQueryConfig,
  fields: [
    { name: 'name', requiredOnCreate: true },
    { name: 'agencyId', requiredOnCreate: true },
    { name: 'role', requiredOnCreate: true },
    { name: 'contactInfo', requiredOnCreate: true },
  ],
  include: { agency: true },
  foreignKeys: [
    {
      field: 'agencyId',
      targetModel: 'agency',
      message: 'agencyId does not reference a valid Agency',
    },
  ],
  deleteGuards: [
    {
      model: 'assignment',
      foreignKey: 'responderId',
      message: 'Conflict: responder still has active assignments',
    },
  ],
  restoreGuards: [
    {
      foreignKeyOnRecord: 'agencyId',
      targetModel: 'agency',
      message: 'Conflict: responder cannot be restored while its agency is archived',
    },
  ],
};

const handlers = createCrudController(config);
export const validators = createBodyValidators(config.fields);

export const getResponders = handlers.getAll;
export const getResponderById = handlers.getById;
export const createResponder = handlers.create;
export const updateResponder = handlers.update;
export const deleteResponder = handlers.remove;
export const restoreResponder = handlers.restore;
