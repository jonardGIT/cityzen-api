// Handles CRUD operations for emergency responders.
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { getParamId } from '../utils/request.js';
import type { Responder } from '../types/models.js';

// Returns all responders from the database.
export async function getResponders(_req: Request, res: Response): Promise<void> {
  const responders = await prisma.responder.findMany();
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
  });

  if (!responder) {
    res.status(404).json({ message: 'Responder not found' });
    return;
  }

  res.json(responder);
}

// Creates a new responder record. Requires name, agency, role, and contactInfo.
export async function createResponder(req: Request, res: Response): Promise<void> {
  const { name, agency, role, contactInfo } = req.body as Partial<Responder>;

  if (!name || !agency || !role || !contactInfo) {
    res.status(422).json({ message: 'name, agency, role, and contactInfo are required' });
    return;
  }

  const responder = await prisma.responder.create({
    data: {
      name,
      agency,
      role,
      contactInfo,
    },
  });

  res.status(201).json(responder);
}
