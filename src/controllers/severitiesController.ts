import type { Request, Response } from 'express';
import { severities, getNextId } from '../data/store.js';
import { getParamId } from '../utils/request.js';
import type { Severity } from '../types/models.js';

export function getSeverities(_req: Request, res: Response): void {
  res.json(severities);
}

export function getSeverityById(req: Request, res: Response): void {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const severity = severities.find((item) => item.id === id);
  if (!severity) {
    res.status(404).json({ message: 'Severity not found' });
    return;
  }

  res.json(severity);
}

export function createSeverity(req: Request, res: Response): void {
  const { level, definition } = req.body as Partial<Severity>;

  if (!level) {
    res.status(422).json({ message: 'level is required' });
    return;
  }

  const severity: Severity = {
    id: getNextId(severities),
    level,
    definition,
  };

  severities.push(severity);
  res.status(201).json(severity);
}
