import type { Request, Response } from 'express';
import { citizens, getNextId } from '../data/store.js';
import { getParamId } from '../utils/request.js';
import type { Citizen } from '../types/models.js';

export function getCitizens(_req: Request, res: Response): void {
  res.json(citizens);
}

export function getCitizenById(req: Request, res: Response): void {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const citizen = citizens.find((item) => item.id === id);
  if (!citizen) {
    res.status(404).json({ message: 'Citizen not found' });
    return;
  }

  res.json(citizen);
}

export function createCitizen(req: Request, res: Response): void {
  const { name, contactInfo, preferredChannel } = req.body as Partial<Citizen>;

  if (!name || !contactInfo || !preferredChannel) {
    res.status(400).json({ message: 'name, contactInfo, and preferredChannel are required' });
    return;
  }

  const citizen: Citizen = {
    id: getNextId(citizens),
    name,
    contactInfo,
    preferredChannel,
  };

  citizens.push(citizen);
  res.status(201).json(citizen);
}
