import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { createCrudController } from '../engine/crudControllerFactory.js';
import { createBodyValidators } from '../engine/validatorFactory.js';
import { citizensListQueryConfig } from '../utils/listQueryConfig.js';
import type { ContentTypeConfig } from '../engine/types.js';
import type { Citizen } from '../types/models.js';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import { withActiveRecords } from '../utils/archive.js';

const config: ContentTypeConfig = {
  modelName: 'citizen',
  displayName: 'Citizen',
  listQueryConfig: citizensListQueryConfig,
  fields: [
    { name: 'name', requiredOnCreate: true },
    { name: 'contactInfo', requiredOnCreate: true },
    { name: 'preferredChannel', requiredOnCreate: true },
  ],
  allowedIncludes: ['incidents'],
  deleteGuards: [
    {
      model: 'citizenIncident',
      foreignKey: 'citizenId',
      message: 'Conflict: citizen still has active incidents',
    },
  ],
};

const handlers = createCrudController(config);
export const validators = createBodyValidators(config.fields);

export const getCitizens = handlers.getAll;
export const getCitizenById = handlers.getById;
export const createCitizen = handlers.create;
export const updateCitizen = handlers.update;
export const deleteCitizen = handlers.remove;
export const restoreCitizen = handlers.restore;

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
    where: withActiveRecords({ contactInfo: authUser.email }),
  });

  if (!existingCitizen) {
    if (!name || !preferredChannel) {
      res.status(422).json({
        message:
          'name and preferredChannel are required when creating a new linked citizen profile',
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
