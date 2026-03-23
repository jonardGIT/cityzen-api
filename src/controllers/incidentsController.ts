// Handles CRUD operations for citizen-reported incidents.
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { buildPaginatedResponse, getPaginationQuery, getParamId } from '../utils/request.js';
import type { CitizenIncident } from '../types/models.js';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';

async function getLinkedCitizenIdByAuthEmail(email: string): Promise<number | null> {
  const citizen = await prisma.citizen.findFirst({
    where: { contactInfo: email },
    select: { id: true },
  });

  return citizen?.id ?? null;
}

// Returns all incidents from the database.
export async function getIncidents(req: Request, res: Response): Promise<void> {
  const { authUser } = req as AuthenticatedRequest;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const pagination = getPaginationQuery(req);

  let where: { citizenId?: number } = {};

  let incidents;
  if (authUser.role === 'VIEWER') {
    const citizenId = await getLinkedCitizenIdByAuthEmail(authUser.email);
    if (!citizenId) {
      res.status(422).json({
        message: 'No citizen profile is linked to this account email. Create a citizen profile first.',
      });
      return;
    }

    where = { citizenId };
  }

  if (pagination.enabled) {
    const [paginatedIncidents, total] = await Promise.all([
      prisma.citizenIncident.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.citizenIncident.count({ where }),
    ]);
    res.json(buildPaginatedResponse(paginatedIncidents, total, pagination));
    return;
  }

  incidents = await prisma.citizenIncident.findMany({ where });

  res.json(incidents);
}

// Returns a single incident by numeric ID. Responds 404 if not found.
export async function getIncidentById(req: Request, res: Response): Promise<void> {
  const { authUser } = req as AuthenticatedRequest;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

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

  if (authUser.role === 'VIEWER') {
    const citizenId = await getLinkedCitizenIdByAuthEmail(authUser.email);
    if (!citizenId) {
      res.status(422).json({
        message: 'No citizen profile is linked to this account email. Create a citizen profile first.',
      });
      return;
    }

    if (incident.citizenId !== citizenId) {
      res.status(404).json({ message: 'CitizenIncident not found' });
      return;
    }
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

// Allows a VIEWER user to submit an incident by resolving citizen profile from auth email.
export async function createCitizenIncidentReport(req: Request, res: Response): Promise<void> {
  const { authUser } = req as AuthenticatedRequest;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const { description, mediaUrl, dateReported, locationId, categoryId, severityId } = req.body as Partial<CitizenIncident>;

  if (!description || !locationId || !categoryId || !severityId) {
    res.status(422).json({
      message: 'description, locationId, categoryId, and severityId are required',
    });
    return;
  }

  const citizenId = await getLinkedCitizenIdByAuthEmail(authUser.email);
  if (!citizenId) {
    res.status(422).json({
      message: 'No citizen profile is linked to this account email. Create a citizen profile first.',
    });
    return;
  }

  const reportedStatus = await prisma.status.findFirst({ where: { name: 'Reported' } });
  if (!reportedStatus) {
    res.status(500).json({ message: 'Default status "Reported" not found. Contact an administrator.' });
    return;
  }
  const statusId = reportedStatus.id;

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

// Updates an existing incident and validates any provided foreign keys.
export async function updateIncident(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

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

  const existingIncident = await prisma.citizenIncident.findUnique({ where: { id } });
  if (!existingIncident) {
    res.status(404).json({ message: 'CitizenIncident not found' });
    return;
  }

  if (statusId !== undefined && !(await prisma.status.findUnique({ where: { id: statusId } }))) {
    res.status(422).json({ message: 'statusId does not reference a valid Status' });
    return;
  }

  if (citizenId !== undefined && !(await prisma.citizen.findUnique({ where: { id: citizenId } }))) {
    res.status(422).json({ message: 'citizenId does not reference a valid Citizen' });
    return;
  }

  if (locationId !== undefined && !(await prisma.location.findUnique({ where: { id: locationId } }))) {
    res.status(422).json({ message: 'locationId does not reference a valid Location' });
    return;
  }

  if (categoryId !== undefined && !(await prisma.category.findUnique({ where: { id: categoryId } }))) {
    res.status(422).json({ message: 'categoryId does not reference a valid Category' });
    return;
  }

  if (severityId !== undefined && !(await prisma.severity.findUnique({ where: { id: severityId } }))) {
    res.status(422).json({ message: 'severityId does not reference a valid Severity' });
    return;
  }

  const incident = await prisma.citizenIncident.update({
    where: { id },
    data: {
      description,
      mediaUrl,
      dateReported: dateReported ? new Date(dateReported) : undefined,
      statusId,
      citizenId,
      locationId,
      categoryId,
      severityId,
    },
  });

  res.json(incident);
}

// Deletes an existing incident.
export async function deleteIncident(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const existingIncident = await prisma.citizenIncident.findUnique({ where: { id } });
  if (!existingIncident) {
    res.status(404).json({ message: 'CitizenIncident not found' });
    return;
  }

  await prisma.citizenIncident.delete({ where: { id } });
  res.status(204).send();
}
