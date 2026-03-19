// Handles CRUD operations for incident status lookup values.
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { getParamId } from '../utils/request.js';

// Returns all statuses from the database.
export async function getStatuses(_req: Request, res: Response): Promise<void> {
  const statuses = await prisma.status.findMany();
  res.json(statuses);
}

// Returns a single status by numeric ID. Responds 404 if not found.
export async function getStatusById(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const status = await prisma.status.findUnique({
    where: { id },
  });
  if (!status) {
    res.status(404).json({ message: 'Status not found' });
    return;
  }

  res.json(status);
}

// Creates a new status entry. Requires name.
export async function createStatus(req: Request, res: Response): Promise<void> {
  const { name } = req.body as { name?: string };

  if (!name) {
    res.status(422).json({ message: 'name is required' });
    return;
  }

  const status = await prisma.status.create({
    data: { name },
  });

  res.status(201).json(status);
}

// Updates an existing status entry.
export async function updateStatus(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const { name } = req.body as { name?: string };
  const existingStatus = await prisma.status.findUnique({ where: { id } });

  if (!existingStatus) {
    res.status(404).json({ message: 'Status not found' });
    return;
  }

  const status = await prisma.status.update({
    where: { id },
    data: { name },
  });

  res.json(status);
}

// Deletes an existing status entry.
export async function deleteStatus(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const existingStatus = await prisma.status.findUnique({ where: { id } });

  if (!existingStatus) {
    res.status(404).json({ message: 'Status not found' });
    return;
  }

  await prisma.status.delete({ where: { id } });
  res.status(204).send();
}
