import type { Request, Response } from 'express';
import { locations, getNextId } from '../data/store.js';
import { getParamId } from '../utils/request.js';
import type { Location } from '../types/models.js';

export function getLocations(_req: Request, res: Response): void {
  res.json(locations);
}

export function getLocationById(req: Request, res: Response): void {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const location = locations.find((item) => item.id === id);
  if (!location) {
    res.status(404).json({ message: 'Location not found' });
    return;
  }

  res.json(location);
}

export function createLocation(req: Request, res: Response): void {
  const { district, city, province, region } = req.body as Partial<Location>;

  if (!district || !city || !province || !region) {
    res.status(400).json({ message: 'district, city, province, and region are required' });
    return;
  }

  const location: Location = {
    id: getNextId(locations),
    district,
    city,
    province,
    region,
  };

  locations.push(location);
  res.status(201).json(location);
}
