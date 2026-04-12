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
    { name: 'jurisdictionType', nullable: true },
    { name: 'jurisdictionId', nullable: true },
    { name: 'agencyType', nullable: true },
    { name: 'regionId', nullable: true },
    { name: 'provinceId', nullable: true },
    { name: 'cityMunicipalityId', nullable: true },
    { name: 'barangayId', nullable: true },
  ],
  allowedIncludes: {
    responders: {
      fragment: { where: withActiveRecords() },
      children: {
        agency: true,
      },
    },
    regionRef: true,
    provinceRef: true,
    cityMunicipalityRef: true,
    barangayRef: true,
  },
  foreignKeys: [
    {
      field: 'regionId',
      targetModel: 'region',
      message: 'regionId does not reference a valid Region',
    },
    {
      field: 'provinceId',
      targetModel: 'province',
      message: 'provinceId does not reference a valid Province',
    },
    {
      field: 'cityMunicipalityId',
      targetModel: 'cityMunicipality',
      message: 'cityMunicipalityId does not reference a valid City/Municipality',
    },
    {
      field: 'barangayId',
      targetModel: 'barangay',
      message: 'barangayId does not reference a valid Barangay',
    },
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
export const validators = createBodyValidators(config.fields);

export const getAgencies = handlers.getAll;
export const getAgencyById = handlers.getById;
export const createAgency = handlers.create;
export const updateAgency = handlers.update;
export const deleteAgency = handlers.remove;
export const restoreAgency = handlers.restore;
