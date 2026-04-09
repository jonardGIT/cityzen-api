import { createCrudController } from '../engine/crudControllerFactory.js';
import { severitiesListQueryConfig } from '../utils/listQueryConfig.js';
import type { ContentTypeConfig } from '../engine/types.js';

const config: ContentTypeConfig = {
  modelName: 'severity',
  displayName: 'Severity',
  listQueryConfig: severitiesListQueryConfig,
  fields: [
    { name: 'level', requiredOnCreate: true },
    { name: 'definition', nullable: true },
  ],
  deleteGuards: [
    {
      model: 'citizenIncident',
      foreignKey: 'severityId',
      message: 'Conflict: severity is still referenced by active incidents',
    },
  ],
};

const handlers = createCrudController(config);

export const getSeverities = handlers.getAll;
export const getSeverityById = handlers.getById;
export const createSeverity = handlers.create;
export const updateSeverity = handlers.update;
export const deleteSeverity = handlers.remove;
export const restoreSeverity = handlers.restore;
