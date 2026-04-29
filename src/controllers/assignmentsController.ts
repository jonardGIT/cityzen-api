// Handles CRUD operations for responder assignments to incidents.
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import {
  buildAssignmentScopeWhere,
  canManageIncident,
  canManageResponder,
  findActiveIncident,
  findActiveResponder,
  findScopedActiveAssignment,
  findScopedArchivedAssignment,
  resolveAssignmentScope,
} from '../services/assignmentScopeService.js';
import {
  buildPaginatedResponse,
  getListQuery,
  getPaginationQuery,
  getParamId,
} from '../utils/request.js';
import { assignmentsListQueryConfig } from '../utils/listQueryConfig.js';
import type { Assignment } from '../types/models.js';
import { isArchiveEnabled, withActiveRecords, withArchiveScope } from '../utils/archive.js';

function getAuthUser(req: Request, res: Response) {
  const authUser = (req as AuthenticatedRequest).authUser;

  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return null;
  }

  return authUser;
}

// Returns all assignments from the database.
export async function getAssignments(req: Request, res: Response): Promise<void> {
  const authUser = getAuthUser(req, res);
  if (!authUser) {
    return;
  }

  const pagination = getPaginationQuery(req);
  const scope = await resolveAssignmentScope(authUser);
  if (!scope) {
    if (pagination.enabled) {
      res.json(buildPaginatedResponse([], 0, pagination));
      return;
    }

    res.json([]);
    return;
  }

  const listQuery = getListQuery(req, res, assignmentsListQueryConfig);
  if (!listQuery) {
    return;
  }

  const scopedListWhere = buildAssignmentScopeWhere(listQuery.where ?? {}, scope);

  if (pagination.enabled) {
    const scopedWhere = withArchiveScope(scopedListWhere, listQuery.archiveScope);
    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where: scopedWhere,
        orderBy: listQuery.orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.assignment.count({ where: scopedWhere }),
    ]);
    res.json(buildPaginatedResponse(assignments, total, pagination));
    return;
  }

  const assignments = await prisma.assignment.findMany({
    where: withArchiveScope(scopedListWhere, listQuery.archiveScope),
    orderBy: listQuery.orderBy,
  });
  res.json(assignments);
}

// Returns a single assignment by ID. Responds 404 if not found.
export async function getAssignmentById(req: Request, res: Response): Promise<void> {
  const authUser = getAuthUser(req, res);
  if (!authUser) {
    return;
  }

  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const scope = await resolveAssignmentScope(authUser);
  if (!scope) {
    res.status(404).json({ message: 'Assignment not found' });
    return;
  }

  const assignment = await findScopedActiveAssignment(id, scope);

  if (!assignment) {
    res.status(404).json({ message: 'Assignment not found' });
    return;
  }

  res.json(assignment);
}

// Creates a new assignment linking a responder to an incident.
// Validates that both the incident and responder exist before persisting.
export async function createAssignment(req: Request, res: Response): Promise<void> {
  const authUser = getAuthUser(req, res);
  if (!authUser) {
    return;
  }

  const { incidentId, responderId, assignedDate, responseStart, responseEnd, outcome, notes } =
    req.body as Partial<Assignment>;

  if (!incidentId || !responderId) {
    res.status(422).json({ message: 'incidentId and responderId are required' });
    return;
  }

  const scope = await resolveAssignmentScope(authUser);
  if (!scope) {
    res
      .status(403)
      .json({ message: 'Forbidden: assignment creation is outside your allowed scope' });
    return;
  }

  const incident = await findActiveIncident(incidentId);
  if (!incident) {
    res.status(422).json({ message: 'incidentId does not reference a valid CitizenIncident' });
    return;
  }

  if (!canManageIncident(scope, incident)) {
    res
      .status(403)
      .json({ message: 'Forbidden: assignment creation is outside your allowed scope' });
    return;
  }

  const responder = await findActiveResponder(responderId);
  if (!responder) {
    res.status(422).json({ message: 'responderId does not reference a valid Responder' });
    return;
  }

  if (!canManageResponder(scope, responder)) {
    res
      .status(403)
      .json({ message: 'Forbidden: assignment creation is outside your allowed scope' });
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
  const authUser = getAuthUser(req, res);
  if (!authUser) {
    return;
  }

  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const scope = await resolveAssignmentScope(authUser);
  if (!scope) {
    res.status(404).json({ message: 'Assignment not found' });
    return;
  }

  const { incidentId, responderId, assignedDate, responseStart, responseEnd, outcome, notes } =
    req.body as Partial<Assignment>;

  const existingAssignment = await findScopedActiveAssignment(id, scope);
  if (!existingAssignment) {
    res.status(404).json({ message: 'Assignment not found' });
    return;
  }

  if (incidentId !== undefined) {
    const incident = await findActiveIncident(incidentId);
    if (!incident) {
      res.status(422).json({ message: 'incidentId does not reference a valid CitizenIncident' });
      return;
    }

    if (!canManageIncident(scope, incident)) {
      res
        .status(403)
        .json({ message: 'Forbidden: assignment mutation is outside your allowed scope' });
      return;
    }
  }

  if (responderId !== undefined) {
    const responder = await findActiveResponder(responderId);
    if (!responder) {
      res.status(422).json({ message: 'responderId does not reference a valid Responder' });
      return;
    }

    if (!canManageResponder(scope, responder)) {
      res
        .status(403)
        .json({ message: 'Forbidden: assignment mutation is outside your allowed scope' });
      return;
    }
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
  const authUser = getAuthUser(req, res);
  if (!authUser) {
    return;
  }

  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const scope = await resolveAssignmentScope(authUser);
  if (!scope) {
    res.status(404).json({ message: 'Assignment not found' });
    return;
  }

  const existingAssignment = await findScopedActiveAssignment(id, scope);
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
  const authUser = getAuthUser(req, res);
  if (!authUser) {
    return;
  }

  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  if (!isArchiveEnabled()) {
    res.status(409).json({ message: 'Archive mode is disabled; restore is unavailable' });
    return;
  }

  const scope = await resolveAssignmentScope(authUser);
  if (!scope) {
    res.status(404).json({ message: 'Archived assignment not found' });
    return;
  }

  const existingAssignment = await findScopedArchivedAssignment(id, scope);
  if (!existingAssignment) {
    res.status(404).json({ message: 'Archived assignment not found' });
    return;
  }

  const [incident, responder] = await Promise.all([
    prisma.citizenIncident.findFirst({
      where: withActiveRecords({ id: existingAssignment.incidentId }),
    }),
    prisma.responder.findFirst({
      where: withActiveRecords({ id: existingAssignment.responderId }),
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
