// Handles CRUD operations for responder assignments to incidents.
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import {
  buildPaginatedResponse,
  getListQuery,
  getPaginationQuery,
  getParamId,
} from '../utils/request.js';
import { assignmentsListQueryConfig } from '../utils/listQueryConfig.js';
import type { Assignment } from '../types/models.js';
import {
  isArchiveEnabled,
  withActiveRecords,
  withArchivedRecords,
  withArchiveScope,
} from '../utils/archive.js';

// Returns all assignments from the database.
export async function getAssignments(req: Request, res: Response): Promise<void> {
  const pagination = getPaginationQuery(req);
  const listQuery = getListQuery(req, res, assignmentsListQueryConfig);
  if (!listQuery) {
    return;
  }

  if (pagination.enabled) {
    const scopedWhere = withArchiveScope(listQuery.where as any, listQuery.archiveScope);
    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where: scopedWhere as any,
        orderBy: listQuery.orderBy as any,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.assignment.count({ where: scopedWhere as any }),
    ]);
    res.json(buildPaginatedResponse(assignments, total, pagination));
    return;
  }

  const assignments = await prisma.assignment.findMany({
    where: withArchiveScope(listQuery.where as any, listQuery.archiveScope) as any,
    orderBy: listQuery.orderBy as any,
  });
  res.json(assignments);
}

// Returns a single assignment by numeric ID. Responds 404 if not found.
export async function getAssignmentById(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const assignment = await prisma.assignment.findFirst({
    where: withActiveRecords({ id }) as any,
  });

  if (!assignment) {
    res.status(404).json({ message: 'Assignment not found' });
    return;
  }

  res.json(assignment);
}

// Creates a new assignment linking a responder to an incident.
// Validates that both the incident and responder exist before persisting.
export async function createAssignment(req: Request, res: Response): Promise<void> {
  const { incidentId, responderId, assignedDate, responseStart, responseEnd, outcome, notes } =
    req.body as Partial<Assignment>;

  if (!incidentId || !responderId) {
    res.status(422).json({ message: 'incidentId and responderId are required' });
    return;
  }

  // Relaxed UUID regex for test/seed compatibility
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof incidentId !== 'string' || !uuidRegex.test(incidentId)) {
    res.status(400).json({ message: 'incidentId must be a valid UUID' });
    return;
  }
  if (typeof responderId !== 'string' || !uuidRegex.test(responderId)) {
    res.status(400).json({ message: 'responderId must be a valid UUID' });
    return;
  }

  if (
    !(await prisma.citizenIncident.findFirst({
      where: withActiveRecords({ id: incidentId }) as any,
    }))
  ) {
    res.status(422).json({ message: 'incidentId does not reference a valid CitizenIncident' });
    return;
  }
  if (
    !(await prisma.responder.findFirst({ where: withActiveRecords({ id: responderId }) as any }))
  ) {
    res.status(422).json({ message: 'responderId does not reference a valid Responder' });
    return;
  }

  const assignment = await prisma.assignment.create({
    data: {
      incidentId,
      responderId,
      assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
      responseStart: responseStart ? new Date(responseStart) : undefined,
      responseEnd: responseEnd ? new Date(responseEnd) : undefined,
      outcome,
      notes,
    },
  });

  res.status(201).json(assignment);
}

// Updates an existing assignment and validates any provided foreign keys.
export async function updateAssignment(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const { incidentId, responderId, assignedDate, responseStart, responseEnd, outcome, notes } =
    req.body as Partial<Assignment>;

  const existingAssignment = await prisma.assignment.findFirst({
    where: withActiveRecords({ id }) as any,
  });
  if (!existingAssignment) {
    res.status(404).json({ message: 'Assignment not found' });
    return;
  }

  if (
    incidentId !== undefined &&
    !(await prisma.citizenIncident.findFirst({
      where: withActiveRecords({ id: incidentId }) as any,
    }))
  ) {
    res.status(422).json({ message: 'incidentId does not reference a valid CitizenIncident' });
    return;
  }
  if (
    responderId !== undefined &&
    !(await prisma.responder.findFirst({ where: withActiveRecords({ id: responderId }) as any }))
  ) {
    res.status(422).json({ message: 'responderId does not reference a valid Responder' });
    return;
  }

  const assignment = await prisma.assignment.update({
    where: { id },
    data: {
      incidentId,
      responderId,
      assignedDate: assignedDate ? new Date(assignedDate) : undefined,
      responseStart: responseStart ? new Date(responseStart) : undefined,
      responseEnd: responseEnd ? new Date(responseEnd) : undefined,
      outcome,
      notes,
    },
  });

  res.json(assignment);
}

// Deletes an existing assignment.
export async function deleteAssignment(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const existingAssignment = await prisma.assignment.findFirst({
    where: withActiveRecords({ id }) as any,
  });
  if (!existingAssignment) {
    res.status(404).json({ message: 'Assignment not found' });
    return;
  }

  if (isArchiveEnabled()) {
    await prisma.assignment.update({ where: { id }, data: { archivedAt: new Date() } });
  } else {
    await prisma.assignment.delete({ where: { id } });
  }
  res.status(204).send();
}

export async function restoreAssignment(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  if (!isArchiveEnabled()) {
    res.status(409).json({ message: 'Archive mode is disabled; restore is unavailable' });
    return;
  }

  const existingAssignment = await prisma.assignment.findFirst({
    where: withArchivedRecords({ id }) as any,
  });
  if (!existingAssignment) {
    res.status(404).json({ message: 'Archived assignment not found' });
    return;
  }

  const [incident, responder] = await Promise.all([
    prisma.citizenIncident.findFirst({
      where: withActiveRecords({ id: existingAssignment.incidentId }) as any,
    }),
    prisma.responder.findFirst({
      where: withActiveRecords({ id: existingAssignment.responderId }) as any,
    }),
  ]);

  if (!incident) {
    res
      .status(409)
      .json({ message: 'Conflict: assignment cannot be restored while its incident is archived' });
    return;
  }

  if (!responder) {
    res
      .status(409)
      .json({ message: 'Conflict: assignment cannot be restored while its responder is archived' });
    return;
  }

  const assignment = await prisma.assignment.update({ where: { id }, data: { archivedAt: null } });
  res.json(assignment);
}
