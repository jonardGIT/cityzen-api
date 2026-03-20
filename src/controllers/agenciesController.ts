import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { getParamId } from '../utils/request.js';

export async function getAgencies(_req: Request, res: Response): Promise<void> {
  const agencies = await prisma.agency.findMany();
  res.json(agencies);
}

export async function getAgencyById(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const agency = await prisma.agency.findUnique({ where: { id } });
  if (!agency) {
    res.status(404).json({ message: 'Agency not found' });
    return;
  }

  res.json(agency);
}

export async function createAgency(req: Request, res: Response): Promise<void> {
  const { name, contactNumber } = req.body as { name?: string; contactNumber?: string };

  if (!name) {
    res.status(422).json({ message: 'name is required' });
    return;
  }

  const agency = await prisma.agency.create({
    data: {
      name,
      contactNumber: contactNumber ? contactNumber.trim() : undefined,
    },
  });
  res.status(201).json(agency);
}

export async function updateAgency(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const { name, contactNumber } = req.body as { name?: string; contactNumber?: string | null };
  const existingAgency = await prisma.agency.findUnique({ where: { id } });
  if (!existingAgency) {
    res.status(404).json({ message: 'Agency not found' });
    return;
  }

  const updateData: { name?: string; contactNumber?: string | null } = {};
  if (name !== undefined) updateData.name = name;
  if (contactNumber !== undefined) updateData.contactNumber = contactNumber ? contactNumber.trim() : null;

  const agency = await prisma.agency.update({ where: { id }, data: updateData });
  res.json(agency);
}

export async function deleteAgency(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const existingAgency = await prisma.agency.findUnique({ where: { id } });
  if (!existingAgency) {
    res.status(404).json({ message: 'Agency not found' });
    return;
  }

  await prisma.agency.delete({ where: { id } });
  res.status(204).send();
}