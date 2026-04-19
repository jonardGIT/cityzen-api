import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { resolveJurisdictionScope, type JurisdictionScope } from '../middleware/jurisdiction.js';
import { normalizeUserRoleInput, ROLE_PROFILES } from '../types/auth.js';
import { withActiveRecords } from './archive.js';

type AuthUserLike = {
  id: string;
  role: string;
};

type AgencyJurisdictionInput = {
  jurisdictionType: 'region' | 'province' | 'city' | 'barangay';
  jurisdictionId: string;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NEVER_MATCHING_UUID = '00000000-0000-0000-0000-000000000000';

const JURISDICTION_TYPE_ALIASES: Record<string, 'region' | 'province' | 'city' | 'barangay'> = {
  region: 'region',
  province: 'province',
  city: 'city',
  barangay: 'barangay',
};

function getAuthUser(req: Request): AuthUserLike | null {
  return ((req as Request & { authUser?: AuthUserLike }).authUser ?? null) as AuthUserLike | null;
}

function normalizeJurisdictionTypeInput(
  value: string | null | undefined,
): 'region' | 'province' | 'city' | 'barangay' | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return JURISDICTION_TYPE_ALIASES[normalized] ?? null;
}

async function getStoredUserJurisdiction(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { jurisdictionType: true, jurisdictionId: true },
  });

  return {
    jurisdictionType: normalizeJurisdictionTypeInput(user?.jurisdictionType),
    jurisdictionId: user?.jurisdictionId ?? null,
  };
}

async function jurisdictionExists(type: string, id: string): Promise<boolean> {
  if (type === 'region') {
    return Boolean(await prisma.region.findFirst({ where: withActiveRecords({ id }) }));
  }

  if (type === 'province') {
    return Boolean(await prisma.province.findFirst({ where: withActiveRecords({ id }) }));
  }

  if (type === 'city') {
    return Boolean(
      await prisma.cityMunicipality.findFirst({ where: withActiveRecords({ id, type: 'CITY' }) }),
    );
  }

  if (type === 'barangay') {
    return Boolean(await prisma.barangay.findFirst({ where: withActiveRecords({ id }) }));
  }

  return false;
}

function isJurisdictionWithinScope(
  scope: JurisdictionScope,
  type: 'region' | 'province' | 'city' | 'barangay',
  id: string,
): boolean {
  if (scope.type === 'national') {
    return true;
  }

  if (type === 'region') {
    return scope.regionIds?.includes(id) ?? false;
  }

  if (type === 'province') {
    return scope.provinceIds?.includes(id) ?? false;
  }

  if (type === 'city') {
    return scope.cityMunicipalityIds?.includes(id) ?? false;
  }

  return scope.barangayIds?.includes(id) ?? false;
}

function buildScopedAgencyFilters(scope: JurisdictionScope): Record<string, unknown>[] {
  const filters: Record<string, unknown>[] = [];

  if (scope.regionIds?.length) {
    filters.push({ regionId: { in: scope.regionIds } });
    filters.push({ jurisdictionType: 'region', jurisdictionId: { in: scope.regionIds } });
  }

  if (scope.provinceIds?.length) {
    filters.push({ provinceId: { in: scope.provinceIds } });
    filters.push({ jurisdictionType: 'province', jurisdictionId: { in: scope.provinceIds } });
  }

  if (scope.cityMunicipalityIds?.length) {
    filters.push({ cityMunicipalityId: { in: scope.cityMunicipalityIds } });
    filters.push({ jurisdictionType: 'city', jurisdictionId: { in: scope.cityMunicipalityIds } });
  }

  if (scope.barangayIds?.length) {
    filters.push({ barangayId: { in: scope.barangayIds } });
    filters.push({ jurisdictionType: 'barangay', jurisdictionId: { in: scope.barangayIds } });
  }

  return filters;
}

export async function getOperationalJurisdictionScope(
  req: Request,
  res: Response,
): Promise<JurisdictionScope | null> {
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

  if (ROLE_PROFILES[normalizedRole].scope === 'national') {
    return { type: 'national' };
  }

  const actorJurisdiction = await getStoredUserJurisdiction(authUser.id);
  if (!actorJurisdiction.jurisdictionType || !actorJurisdiction.jurisdictionId) {
    res.status(403).json({
      message: 'Forbidden: account is missing a valid jurisdiction binding',
    });
    return null;
  }

  return resolveJurisdictionScope(
    actorJurisdiction.jurisdictionType,
    actorJurisdiction.jurisdictionId,
  );
}

export async function buildAgencyScopeWhere(
  req: Request,
  res: Response,
): Promise<Record<string, unknown> | null> {
  const scope = await getOperationalJurisdictionScope(req, res);
  if (!scope) {
    return null;
  }

  if (scope.type === 'national') {
    return {};
  }

  const filters = buildScopedAgencyFilters(scope);
  if (filters.length === 0) {
    return { id: { in: [NEVER_MATCHING_UUID] } };
  }

  return { OR: filters };
}

export async function validateAgencyMutationScope(
  req: Request,
  res: Response,
  body: Record<string, unknown>,
  existing?: Record<string, unknown>,
): Promise<{ data?: Record<string, unknown> } | null> {
  const scope = await getOperationalJurisdictionScope(req, res);
  if (!scope) {
    return null;
  }

  if (scope.type === 'national') {
    return {};
  }

  const jurisdictionTypeValue = body.jurisdictionType;
  const jurisdictionIdValue = body.jurisdictionId;
  const regionIdValue = typeof body.regionId === 'string' ? body.regionId.trim() : null;
  const provinceIdValue = typeof body.provinceId === 'string' ? body.provinceId.trim() : null;
  const cityMunicipalityIdValue =
    typeof body.cityMunicipalityId === 'string' ? body.cityMunicipalityId.trim() : null;
  const barangayIdValue = typeof body.barangayId === 'string' ? body.barangayId.trim() : null;

  let normalizedType = normalizeJurisdictionTypeInput(
    typeof jurisdictionTypeValue === 'string' ? jurisdictionTypeValue : null,
  );
  let normalizedId = typeof jurisdictionIdValue === 'string' ? jurisdictionIdValue.trim() : null;

  if (!normalizedType || !normalizedId) {
    if (barangayIdValue) {
      normalizedType = 'barangay';
      normalizedId = barangayIdValue;
    } else if (cityMunicipalityIdValue) {
      normalizedType = 'city';
      normalizedId = cityMunicipalityIdValue;
    } else if (provinceIdValue) {
      normalizedType = 'province';
      normalizedId = provinceIdValue;
    } else if (regionIdValue) {
      normalizedType = 'region';
      normalizedId = regionIdValue;
    }
  }

  if (!normalizedType || !normalizedId) {
    const existingJurisdictionType = normalizeJurisdictionTypeInput(
      typeof existing?.jurisdictionType === 'string' ? existing.jurisdictionType : null,
    );
    const existingJurisdictionId =
      typeof existing?.jurisdictionId === 'string' ? existing.jurisdictionId.trim() : null;

    if (existingJurisdictionType && existingJurisdictionId) {
      normalizedType = existingJurisdictionType;
      normalizedId = existingJurisdictionId;
    }
  }

  if (!normalizedType || !normalizedId) {
    res.status(422).json({
      message: 'jurisdictionType and jurisdictionId are required for LGU-scoped agency management',
    });
    return null;
  }

  if (!UUID_REGEX.test(normalizedId)) {
    res.status(422).json({ message: 'jurisdictionId must be a valid UUID' });
    return null;
  }

  if (!(await jurisdictionExists(normalizedType, normalizedId))) {
    res.status(422).json({
      message: `jurisdictionId must reference an active ${normalizedType}`,
    });
    return null;
  }

  if (!isJurisdictionWithinScope(scope, normalizedType, normalizedId)) {
    res.status(403).json({
      message: 'Forbidden: you are not allowed to manage agencies outside your jurisdiction',
    });
    return null;
  }

  return {
    data: {
      jurisdictionType: normalizedType,
      jurisdictionId: normalizedId,
    },
  };
}

export async function buildResponderScopeWhere(
  req: Request,
  res: Response,
): Promise<Record<string, unknown> | null> {
  const agencyScopeWhere = await buildAgencyScopeWhere(req, res);
  if (agencyScopeWhere === null) {
    return null;
  }

  if (Object.keys(agencyScopeWhere).length === 0) {
    return {};
  }

  const agencies = await prisma.agency.findMany({
    where: withActiveRecords(agencyScopeWhere),
    select: { id: true },
  });

  return {
    agencyId: { in: agencies.map((agency) => agency.id) },
  };
}

export async function validateResponderAgencyScope(
  req: Request,
  res: Response,
  body: Record<string, unknown>,
  existing?: Record<string, unknown>,
): Promise<{ data?: Record<string, unknown> } | null> {
  const agencyId =
    typeof body.agencyId === 'string'
      ? body.agencyId
      : typeof existing?.agencyId === 'string'
        ? existing.agencyId
        : null;

  if (!agencyId) {
    return {};
  }

  const scope = await getOperationalJurisdictionScope(req, res);
  if (!scope) {
    return null;
  }

  if (scope.type === 'national') {
    return {};
  }

  const agencyFilters = buildScopedAgencyFilters(scope);
  const scopedAgency = await prisma.agency.findFirst({
    where: withActiveRecords({
      id: agencyId,
      OR: agencyFilters.length > 0 ? agencyFilters : [{ id: NEVER_MATCHING_UUID }],
    }),
    select: { id: true },
  });

  if (!scopedAgency) {
    res.status(403).json({
      message: 'Forbidden: you are not allowed to manage responders outside your jurisdiction',
    });
    return null;
  }

  return {};
}
