import { createCrudController } from '../engine/crudControllerFactory.js';
import { agenciesListQueryConfig } from '../utils/listQueryConfig.js';
import type { ContentTypeConfig } from '../engine/types.js';

const config: ContentTypeConfig = {
  modelName: 'agency',
  displayName: 'Agency',
  listQueryConfig: agenciesListQueryConfig,
  fields: [
    { name: 'name', requiredOnCreate: true },
    { name: 'contactNumber', nullable: true, trim: true },
  ],
  deleteGuards: [
    {
      model: 'responder',
      foreignKey: 'agencyId',
      message: 'Conflict: agency still has active responders',
    },
  ],
};

const handlers = createCrudController(config);

export const getAgencies = handlers.getAll;
export const getAgencyById = handlers.getById;
export const createAgency = handlers.create;
export const updateAgency = handlers.update;
export const deleteAgency = handlers.remove;
export const restoreAgency = handlers.restore;
