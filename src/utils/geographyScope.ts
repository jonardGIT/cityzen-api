import type { Request, Response } from 'express';

import prisma from '../lib/prisma.js';
import { resolveJurisdictionScope, type JurisdictionScope } from '../middleware/jurisdiction.js';
import { normalizeUserRoleInput } from '../types/auth.js';

const NEVER_MATCHING_UUID = '00000000-0000-0000-0000-000000000000';

type AuthUserLike = {
  id: string;
  role: string;
};

function getAuthUser(req: Request): AuthUserLike | null {
  return ((req as Request & { authUser?: AuthUserLike }).authUser ?? null) as AuthUserLike | null;
}

async function getStoredUserJurisdiction(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { jurisdictionType: true, jurisdictionId: true },
  });

  return {
    jurisdictionType: user?.jurisdictionType ?? null,
    jurisdictionId: user?.jurisdictionId ?? null,
  };
}

async function resolveScopedGeographyAccess(
  req: Request,
  res: Response,
): Promise<{
  role: string;
  scope: JurisdictionScope;
} | null> {
  const authUser = getAuthUser(req);
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return null;
  }

  const normalizedRole = normalizeUserRoleInput(authUser.role);
  if (!normalizedRole) {
    res.status(500).json({ message: 'Invalid stored user role' });
    return null;
  }

  if (normalizedRole === 'NATIONAL_ADMIN' || normalizedRole === 'AUDITOR') {
    return { role: normalizedRole, scope: { type: 'national' } };
  }

  const actorJurisdiction = await getStoredUserJurisdiction(authUser.id);
  if (!actorJurisdiction.jurisdictionType || !actorJurisdiction.jurisdictionId) {
    res.status(403).json({
      message: 'Forbidden: account is missing a valid jurisdiction binding',
    });
    return null;
  }

  const scope = await resolveJurisdictionScope(
    actorJurisdiction.jurisdictionType,
    actorJurisdiction.jurisdictionId,
  );

  if (scope.type === 'own' || scope.type === 'assigned') {
    res.status(403).json({
      message: 'Forbidden: account does not have geography management scope',
    });
    return null;
  }

  return { role: normalizedRole, scope };
}

export async function buildCityMunicipalityScopeWhere(
  req: Request,
  res: Response,
): Promise<Record<string, unknown> | null> {
  const resolved = await resolveScopedGeographyAccess(req, res);
  if (!resolved) {
    return null;
  }

  if (resolved.scope.type === 'national') {
    return {};
  }

  if (resolved.role === 'CITY_ADMIN' || resolved.role === 'DISPATCHER') {
    return resolved.scope.cityMunicipalityIds?.length
      ? { id: { in: resolved.scope.cityMunicipalityIds } }
      : { id: { in: [NEVER_MATCHING_UUID] } };
  }

  return resolved.scope.provinceIds?.length
    ? { provinceId: { in: resolved.scope.provinceIds } }
    : { id: { in: [NEVER_MATCHING_UUID] } };
}

export async function validateCityMunicipalityMutationScope(
  req: Request,
  res: Response,
  body: Record<string, unknown>,
  existing?: Record<string, unknown>,
): Promise<null | { data?: Record<string, unknown> }> {
  const resolved = await resolveScopedGeographyAccess(req, res);
  if (!resolved) {
    return null;
  }

  if (resolved.scope.type === 'national') {
    return {};
  }

  const provinceId =
    typeof body.provinceId === 'string'
      ? body.provinceId.trim()
      : (existing?.provinceId as string | null);

  if (!provinceId || !resolved.scope.provinceIds?.includes(provinceId)) {
    res.status(403).json({
      message: 'Forbidden: city or municipality mutation is outside your allowed scope',
    });
    return null;
  }

  return {};
}

export async function buildBarangayScopeWhere(
  req: Request,
  res: Response,
): Promise<Record<string, unknown> | null> {
  const resolved = await resolveScopedGeographyAccess(req, res);
  if (!resolved) {
    return null;
  }

  if (resolved.scope.type === 'national') {
    return {};
  }

  return resolved.scope.cityMunicipalityIds?.length
    ? { cityMunicipalityId: { in: resolved.scope.cityMunicipalityIds } }
    : { id: { in: [NEVER_MATCHING_UUID] } };
}

export async function validateBarangayMutationScope(
  req: Request,
  res: Response,
  body: Record<string, unknown>,
  existing?: Record<string, unknown>,
): Promise<null | { data?: Record<string, unknown> }> {
  const resolved = await resolveScopedGeographyAccess(req, res);
  if (!resolved) {
    return null;
  }

  if (resolved.scope.type === 'national') {
    return {};
  }

  const cityMunicipalityId =
    typeof body.cityMunicipalityId === 'string'
      ? body.cityMunicipalityId.trim()
      : (existing?.cityMunicipalityId as string | null);

  if (!cityMunicipalityId || !resolved.scope.cityMunicipalityIds?.includes(cityMunicipalityId)) {
    res.status(403).json({
      message: 'Forbidden: barangay mutation is outside your allowed scope',
    });
    return null;
  }

  return {};
}
