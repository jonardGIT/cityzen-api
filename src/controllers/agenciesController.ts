import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import {
  buildPaginatedResponse,
  getListQuery,
  getPaginationQuery,
  getParamId,
} from '../utils/request.js';
import { agenciesListQueryConfig } from '../utils/listQueryConfig.js';
import {
  isArchiveEnabled,
  withActiveRecords,
  withArchivedRecords,
  withArchiveScope,
} from '../utils/archive.js';

export async function getAgencies(req: Request, res: Response): Promise<void> {
  const pagination = getPaginationQuery(req);
  const listQuery = getListQuery(req, res, agenciesListQueryConfig);
  if (!listQuery) {
    return;
  }

  if (pagination.enabled) {
    const scopedWhere = withArchiveScope(listQuery.where as any, listQuery.archiveScope);
    const [agencies, total] = await Promise.all([
      prisma.agency.findMany({
        where: scopedWhere as any,
        orderBy: listQuery.orderBy as any,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.agency.count({ where: scopedWhere as any }),
    ]);
    res.json(buildPaginatedResponse(agencies, total, pagination));
    return;
  }

  const agencies = await prisma.agency.findMany({
    where: withArchiveScope(listQuery.where as any, listQuery.archiveScope) as any,
    orderBy: listQuery.orderBy as any,
  });
  res.json(agencies);
}

export async function getAgencyById(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const agency = await prisma.agency.findFirst({ where: withActiveRecords({ id }) as any });
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
  const existingAgency = await prisma.agency.findFirst({ where: withActiveRecords({ id }) as any });
  if (!existingAgency) {
    res.status(404).json({ message: 'Agency not found' });
    return;
  }

  const updateData: { name?: string; contactNumber?: string | null } = {};
  if (name !== undefined) updateData.name = name;
  if (contactNumber !== undefined)
    updateData.contactNumber = contactNumber ? contactNumber.trim() : null;

  const agency = await prisma.agency.update({ where: { id }, data: updateData });
  res.json(agency);
}

export async function deleteAgency(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const existingAgency = await prisma.agency.findFirst({ where: withActiveRecords({ id }) as any });
  if (!existingAgency) {
    res.status(404).json({ message: 'Agency not found' });
    return;
  }

  const activeResponderCount = await prisma.responder.count({
    where: withActiveRecords({ agencyId: id }) as any,
  });
  if (activeResponderCount > 0) {
    res.status(409).json({ message: 'Conflict: agency still has active responders' });
    return;
  }

  if (isArchiveEnabled()) {
    await prisma.agency.update({ where: { id }, data: { archivedAt: new Date() } });
  } else {
    await prisma.agency.delete({ where: { id } });
  }
  res.status(204).send();
}

export async function restoreAgency(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  if (!isArchiveEnabled()) {
    res.status(409).json({ message: 'Archive mode is disabled; restore is unavailable' });
    return;
  }

  const existingAgency = await prisma.agency.findFirst({
    where: withArchivedRecords({ id }) as any,
  });
  if (!existingAgency) {
    res.status(404).json({ message: 'Archived agency not found' });
    return;
  }

  const agency = await prisma.agency.update({ where: { id }, data: { archivedAt: null } });
  res.json(agency);
}
