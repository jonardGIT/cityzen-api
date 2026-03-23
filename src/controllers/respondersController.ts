// Handles CRUD operations for emergency responders.
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { buildPaginatedResponse, getPaginationQuery, getParamId } from '../utils/request.js';
import type { Responder } from '../types/models.js';

const responderInclude = {
  agency: true,
} as const;

// Returns all responders from the database.
export async function getResponders(req: Request, res: Response): Promise<void> {
  const pagination = getPaginationQuery(req);
  if (pagination.enabled) {
    const [responders, total] = await Promise.all([
      prisma.responder.findMany({
        include: responderInclude,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.responder.count(),
    ]);
    res.json(buildPaginatedResponse(responders, total, pagination));
    return;
  }

  const responders = await prisma.responder.findMany({ include: responderInclude });
  res.json(responders);
}

// Returns a single responder by numeric ID. Responds 404 if not found.
export async function getResponderById(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const responder = await prisma.responder.findUnique({
    where: { id },
    include: responderInclude,
  });

  if (!responder) {
    res.status(404).json({ message: 'Responder not found' });
    return;
  }

  res.json(responder);
}

// Creates a new responder record. Requires name, agencyId, role, and contactInfo.
export async function createResponder(req: Request, res: Response): Promise<void> {
  const { name, agencyId, role, contactInfo } = req.body as Partial<Responder>;

  if (!name || !agencyId || !role || !contactInfo) {
    res.status(422).json({ message: 'name, agencyId, role, and contactInfo are required' });
    return;
  }

  if (!(await prisma.agency.findUnique({ where: { id: agencyId } }))) {
    res.status(422).json({ message: 'agencyId does not reference a valid Agency' });
    return;
  }

  const responder = await prisma.responder.create({
    data: {
      name,
      agencyId,
      role,
      contactInfo,
    },
    include: responderInclude,
  });

  res.status(201).json(responder);
}

// Updates an existing responder record.
export async function updateResponder(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const { name, agencyId, role, contactInfo } = req.body as Partial<Responder>;
  const existingResponder = await prisma.responder.findUnique({ where: { id } });

  if (!existingResponder) {
    res.status(404).json({ message: 'Responder not found' });
    return;
  }

  if (agencyId !== undefined && !(await prisma.agency.findUnique({ where: { id: agencyId } }))) {
    res.status(422).json({ message: 'agencyId does not reference a valid Agency' });
    return;
  }

  const responder = await prisma.responder.update({
    where: { id },
    data: {
      name,
      agencyId,
      role,
      contactInfo,
    },
    include: responderInclude,
  });

  res.json(responder);
}

// Deletes an existing responder record.
export async function deleteResponder(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const existingResponder = await prisma.responder.findUnique({ where: { id } });

  if (!existingResponder) {
    res.status(404).json({ message: 'Responder not found' });
    return;
  }

  await prisma.responder.delete({ where: { id } });
  res.status(204).send();
}
