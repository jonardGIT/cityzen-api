// Handles CRUD operations for incident severity lookup values.
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { getParamId } from '../utils/request.js';

// Returns all severities from the database.
export async function getSeverities(_req: Request, res: Response): Promise<void> {
  const severities = await prisma.severity.findMany();
  res.json(severities);
}

// Returns a single severity by numeric ID. Responds 404 if not found.
export async function getSeverityById(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const severity = await prisma.severity.findUnique({
    where: { id },
  });
  if (!severity) {
    res.status(404).json({ message: 'Severity not found' });
    return;
  }

  res.json(severity);
}

// Creates a new severity entry. Requires level; definition is optional.
export async function createSeverity(req: Request, res: Response): Promise<void> {
  const { level, definition } = req.body as { level?: string; definition?: string };

  if (!level) {
    res.status(422).json({ message: 'level is required' });
    return;
  }

  const severity = await prisma.severity.create({
    data: {
      level,
      definition: definition || null,
    },
  });

  res.status(201).json(severity);
}

// Updates an existing severity entry.
export async function updateSeverity(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const { level, definition } = req.body as { level?: string; definition?: string | null };
  const existingSeverity = await prisma.severity.findUnique({ where: { id } });

  if (!existingSeverity) {
    res.status(404).json({ message: 'Severity not found' });
    return;
  }

  const severity = await prisma.severity.update({
    where: { id },
    data: {
      level,
      definition: definition === undefined ? undefined : definition || null,
    },
  });

  res.json(severity);
}

// Deletes an existing severity entry.
export async function deleteSeverity(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const existingSeverity = await prisma.severity.findUnique({ where: { id } });

  if (!existingSeverity) {
    res.status(404).json({ message: 'Severity not found' });
    return;
  }

  await prisma.severity.delete({ where: { id } });
  res.status(204).send();
}
