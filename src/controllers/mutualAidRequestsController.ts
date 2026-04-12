import { createCrudController } from '../engine/crudControllerFactory.js';
import { createBodyValidators } from '../engine/validatorFactory.js';
import { mutualAidRequestsListQueryConfig } from '../utils/listQueryConfig.js';
import type { ContentTypeConfig } from '../engine/types.js';

const VALID_STATUSES = ['requested', 'approved', 'deployed', 'completed', 'declined'] as const;

const config: ContentTypeConfig = {
  modelName: 'mutualAidRequest',
  displayName: 'Mutual Aid Request',
  listQueryConfig: mutualAidRequestsListQueryConfig,
  fields: [
    { name: 'incidentId', requiredOnCreate: true },
    { name: 'requestingJurisdictionId', requiredOnCreate: true },
    { name: 'targetJurisdictionId', requiredOnCreate: true },
    { name: 'requestedById', requiredOnCreate: true },
    { name: 'status', requiredOnCreate: true, requiredOnUpdate: true },
    { name: 'notes', nullable: true },
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

export const getMutualAidRequests = handlers.getAll;
export const getMutualAidRequestById = handlers.getById;
export const createMutualAidRequest = handlers.create;
export const updateMutualAidRequest = handlers.update;
export const deleteMutualAidRequest = handlers.remove;
export const restoreMutualAidRequest = handlers.restore;

export { VALID_STATUSES };
