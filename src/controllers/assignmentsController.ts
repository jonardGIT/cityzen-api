// Handles CRUD operations for responder assignments to incidents.
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { getParamId } from '../utils/request.js';
import type { Assignment } from '../types/models.js';

// Returns all assignments from the database.
export async function getAssignments(_req: Request, res: Response): Promise<void> {
  const assignments = await prisma.assignment.findMany();
  res.json(assignments);
}

// Returns a single assignment by numeric ID. Responds 404 if not found.
export async function getAssignmentById(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id },
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
    res.status(422).json({ message: 'incidentId and responderId are required' });
    return;
  }

  if (!(await prisma.citizenIncident.findUnique({ where: { id: incidentId } }))) {
    res.status(422).json({ message: 'incidentId does not reference a valid CitizenIncident' });
    return;
  }

  if (!(await prisma.responder.findUnique({ where: { id: responderId } }))) {
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

  const {
    incidentId,
    responderId,
    assignedDate,
    responseStart,
    responseEnd,
    outcome,
    notes,
  } = req.body as Partial<Assignment>;

  const existingAssignment = await prisma.assignment.findUnique({ where: { id } });
  if (!existingAssignment) {
    res.status(404).json({ message: 'Assignment not found' });
    return;
  }

  if (incidentId !== undefined && !(await prisma.citizenIncident.findUnique({ where: { id: incidentId } }))) {
    res.status(422).json({ message: 'incidentId does not reference a valid CitizenIncident' });
    return;
  }

  if (responderId !== undefined && !(await prisma.responder.findUnique({ where: { id: responderId } }))) {
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

  const existingAssignment = await prisma.assignment.findUnique({ where: { id } });
  if (!existingAssignment) {
    res.status(404).json({ message: 'Assignment not found' });
    return;
  }

  await prisma.assignment.delete({ where: { id } });
  res.status(204).send();
}
