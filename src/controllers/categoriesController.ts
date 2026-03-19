// Handles CRUD operations for incident category lookup values.
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { getParamId } from '../utils/request.js';

// Returns all categories from the database.
export async function getCategories(_req: Request, res: Response): Promise<void> {
  const categories = await prisma.category.findMany();
  res.json(categories);
}

// Returns a single category by numeric ID. Responds 404 if not found.
export async function getCategoryById(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const category = await prisma.category.findUnique({
    where: { id },
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
  const existingCategory = await prisma.category.findUnique({ where: { id } });

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

  const existingCategory = await prisma.category.findUnique({ where: { id } });

  if (!existingCategory) {
    res.status(404).json({ message: 'Category not found' });
    return;
  }

  await prisma.category.delete({ where: { id } });
  res.status(204).send();
}
