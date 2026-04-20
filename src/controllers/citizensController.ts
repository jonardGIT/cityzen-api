import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { createCrudController } from '../engine/crudControllerFactory.js';
import { createBodyValidators } from '../engine/validatorFactory.js';
import { citizensListQueryConfig } from '../utils/listQueryConfig.js';
import type { ContentTypeConfig } from '../engine/types.js';
import type { Citizen } from '../types/models.js';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import { withActiveRecords } from '../utils/archive.js';
import {
  AMBIGUOUS_LINKED_CITIZEN_MESSAGE,
  CONFLICTING_LINKED_CITIZEN_MESSAGE,
  MANUAL_LINK_REQUIRED_LINKED_CITIZEN_MESSAGE,
  assignCitizenToUser,
  resolveLinkedCitizenForAuthUser,
} from '../services/userCitizenLinkService.js';

const config: ContentTypeConfig = {
  modelName: 'citizen',
  displayName: 'Citizen',
  listQueryConfig: citizensListQueryConfig,
  fields: [
    { name: 'name', requiredOnCreate: true },
    { name: 'contactInfo', requiredOnCreate: true },
    { name: 'preferredChannel', requiredOnCreate: true },
  ],
  allowedIncludes: {
    incidents: {
      fragment: { where: withActiveRecords() },
      children: {
        status: true,
        category: true,
        severity: true,
        mediaFiles: true,
      },
    },
  },
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

export async function getMyCitizenProfile(req: Request, res: Response): Promise<void> {
  const { authUser } = req as AuthenticatedRequest;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const resolution = await resolveLinkedCitizenForAuthUser({
    id: authUser.id,
    email: authUser.email,
  });

  if (resolution.status === 'ambiguous') {
    res.status(409).json({ message: AMBIGUOUS_LINKED_CITIZEN_MESSAGE });
    return;
  }

  if (resolution.status === 'conflict') {
    res.status(409).json({ message: CONFLICTING_LINKED_CITIZEN_MESSAGE });
    return;
  }

  if (resolution.status === 'manual-link-required') {
    res.status(409).json({ message: MANUAL_LINK_REQUIRED_LINKED_CITIZEN_MESSAGE });
    return;
  }

  if (resolution.status === 'missing') {
    res.status(404).json({ message: 'Citizen profile not found for authenticated user' });
    return;
  }

  const citizen = await prisma.citizen.findFirst({
    where: withActiveRecords({ id: resolution.citizenId }),
  });

  if (!citizen) {
    res.status(404).json({ message: 'Citizen profile not found for authenticated user' });
    return;
  }

  res.json(citizen);
}

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

  const resolution = await resolveLinkedCitizenForAuthUser({
    id: authUser.id,
    email: authUser.email,
  });

  if (resolution.status === 'ambiguous') {
    res.status(409).json({ message: AMBIGUOUS_LINKED_CITIZEN_MESSAGE });
    return;
  }

  if (resolution.status === 'conflict') {
    res.status(409).json({ message: CONFLICTING_LINKED_CITIZEN_MESSAGE });
    return;
  }

  if (resolution.status === 'manual-link-required') {
    res.status(409).json({ message: MANUAL_LINK_REQUIRED_LINKED_CITIZEN_MESSAGE });
    return;
  }

  const existingCitizenId = resolution.status === 'linked' ? resolution.citizenId : null;

  if (!existingCitizenId) {
    if (!name || !preferredChannel) {
      res.status(422).json({
        message:
          'name and preferredChannel are required when creating a new linked citizen profile',
      });
      return;
    }

    const citizen = await prisma.$transaction(async (transaction) => {
      const createdCitizen = await transaction.citizen.create({
        data: {
          name,
          preferredChannel,
          contactInfo: authUser.email,
        },
      });

      await assignCitizenToUser(authUser.id, createdCitizen.id, transaction);

      return createdCitizen;
    });

    res.status(201).json(citizen);
    return;
  }

  const citizen = await prisma.citizen.update({
    where: { id: existingCitizenId },
    data: {
      name,
      preferredChannel,
    },
  });

  res.json(citizen);
}
