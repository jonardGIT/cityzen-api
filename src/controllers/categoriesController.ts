import { createCrudController } from '../engine/crudControllerFactory.js';
import { createBodyValidators } from '../engine/validatorFactory.js';
import type { Request, Response } from 'express';
import { ensureBaselineIncidentCategories } from '../services/incidentReferenceDataService.js';
import { categoriesListQueryConfig } from '../utils/listQueryConfig.js';
import type { ContentTypeConfig } from '../engine/types.js';

const config: ContentTypeConfig = {
  modelName: 'category',
  displayName: 'Category',
  listQueryConfig: categoriesListQueryConfig,
  fields: [
    { name: 'name', requiredOnCreate: true },
    { name: 'subCategory', nullable: true },
  ],
  deleteGuards: [
    {
      model: 'citizenIncident',
      foreignKey: 'categoryId',
      message: 'Conflict: category is still referenced by active incidents',
    },
  ],
};

const handlers = createCrudController(config);
export const validators = createBodyValidators(config.fields);

export const getCategories = async (req: Request, res: Response) => {
  await ensureBaselineIncidentCategories();
  return handlers.getAll(req, res);
};
export const getCategoryById = handlers.getById;
export const createCategory = handlers.create;
export const updateCategory = handlers.update;
export const deleteCategory = handlers.remove;
export const restoreCategory = handlers.restore;
