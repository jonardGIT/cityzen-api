import type { Request, Response } from 'express';
import { assignments, getNextId, incidents, responders } from '../data/store.js';
import { getParamId } from '../utils/request.js';
import type { Assignment } from '../types/models.js';

export function getAssignments(_req: Request, res: Response): void {
  res.json(assignments);
}

export function getAssignmentById(req: Request, res: Response): void {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const assignment = assignments.find((item) => item.id === id);
  if (!assignment) {
    res.status(404).json({ message: 'Assignment not found' });
    return;
  }

  res.json(assignment);
}

export function createAssignment(req: Request, res: Response): void {
  const {
    incidentId,
    responderId,
    assignedDate,
    responseStart,
    responseEnd,
    outcome,
    notes,
  } = req.body as Partial<Assignment>;

  if (!incidentId || !responderId) {
    res.status(400).json({ message: 'incidentId and responderId are required' });
    return;
  }

  if (!incidents.some((item) => item.id === incidentId)) {
    res.status(400).json({ message: 'incidentId does not reference a valid CitizenIncident' });
    return;
  }

  if (!responders.some((item) => item.id === responderId)) {
    res.status(400).json({ message: 'responderId does not reference a valid Responder' });
    return;
  }

  const assignment: Assignment = {
    id: getNextId(assignments),
    incidentId,
    responderId,
    assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
    responseStart: responseStart ? new Date(responseStart) : undefined,
    responseEnd: responseEnd ? new Date(responseEnd) : undefined,
    outcome,
    notes,
  };

  assignments.push(assignment);
  res.status(201).json(assignment);
}
