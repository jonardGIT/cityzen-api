// Handles CRUD operations for geographic location lookup values.
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { getParamId } from '../utils/request.js';

// Returns all locations from the database.
export async function getLocations(_req: Request, res: Response): Promise<void> {
  const locations = await prisma.location.findMany();
  res.json(locations);
}

// Returns a single location by numeric ID. Responds 404 if not found.
export async function getLocationById(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const location = await prisma.location.findUnique({
    where: { id },
  });
  if (!location) {
    res.status(404).json({ message: 'Location not found' });
    return;
  }

  res.json(location);
}

// Creates a new location entry. Requires district, city, province, and region.
export async function createLocation(req: Request, res: Response): Promise<void> {
  const { district, city, province, region } = req.body as {
    district?: string;
    city?: string;
    province?: string;
    region?: string;
  };

  if (!district || !city || !province || !region) {
    res.status(422).json({ message: 'district, city, province, and region are required' });
    return;
  }

  const location = await prisma.location.create({
    data: { district, city, province, region },
  });

  res.status(201).json(location);
}

// Updates an existing location entry.
export async function updateLocation(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const { district, city, province, region } = req.body as {
    district?: string;
    city?: string;
    province?: string;
    region?: string;
  };
  const existingLocation = await prisma.location.findUnique({ where: { id } });

  if (!existingLocation) {
    res.status(404).json({ message: 'Location not found' });
    return;
  }

  const location = await prisma.location.update({
    where: { id },
    data: { district, city, province, region },
  });

  res.json(location);
}

// Deletes an existing location entry.
export async function deleteLocation(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const existingLocation = await prisma.location.findUnique({ where: { id } });

  if (!existingLocation) {
    res.status(404).json({ message: 'Location not found' });
    return;
  }

  await prisma.location.delete({ where: { id } });
  res.status(204).send();
}
