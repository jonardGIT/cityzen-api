import { createCrudController } from '../engine/crudControllerFactory.js';
import { createBodyValidators } from '../engine/validatorFactory.js';
import { incidentEscalationsListQueryConfig } from '../utils/listQueryConfig.js';
import type { ContentTypeConfig } from '../engine/types.js';

const VALID_LEVELS = ['barangay', 'city', 'province', 'region'] as const;
const LEVEL_ORDER: Record<string, number> = { barangay: 0, city: 1, province: 2, region: 3 };
const VALID_STATUSES = ['pending', 'accepted', 'declined'] as const;

const config: ContentTypeConfig = {
  modelName: 'incidentEscalation',
  displayName: 'Incident Escalation',
  listQueryConfig: incidentEscalationsListQueryConfig,
  fields: [
    { name: 'incidentId', requiredOnCreate: true },
    { name: 'fromLevel', requiredOnCreate: true },
    { name: 'toLevel', requiredOnCreate: true },
    { name: 'escalatedById', requiredOnCreate: true },
    { name: 'reason', requiredOnCreate: true },
    { name: 'status', requiredOnCreate: true, requiredOnUpdate: true },
  ],
  include: { incident: true },
  allowedIncludes: {
    incident: true,
  },
  foreignKeys: [
    {
      field: 'incidentId',
      targetModel: 'citizenIncident',
      message: 'incidentId does not reference a valid Incident',
    },
  ],
};

const handlers = createCrudController(config);
export const validators = createBodyValidators(config.fields);

export const getIncidentEscalations = handlers.getAll;
export const getIncidentEscalationById = handlers.getById;
export const createIncidentEscalation = handlers.create;
export const updateIncidentEscalation = handlers.update;
export const deleteIncidentEscalation = handlers.remove;
export const restoreIncidentEscalation = handlers.restore;

export { VALID_LEVELS, LEVEL_ORDER, VALID_STATUSES };
