// Handles CRUD operations for incident category lookup values.
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import {
  buildPaginatedResponse,
  getListQuery,
  getPaginationQuery,
  getParamId,
} from '../utils/request.js';
import { categoriesListQueryConfig } from '../utils/listQueryConfig.js';
import {
  isArchiveEnabled,
  withActiveRecords,
  withArchivedRecords,
  withArchiveScope,
} from '../utils/archive.js';

// Returns all categories from the database.
export async function getCategories(req: Request, res: Response): Promise<void> {
  const pagination = getPaginationQuery(req);
  const listQuery = getListQuery(req, res, categoriesListQueryConfig);
  if (!listQuery) {
    return;
  }

  if (pagination.enabled) {
    const scopedWhere = withArchiveScope(listQuery.where as any, listQuery.archiveScope);
    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where: scopedWhere as any,
        orderBy: listQuery.orderBy as any,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.category.count({ where: scopedWhere as any }),
    ]);
    res.json(buildPaginatedResponse(categories, total, pagination));
    return;
  }

  const categories = await prisma.category.findMany({
    where: withArchiveScope(listQuery.where as any, listQuery.archiveScope) as any,
    orderBy: listQuery.orderBy as any,
  });
  res.json(categories);
}

// Returns a single category by numeric ID. Responds 404 if not found.
export async function getCategoryById(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const category = await prisma.category.findFirst({
    where: withActiveRecords({ id }) as any,
  });
  if (!category) {
    res.status(404).json({ message: 'Category not found' });
    return;
  }

  res.json(category);
}

// Creates a new category entry. Requires name; subCategory is optional.
export async function createCategory(req: Request, res: Response): Promise<void> {
  const { name, subCategory } = req.body as { name?: string; subCategory?: string };

  if (!name) {
    res.status(422).json({ message: 'name is required' });
    return;
  }

  const category = await prisma.category.create({
    data: {
      name,
      subCategory: subCategory || null,
    },
  });

  res.status(201).json(category);
}

// Updates an existing category entry.
export async function updateCategory(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const { name, subCategory } = req.body as { name?: string; subCategory?: string | null };
  const existingCategory = await prisma.category.findFirst({ where: withActiveRecords({ id }) as any });

  if (!existingCategory) {
    res.status(404).json({ message: 'Category not found' });
    return;
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      name,
      subCategory: subCategory === undefined ? undefined : subCategory || null,
    },
  });

  res.json(category);
}

// Deletes an existing category entry.
export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const existingCategory = await prisma.category.findFirst({ where: withActiveRecords({ id }) as any });

  if (!existingCategory) {
    res.status(404).json({ message: 'Category not found' });
    return;
  }

  const activeIncidentCount = await prisma.citizenIncident.count({
    where: withActiveRecords({ categoryId: id }) as any,
  });
  if (activeIncidentCount > 0) {
    res.status(409).json({ message: 'Conflict: category is still referenced by active incidents' });
    return;
  }

  if (isArchiveEnabled()) {
    await prisma.category.update({ where: { id }, data: { archivedAt: new Date() } });
  } else {
    await prisma.category.delete({ where: { id } });
  }
  res.status(204).send();
}

export async function restoreCategory(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  if (!isArchiveEnabled()) {
    res.status(409).json({ message: 'Archive mode is disabled; restore is unavailable' });
    return;
  }

  const existingCategory = await prisma.category.findFirst({ where: withArchivedRecords({ id }) as any });
  if (!existingCategory) {
    res.status(404).json({ message: 'Archived category not found' });
    return;
  }

  const category = await prisma.category.update({ where: { id }, data: { archivedAt: null } });
  res.json(category);
}
