// Handles CRUD operations for incident severity lookup values.
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import {
  buildPaginatedResponse,
  getListQuery,
  getPaginationQuery,
  getParamId,
} from '../utils/request.js';
import { severitiesListQueryConfig } from '../utils/listQueryConfig.js';
import {
  isArchiveEnabled,
  withActiveRecords,
  withArchivedRecords,
  withArchiveScope,
} from '../utils/archive.js';

// Returns all severities from the database.
export async function getSeverities(req: Request, res: Response): Promise<void> {
  const pagination = getPaginationQuery(req);
  const listQuery = getListQuery(req, res, severitiesListQueryConfig);
  if (!listQuery) {
    return;
  }

  if (pagination.enabled) {
    const scopedWhere = withArchiveScope(listQuery.where as any, listQuery.archiveScope);
    const [severities, total] = await Promise.all([
      prisma.severity.findMany({
        where: scopedWhere as any,
        orderBy: listQuery.orderBy as any,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.severity.count({ where: scopedWhere as any }),
    ]);
    res.json(buildPaginatedResponse(severities, total, pagination));
    return;
  }

  const severities = await prisma.severity.findMany({
    where: withArchiveScope(listQuery.where as any, listQuery.archiveScope) as any,
    orderBy: listQuery.orderBy as any,
  });
  res.json(severities);
}

// Returns a single severity by numeric ID. Responds 404 if not found.
export async function getSeverityById(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const severity = await prisma.severity.findFirst({
    where: withActiveRecords({ id }) as any,
  });
  if (!severity) {
    res.status(404).json({ message: 'Severity not found' });
    return;
  }

  res.json(severity);
}

// Creates a new severity entry. Requires level; definition is optional.
export async function createSeverity(req: Request, res: Response): Promise<void> {
  const { level, definition } = req.body as { level?: string; definition?: string };

  if (!level) {
    res.status(422).json({ message: 'level is required' });
    return;
  }

  const severity = await prisma.severity.create({
    data: {
      level,
      definition: definition || null,
    },
  });

  res.status(201).json(severity);
}

// Updates an existing severity entry.
export async function updateSeverity(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const { level, definition } = req.body as { level?: string; definition?: string | null };
  const existingSeverity = await prisma.severity.findFirst({
    where: withActiveRecords({ id }) as any,
  });

  if (!existingSeverity) {
    res.status(404).json({ message: 'Severity not found' });
    return;
  }

  const severity = await prisma.severity.update({
    where: { id },
    data: {
      level,
      definition: definition === undefined ? undefined : definition || null,
    },
  });

  res.json(severity);
}

// Deletes an existing severity entry.
export async function deleteSeverity(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const existingSeverity = await prisma.severity.findFirst({
    where: withActiveRecords({ id }) as any,
  });

  if (!existingSeverity) {
    res.status(404).json({ message: 'Severity not found' });
    return;
  }

  const activeIncidentCount = await prisma.citizenIncident.count({
    where: withActiveRecords({ severityId: id }) as any,
  });
  if (activeIncidentCount > 0) {
    res.status(409).json({ message: 'Conflict: severity is still referenced by active incidents' });
    return;
  }

  if (isArchiveEnabled()) {
    await prisma.severity.update({ where: { id }, data: { archivedAt: new Date() } });
  } else {
    await prisma.severity.delete({ where: { id } });
  }
  res.status(204).send();
}

export async function restoreSeverity(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  if (!isArchiveEnabled()) {
    res.status(409).json({ message: 'Archive mode is disabled; restore is unavailable' });
    return;
  }

  const existingSeverity = await prisma.severity.findFirst({
    where: withArchivedRecords({ id }) as any,
  });
  if (!existingSeverity) {
    res.status(404).json({ message: 'Archived severity not found' });
    return;
  }

  const severity = await prisma.severity.update({ where: { id }, data: { archivedAt: null } });
  res.json(severity);
}
