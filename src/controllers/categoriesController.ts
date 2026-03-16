import type { Request, Response } from 'express';
import { categories, getNextId } from '../data/store.js';
import { getParamId } from '../utils/request.js';
import type { Category } from '../types/models.js';

export function getCategories(_req: Request, res: Response): void {
  res.json(categories);
}

export function getCategoryById(req: Request, res: Response): void {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const category = categories.find((item) => item.id === id);
  if (!category) {
    res.status(404).json({ message: 'Category not found' });
    return;
  }

  res.json(category);
}

export function createCategory(req: Request, res: Response): void {
  const { name, subCategory } = req.body as Partial<Category>;

  if (!name) {
    res.status(422).json({ message: 'name is required' });
    return;
  }

  const category: Category = {
    id: getNextId(categories),
    name,
    subCategory,
  };

  categories.push(category);
  res.status(201).json(category);
}
