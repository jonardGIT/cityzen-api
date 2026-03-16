import type { Request, Response } from 'express';
import { statuses, getNextId } from '../data/store.js';
import { getParamId } from '../utils/request.js';
import type { Status } from '../types/models.js';

export function getStatuses(_req: Request, res: Response): void {
  res.json(statuses);
}

export function getStatusById(req: Request, res: Response): void {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const status = statuses.find((item) => item.id === id);
  if (!status) {
    res.status(404).json({ message: 'Status not found' });
    return;
  }

  res.json(status);
}

export function createStatus(req: Request, res: Response): void {
  const { name } = req.body as Partial<Status>;

  if (!name) {
    res.status(422).json({ message: 'name is required' });
    return;
  }

  const status: Status = {
    id: getNextId(statuses),
    name,
  };

  statuses.push(status);
  res.status(201).json(status);
}
