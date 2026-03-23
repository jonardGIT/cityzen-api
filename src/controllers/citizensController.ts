// Handles CRUD operations for citizens who report incidents.
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { buildPaginatedResponse, getPaginationQuery, getParamId } from '../utils/request.js';
import type { Citizen } from '../types/models.js';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';

// Returns all citizens from the database.
export async function getCitizens(req: Request, res: Response): Promise<void> {
  const pagination = getPaginationQuery(req);
  if (pagination.enabled) {
    const [citizens, total] = await Promise.all([
      prisma.citizen.findMany({ skip: pagination.skip, take: pagination.take }),
      prisma.citizen.count(),
    ]);
    res.json(buildPaginatedResponse(citizens, total, pagination));
    return;
  }

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

// Creates or updates the authenticated viewer's citizen profile by binding contactInfo to auth email.
export async function linkMyCitizenProfile(req: Request, res: Response): Promise<void> {
  const { authUser } = req as AuthenticatedRequest;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const { name, preferredChannel } = req.body as Partial<Citizen>;
  if (!name && !preferredChannel) {
    res.status(422).json({ message: 'at least one of name or preferredChannel is required' });
    return;
  }

  const existingCitizen = await prisma.citizen.findFirst({
    where: { contactInfo: authUser.email },
  });

  if (!existingCitizen) {
    if (!name || !preferredChannel) {
      res.status(422).json({
        message: 'name and preferredChannel are required when creating a new linked citizen profile',
      });
      return;
    }

    const citizen = await prisma.citizen.create({
      data: {
        name,
        preferredChannel,
        contactInfo: authUser.email,
      },
    });

    res.status(201).json(citizen);
    return;
  }

  const citizen = await prisma.citizen.update({
    where: { id: existingCitizen.id },
    data: {
      name,
      preferredChannel,
    },
  });

  res.json(citizen);
}

// Updates an existing citizen record.
export async function updateCitizen(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const { name, contactInfo, preferredChannel } = req.body as Partial<Citizen>;
  const existingCitizen = await prisma.citizen.findUnique({ where: { id } });

  if (!existingCitizen) {
    res.status(404).json({ message: 'Citizen not found' });
    return;
  }

  const citizen = await prisma.citizen.update({
    where: { id },
    data: {
      name,
      contactInfo,
      preferredChannel,
    },
  });

  res.json(citizen);
}

// Deletes an existing citizen record.
export async function deleteCitizen(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const existingCitizen = await prisma.citizen.findUnique({ where: { id } });

  if (!existingCitizen) {
    res.status(404).json({ message: 'Citizen not found' });
    return;
  }

  await prisma.citizen.delete({ where: { id } });
  res.status(204).send();
}
