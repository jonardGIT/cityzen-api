// Handles CRUD operations for emergency responders.
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import {
  buildPaginatedResponse,
  getListQuery,
  getPaginationQuery,
  getParamId,
} from '../utils/request.js';
import { respondersListQueryConfig } from '../utils/listQueryConfig.js';
import type { Responder } from '../types/models.js';
import {
  isArchiveEnabled,
  withActiveRecords,
  withArchivedRecords,
  withArchiveScope,
} from '../utils/archive.js';

const responderInclude = {
  agency: true,
} as const;

// Returns all responders from the database.
export async function getResponders(req: Request, res: Response): Promise<void> {
  const pagination = getPaginationQuery(req);
  const listQuery = getListQuery(req, res, respondersListQueryConfig);
  if (!listQuery) {
    return;
  }

  if (pagination.enabled) {
    const scopedWhere = withArchiveScope(listQuery.where as any, listQuery.archiveScope);
    const [responders, total] = await Promise.all([
      prisma.responder.findMany({
        include: responderInclude,
        where: scopedWhere as any,
        orderBy: listQuery.orderBy as any,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.responder.count({ where: scopedWhere as any }),
    ]);
    res.json(buildPaginatedResponse(responders, total, pagination));
    return;
  }

  const responders = await prisma.responder.findMany({
    include: responderInclude,
    where: withArchiveScope(listQuery.where as any, listQuery.archiveScope) as any,
    orderBy: listQuery.orderBy as any,
  });
  res.json(responders);
}

// Returns a single responder by numeric ID. Responds 404 if not found.
export async function getResponderById(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }
  try {
    const responder = await prisma.responder.findFirst({
      where: withActiveRecords({ id }) as any,
      include: responderInclude,
    });
    if (!responder) {
      res.status(404).json({ message: 'Responder not found' });
      return;
    }
    res.json(responder);
  } catch (err) {
    res.status(400).json({ message: 'Invalid responder id', error: (err as Error)?.message });
  }
}

// Creates a new responder record. Requires name, agencyId, role, and contactInfo.
export async function createResponder(req: Request, res: Response): Promise<void> {
  const { name, agencyId, role, contactInfo } = req.body as Partial<Responder>;

  if (!name || !agencyId || !role || !contactInfo) {
    res.status(422).json({ message: 'name, agencyId, role, and contactInfo are required' });
    return;
  }

  // Relaxed UUID format check for agencyId (accepts all valid UUIDs, including seed/test values)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof agencyId !== 'string' || !uuidRegex.test(agencyId)) {
    res.status(400).json({ message: 'agencyId must be a valid UUID' });
    return;
  }

  if (!(await prisma.agency.findFirst({ where: withActiveRecords({ id: agencyId }) as any }))) {
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
  const existingResponder = await prisma.responder.findFirst({
    where: withActiveRecords({ id }) as any,
  });

  if (!existingResponder) {
    res.status(404).json({ message: 'Responder not found' });
    return;
  }

  if (
    agencyId !== undefined &&
    !(await prisma.agency.findFirst({ where: withActiveRecords({ id: agencyId }) as any }))
  ) {
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

  const existingResponder = await prisma.responder.findFirst({
    where: withActiveRecords({ id }) as any,
  });

  if (!existingResponder) {
    res.status(404).json({ message: 'Responder not found' });
    return;
  }

  const activeAssignmentCount = await prisma.assignment.count({
    where: withActiveRecords({ responderId: id }) as any,
  });
  if (activeAssignmentCount > 0) {
    res.status(409).json({ message: 'Conflict: responder still has active assignments' });
    return;
  }

  if (isArchiveEnabled()) {
    await prisma.responder.update({ where: { id }, data: { archivedAt: new Date() } });
  } else {
    await prisma.responder.delete({ where: { id } });
  }
  res.status(204).send();
}

export async function restoreResponder(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  if (!isArchiveEnabled()) {
    res.status(409).json({ message: 'Archive mode is disabled; restore is unavailable' });
    return;
  }

  const existingResponder = await prisma.responder.findFirst({
    where: withArchivedRecords({ id }) as any,
    include: responderInclude,
  });

  if (!existingResponder) {
    res.status(404).json({ message: 'Archived responder not found' });
    return;
  }

  const agency = await prisma.agency.findFirst({
    where: withActiveRecords({ id: existingResponder.agencyId }) as any,
  });
  if (!agency) {
    res.status(409).json({ message: 'Conflict: responder cannot be restored while its agency is archived' });
    return;
  }

  const responder = await prisma.responder.update({
    where: { id },
    data: { archivedAt: null },
    include: responderInclude,
  });
  res.json(responder);
}
