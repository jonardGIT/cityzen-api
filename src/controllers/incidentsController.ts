// Handles CRUD operations for citizen-reported incidents.
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { getParamId } from '../utils/request.js';
import type { CitizenIncident } from '../types/models.js';

// Returns all incidents from the database.
export async function getIncidents(_req: Request, res: Response): Promise<void> {
  const incidents = await prisma.citizenIncident.findMany();
  res.json(incidents);
}

// Returns a single incident by numeric ID. Responds 404 if not found.
export async function getIncidentById(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const incident = await prisma.citizenIncident.findUnique({
    where: { id },
  });

  if (!incident) {
    res.status(404).json({ message: 'CitizenIncident not found' });
    return;
  }

  res.json(incident);
}

// Creates a new incident. Validates all FK references (status, citizen, location,
// category, severity) before persisting to the database.
export async function createIncident(req: Request, res: Response): Promise<void> {
  const {
    description,
    mediaUrl,
    dateReported,
    statusId,
    citizenId,
    locationId,
    categoryId,
    severityId,
  } = req.body as Partial<CitizenIncident>;

  if (!description || !statusId || !citizenId || !locationId || !categoryId || !severityId) {
    res.status(422).json({
      message: 'description, statusId, citizenId, locationId, categoryId, and severityId are required',
    });
    return;
  }

  if (!(await prisma.status.findUnique({ where: { id: statusId } }))) {
    res.status(422).json({ message: 'statusId does not reference a valid Status' });
    return;
  }

  if (!(await prisma.citizen.findUnique({ where: { id: citizenId } }))) {
    res.status(422).json({ message: 'citizenId does not reference a valid Citizen' });
    return;
  }

  if (!(await prisma.location.findUnique({ where: { id: locationId } }))) {
    res.status(422).json({ message: 'locationId does not reference a valid Location' });
    return;
  }

  if (!(await prisma.category.findUnique({ where: { id: categoryId } }))) {
    res.status(422).json({ message: 'categoryId does not reference a valid Category' });
    return;
  }

  if (!(await prisma.severity.findUnique({ where: { id: severityId } }))) {
    res.status(422).json({ message: 'severityId does not reference a valid Severity' });
    return;
  }

  const incident = await prisma.citizenIncident.create({
    data: {
      description,
      mediaUrl,
      dateReported: dateReported ? new Date(dateReported) : new Date(),
      statusId,
      citizenId,
      locationId,
      categoryId,
      severityId,
    },
  });

  res.status(201).json(incident);
}
