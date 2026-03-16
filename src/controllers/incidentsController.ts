import type { Request, Response } from 'express';
import {
  categories,
  citizens,
  getNextId,
  incidents,
  locations,
  severities,
  statuses,
} from '../data/store.js';
import { getParamId } from '../utils/request.js';
import type { CitizenIncident } from '../types/models.js';

export function getIncidents(_req: Request, res: Response): void {
  res.json(incidents);
}

export function getIncidentById(req: Request, res: Response): void {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const incident = incidents.find((item) => item.id === id);
  if (!incident) {
    res.status(404).json({ message: 'CitizenIncident not found' });
    return;
  }

  res.json(incident);
}

export function createIncident(req: Request, res: Response): void {
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

  if (!statuses.some((item) => item.id === statusId)) {
    res.status(422).json({ message: 'statusId does not reference a valid Status' });
    return;
  }

  if (!citizens.some((item) => item.id === citizenId)) {
    res.status(422).json({ message: 'citizenId does not reference a valid Citizen' });
    return;
  }

  if (!locations.some((item) => item.id === locationId)) {
    res.status(422).json({ message: 'locationId does not reference a valid Location' });
    return;
  }

  if (!categories.some((item) => item.id === categoryId)) {
    res.status(422).json({ message: 'categoryId does not reference a valid Category' });
    return;
  }

  if (!severities.some((item) => item.id === severityId)) {
    res.status(422).json({ message: 'severityId does not reference a valid Severity' });
    return;
  }

  const incident: CitizenIncident = {
    id: getNextId(incidents),
    description,
    mediaUrl,
    dateReported: dateReported ? new Date(dateReported) : new Date(),
    statusId,
    citizenId,
    locationId,
    categoryId,
    severityId,
  };

  incidents.push(incident);
  res.status(201).json(incident);
}
