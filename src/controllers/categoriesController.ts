import { createCrudController } from '../engine/crudControllerFactory.js';
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

export const getCategories = handlers.getAll;
export const getCategoryById = handlers.getById;
export const createCategory = handlers.create;
export const updateCategory = handlers.update;
export const deleteCategory = handlers.remove;
export const restoreCategory = handlers.restore;
