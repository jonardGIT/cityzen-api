import type { Request, Response } from 'express';
import { responders, getNextId } from '../data/store.js';
import { getParamId } from '../utils/request.js';
import type { Responder } from '../types/models.js';

export function getResponders(_req: Request, res: Response): void {
  res.json(responders);
}

export function getResponderById(req: Request, res: Response): void {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const responder = responders.find((item) => item.id === id);
  if (!responder) {
    res.status(404).json({ message: 'Responder not found' });
    return;
  }

  res.json(responder);
}

export function createResponder(req: Request, res: Response): void {
  const { name, agency, role, contactInfo } = req.body as Partial<Responder>;

  if (!name || !agency || !role || !contactInfo) {
    res.status(400).json({ message: 'name, agency, role, and contactInfo are required' });
    return;
  }

  const responder: Responder = {
    id: getNextId(responders),
    name,
    agency,
    role,
    contactInfo,
  };

  responders.push(responder);
  res.status(201).json(responder);
}
