// Handles CRUD operations for citizens who report incidents.
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { getParamId } from '../utils/request.js';
import type { Citizen } from '../types/models.js';

// Returns all citizens from the database.
export async function getCitizens(_req: Request, res: Response): Promise<void> {
  const citizens = await prisma.citizen.findMany();
  res.json(citizens);
}

// Returns a single citizen by numeric ID. Responds 404 if not found.
export async function getCitizenById(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const citizen = await prisma.citizen.findUnique({
    where: { id },
  });

  if (!citizen) {
    res.status(404).json({ message: 'Citizen not found' });
    return;
  }

  res.json(citizen);
}

// Creates a new citizen record. Requires name, contactInfo, and preferredChannel.
export async function createCitizen(req: Request, res: Response): Promise<void> {
  const { name, contactInfo, preferredChannel } = req.body as Partial<Citizen>;

  if (!name || !contactInfo || !preferredChannel) {
    res.status(422).json({ message: 'name, contactInfo, and preferredChannel are required' });
    return;
  }

  const citizen = await prisma.citizen.create({
    data: {
      name,
      contactInfo,
      preferredChannel,
    },
  });

  res.status(201).json(citizen);
}
