import type { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import type { AuthUser } from '../types/auth.js';
import { withActiveRecords } from '../utils/archive.js';

interface AuthenticatedRequest extends Request {
  authUser?: AuthUser & { jurisdictionType?: string; jurisdictionId?: string };
}

/**
 * Resolves the set of geographic entity IDs that fall within the
 * authenticated user's jurisdiction. Attaches the result to req so
 * downstream handlers can filter queries.
 */
export interface JurisdictionScope {
  type: 'national' | 'region' | 'province' | 'city' | 'barangay' | 'own' | 'assigned';
  regionIds?: string[];
  provinceIds?: string[];
  cityMunicipalityIds?: string[];
  barangayIds?: string[];
}

export async function resolveJurisdictionScope(
  jurisdictionType: string | null | undefined,
  jurisdictionId: string | null | undefined,
): Promise<JurisdictionScope> {
  // If national or no jurisdiction set, full access
  if (!jurisdictionType || jurisdictionType === 'national') {
    return { type: 'national' };
  }

  if (!jurisdictionId) {
    // Fail closed: jurisdiction type is set but ID is missing (misconfigured user)
    return { type: 'own' };
  }

  if (jurisdictionType === 'region') {
    // Get all provinces in this region
    const provinces = await prisma.province.findMany({
      where: withActiveRecords({ regionId: jurisdictionId }),
      select: { id: true },
    });
    const provinceIds = provinces.map((p) => p.id);

    // Get all cities in those provinces
    const cities = await prisma.cityMunicipality.findMany({
      where: withActiveRecords({ provinceId: { in: provinceIds } }),
      select: { id: true },
    });
    const cityIds = cities.map((c) => c.id);

    // Get all barangays in those cities
    const barangays = await prisma.barangay.findMany({
      where: withActiveRecords({ cityMunicipalityId: { in: cityIds } }),
      select: { id: true },
    });

    return {
      type: 'region',
      regionIds: [jurisdictionId],
      provinceIds,
      cityMunicipalityIds: cityIds,
      barangayIds: barangays.map((b) => b.id),
    };
  }

  if (jurisdictionType === 'province') {
    // Get parent region
    const province = await prisma.province.findUnique({
      where: { id: jurisdictionId },
      select: { regionId: true },
    });

    // Get all cities in this province
    const cities = await prisma.cityMunicipality.findMany({
      where: withActiveRecords({ provinceId: jurisdictionId }),
      select: { id: true },
    });
    const cityIds = cities.map((c) => c.id);

    // Get all barangays in those cities
    const barangays = await prisma.barangay.findMany({
      where: withActiveRecords({ cityMunicipalityId: { in: cityIds } }),
      select: { id: true },
    });

    return {
      type: 'province',
      regionIds: province ? [province.regionId] : [],
      provinceIds: [jurisdictionId],
      cityMunicipalityIds: cityIds,
      barangayIds: barangays.map((b) => b.id),
    };
  }

  if (jurisdictionType === 'city') {
    // Get parent chain
    const city = await prisma.cityMunicipality.findUnique({
      where: { id: jurisdictionId },
      select: { type: true, provinceId: true, province: { select: { regionId: true } } },
    });

    if (!city || (city.type !== 'CITY' && city.type !== 'MUNICIPALITY')) {
      return { type: 'own' };
    }

    // Get all barangays in this city
    const barangays = await prisma.barangay.findMany({
      where: withActiveRecords({ cityMunicipalityId: jurisdictionId }),
      select: { id: true },
    });

    return {
      type: 'city',
      regionIds: city?.province ? [city.province.regionId] : [],
      provinceIds: city ? [city.provinceId] : [],
      cityMunicipalityIds: [jurisdictionId],
      barangayIds: barangays.map((b) => b.id),
    };
  }

  if (jurisdictionType === 'barangay') {
    const barangay = await prisma.barangay.findUnique({
      where: { id: jurisdictionId },
      select: {
        cityMunicipalityId: true,
        cityMunicipality: {
          select: { provinceId: true, province: { select: { regionId: true } } },
        },
      },
    });

    return {
      type: 'barangay',
      regionIds: barangay?.cityMunicipality?.province
        ? [barangay.cityMunicipality.province.regionId]
        : [],
      provinceIds: barangay?.cityMunicipality ? [barangay.cityMunicipality.provinceId] : [],
      cityMunicipalityIds: barangay ? [barangay.cityMunicipalityId] : [],
      barangayIds: [jurisdictionId],
    };
  }

  // Unknown jurisdiction type — fail closed
  return { type: 'own' };
}

/**
 * Middleware that loads the user's jurisdiction binding from the database
 * and attaches a resolved JurisdictionScope to the request.
 */
export function requireJurisdiction() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.authUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Load user's jurisdiction from DB
    const user = await prisma.user.findUnique({
      where: { id: authReq.authUser.id },
      select: { jurisdictionType: true, jurisdictionId: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const scope = await resolveJurisdictionScope(user.jurisdictionType, user.jurisdictionId);
    (req as any).jurisdictionScope = scope;
    next();
  };
}

/**
 * Builds a Prisma where clause that filters incidents by jurisdiction scope.
 */
export function buildIncidentJurisdictionFilter(scope: JurisdictionScope): Record<string, unknown> {
  if (scope.type === 'national') return {};
  if (scope.type === 'region') return { regionId: { in: scope.regionIds } };
  if (scope.type === 'province') return { provinceId: { in: scope.provinceIds } };
  if (scope.type === 'city') return { cityMunicipalityId: { in: scope.cityMunicipalityIds } };
  if (scope.type === 'barangay') return { barangayId: { in: scope.barangayIds } };
  return {};
}
