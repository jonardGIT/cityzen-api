import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { resolveJurisdictionScope } from '../middleware/jurisdiction.js';
import type { AuthUser } from '../types/auth.js';
import { withActiveRecords } from '../utils/archive.js';
import { incidentEscalationsListQueryConfig } from '../utils/listQueryConfig.js';
import {
  buildPaginatedResponse,
  getListQuery,
  getPaginationQuery,
  getParamId,
} from '../utils/request.js';

const VALID_LEVELS = ['barangay', 'city', 'province', 'region'] as const;
const VALID_STATUSES = ['pending', 'accepted', 'declined'] as const;
const PATCHABLE_STATUSES = ['accepted', 'declined'] as const;

type AuthenticatedRequest = Request & { authUser?: AuthUser };

type CityEscalationScope = { kind: 'city'; cityMunicipalityIds: string[] };
type ProvinceEscalationScope = { kind: 'province'; provinceIds: string[] };
type EscalationReadScope = CityEscalationScope | ProvinceEscalationScope;

type IncidentScopeRecord = {
  id: string;
  cityMunicipalityId: string | null;
  provinceId: string | null;
  cityMunicipalityRef: {
    provinceId: string;
    archivedAt: Date | null;
  } | null;
};

type CityToProvinceWorkflowRecord = {
  incident: {
    provinceId: string | null;
  } | null;
  sourceCityMunicipality: {
    provinceId: string;
  } | null;
  targetProvince: {
    id: string;
  } | null;
};

type IncidentEscalationTransaction = Prisma.TransactionClient;

type EscalationCreateBody = {
  incidentId: string;
  reason: string;
};

type EscalationPatchBody = {
  status: (typeof PATCHABLE_STATUSES)[number];
};

const incidentEscalationInclude = Prisma.validator<Prisma.IncidentEscalationInclude>()({
  incident: true,
  sourceCityMunicipality: true,
  targetProvince: true,
});

function getAuthUser(req: Request, res: Response): AuthUser | null {
  const { authUser } = req as AuthenticatedRequest;

  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return null;
  }

  return authUser;
}

async function resolveCityActorScope(authUserId: string): Promise<CityEscalationScope | null> {
  const user = await prisma.user.findFirst({
    where: withActiveRecords({ id: authUserId }),
    select: { jurisdictionType: true, jurisdictionId: true },
  });

  if (!user || user.jurisdictionType !== 'city' || !user.jurisdictionId) {
    return null;
  }

  const boundCity = await prisma.cityMunicipality.findFirst({
    where: withActiveRecords({ id: user.jurisdictionId }),
    select: { id: true },
  });

  if (!boundCity) {
    return null;
  }

  const scope = await resolveJurisdictionScope(user.jurisdictionType, user.jurisdictionId);
  if (scope.type !== 'city' || !scope.cityMunicipalityIds?.includes(user.jurisdictionId)) {
    return null;
  }

  return {
    kind: 'city',
    cityMunicipalityIds: scope.cityMunicipalityIds,
  };
}

async function resolveProvinceActorScope(
  authUserId: string,
): Promise<ProvinceEscalationScope | null> {
  const user = await prisma.user.findFirst({
    where: withActiveRecords({ id: authUserId }),
    select: { jurisdictionType: true, jurisdictionId: true },
  });

  if (!user || user.jurisdictionType !== 'province' || !user.jurisdictionId) {
    return null;
  }

  const boundProvince = await prisma.province.findFirst({
    where: withActiveRecords({ id: user.jurisdictionId }),
    select: { id: true },
  });

  if (!boundProvince) {
    return null;
  }

  const scope = await resolveJurisdictionScope(user.jurisdictionType, user.jurisdictionId);
  if (scope.type !== 'province' || !scope.provinceIds?.includes(user.jurisdictionId)) {
    return null;
  }

  return {
    kind: 'province',
    provinceIds: scope.provinceIds,
  };
}

async function resolveReadScope(authUser: AuthUser): Promise<EscalationReadScope | null> {
  if (authUser.role === 'CITY_ADMIN' || authUser.role === 'DISPATCHER') {
    return resolveCityActorScope(authUser.id);
  }

  if (authUser.role === 'PROVINCIAL_ADMIN') {
    return resolveProvinceActorScope(authUser.id);
  }

  return null;
}

function buildScopedEscalationWhere(
  baseWhere: Prisma.IncidentEscalationWhereInput,
  scope: EscalationReadScope,
): Prisma.IncidentEscalationWhereInput {
  const scopeWhere: Prisma.IncidentEscalationWhereInput =
    scope.kind === 'city'
      ? {
          sourceCityMunicipalityId: { in: scope.cityMunicipalityIds },
        }
      : {
          targetProvinceId: { in: scope.provinceIds },
        };

  if (Object.keys(baseWhere).length === 0) {
    return scopeWhere;
  }

  return {
    AND: [baseWhere, scopeWhere],
  };
}

function buildSupportedWorkflowReadWhere(
  baseWhere: Prisma.IncidentEscalationWhereInput,
  scope: EscalationReadScope,
): Prisma.IncidentEscalationWhereInput {
  return {
    AND: [
      buildScopedEscalationWhere(baseWhere, scope),
      {
        fromLevel: 'city',
        toLevel: 'province',
      },
    ],
  };
}

function hasCityToProvinceWorkflowIntegrity(record: CityToProvinceWorkflowRecord): boolean {
  const incidentProvinceId = record.incident?.provinceId;
  const sourceProvinceId = record.sourceCityMunicipality?.provinceId;
  const targetProvinceId = record.targetProvince?.id;

  if (!incidentProvinceId || !sourceProvinceId || !targetProvinceId) {
    return false;
  }

  return sourceProvinceId === incidentProvinceId && targetProvinceId === incidentProvinceId;
}

function filterCityToProvinceWorkflowRecords<T extends CityToProvinceWorkflowRecord>(
  records: T[],
): T[] {
  if (records.length === 0) {
    return records;
  }

  return records.filter((record) => hasCityToProvinceWorkflowIntegrity(record));
}

function respondWithEmptyScope(req: Request, res: Response): void {
  const pagination = getPaginationQuery(req);
  if (pagination.enabled) {
    res.json(buildPaginatedResponse([], 0, pagination));
    return;
  }

  res.json([]);
}

async function findScopedIncidentForCreate(
  transaction: IncidentEscalationTransaction,
  incidentId: string,
  scope: CityEscalationScope,
): Promise<IncidentScopeRecord | null> {
  return transaction.citizenIncident.findFirst({
    where: withActiveRecords({
      id: incidentId,
      cityMunicipalityId: { in: scope.cityMunicipalityIds },
    }),
    select: {
      id: true,
      cityMunicipalityId: true,
      provinceId: true,
      cityMunicipalityRef: {
        select: {
          provinceId: true,
          archivedAt: true,
        },
      },
    },
  });
}

async function findPendingCityToProvinceEscalation(
  transaction: IncidentEscalationTransaction,
  incidentId: string,
): Promise<{ id: string } | null> {
  return transaction.incidentEscalation.findFirst({
    where: {
      incidentId,
      status: 'pending',
      fromLevel: 'city',
      toLevel: 'province',
    },
    select: { id: true },
  });
}

async function acquireIncidentEscalationCreateLock(
  transaction: IncidentEscalationTransaction,
  incidentId: string,
): Promise<void> {
  await transaction.$executeRaw`
    SELECT pg_advisory_xact_lock(
      hashtext('incident_escalations_city_to_province_create'),
      hashtext(${incidentId})
    )
  `;
}

export async function getIncidentEscalations(req: Request, res: Response): Promise<void> {
  const authUser = getAuthUser(req, res);
  if (!authUser) {
    return;
  }

  const pagination = getPaginationQuery(req);
  const listQuery = getListQuery(req, res, incidentEscalationsListQueryConfig);
  if (!listQuery) {
    return;
  }

  const scope = await resolveReadScope(authUser);
  if (
    !scope ||
    (scope.kind === 'city' && scope.cityMunicipalityIds.length === 0) ||
    (scope.kind === 'province' && scope.provinceIds.length === 0)
  ) {
    respondWithEmptyScope(req, res);
    return;
  }

  const scopedWhere = buildScopedEscalationWhere(
    (listQuery.where ?? {}) as Prisma.IncidentEscalationWhereInput,
    scope,
  );
  const readWhere = buildSupportedWorkflowReadWhere(scopedWhere, scope);

  if (pagination.enabled) {
    const [escalations, countCandidates] = await Promise.all([
      prisma.incidentEscalation.findMany({
        where: readWhere,
        include: incidentEscalationInclude,
        orderBy: listQuery.orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.incidentEscalation.findMany({
        where: readWhere,
        select: {
          incident: {
            select: {
              provinceId: true,
            },
          },
          sourceCityMunicipality: {
            select: {
              provinceId: true,
            },
          },
          targetProvince: {
            select: {
              id: true,
            },
          },
        },
      }),
    ]);

    const visibleEscalations = filterCityToProvinceWorkflowRecords(escalations);
    const total = filterCityToProvinceWorkflowRecords(countCandidates).length;

    res.json(buildPaginatedResponse(visibleEscalations, total, pagination));
    return;
  }

  const escalations = await prisma.incidentEscalation.findMany({
    where: readWhere,
    include: incidentEscalationInclude,
    orderBy: listQuery.orderBy,
  });

  res.json(filterCityToProvinceWorkflowRecords(escalations));
}

export async function getIncidentEscalationById(req: Request, res: Response): Promise<void> {
  const authUser = getAuthUser(req, res);
  if (!authUser) {
    return;
  }

  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const scope = await resolveReadScope(authUser);
  if (!scope) {
    res.status(404).json({ message: 'Incident escalation not found' });
    return;
  }

  const escalation = await prisma.incidentEscalation.findFirst({
    where: buildSupportedWorkflowReadWhere({ id }, scope),
    include: incidentEscalationInclude,
  });

  if (!escalation) {
    res.status(404).json({ message: 'Incident escalation not found' });
    return;
  }

  if (!hasCityToProvinceWorkflowIntegrity(escalation)) {
    res.status(404).json({ message: 'Incident escalation not found' });
    return;
  }

  res.json(escalation);
}

export async function createIncidentEscalation(req: Request, res: Response): Promise<void> {
  const authUser = getAuthUser(req, res);
  if (!authUser) {
    return;
  }

  const scope = await resolveCityActorScope(authUser.id);
  if (!scope || scope.cityMunicipalityIds.length === 0) {
    res.status(403).json({ message: 'A valid city jurisdiction scope is required' });
    return;
  }

  const { incidentId, reason } = req.body as EscalationCreateBody;
  const escalation = await prisma.$transaction(async (transaction) => {
    await acquireIncidentEscalationCreateLock(transaction, incidentId);

    const incident = await findScopedIncidentForCreate(transaction, incidentId, scope);

    if (!incident) {
      return { status: 404 as const, body: { message: 'Incident not found' } };
    }

    if (!incident.cityMunicipalityId || !incident.provinceId) {
      return {
        status: 409 as const,
        body: {
          message: 'Incident is missing canonical city or province jurisdiction data',
        },
      };
    }

    if (
      !incident.cityMunicipalityRef ||
      incident.cityMunicipalityRef.archivedAt !== null ||
      incident.cityMunicipalityRef.provinceId !== incident.provinceId
    ) {
      return {
        status: 409 as const,
        body: {
          message:
            'Incident locality is malformed and cannot be used for city-to-province escalation',
        },
      };
    }

    const existingPendingEscalation = await findPendingCityToProvinceEscalation(
      transaction,
      incident.id,
    );
    if (existingPendingEscalation) {
      return {
        status: 409 as const,
        body: {
          message: 'A pending city-to-province escalation already exists for this incident',
        },
      };
    }

    const createdEscalation = await transaction.incidentEscalation.create({
      data: {
        incidentId: incident.id,
        sourceCityMunicipalityId: incident.cityMunicipalityId,
        targetProvinceId: incident.cityMunicipalityRef.provinceId,
        reason,
        fromLevel: 'city',
        toLevel: 'province',
        status: 'pending',
        escalatedById: authUser.id,
      },
      include: incidentEscalationInclude,
    });

    return { status: 201 as const, body: createdEscalation };
  });

  res.status(escalation.status).json(escalation.body);
}

export async function updateIncidentEscalation(req: Request, res: Response): Promise<void> {
  const authUser = getAuthUser(req, res);
  if (!authUser) {
    return;
  }

  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const scope = await resolveProvinceActorScope(authUser.id);
  if (!scope || scope.provinceIds.length === 0) {
    res.status(404).json({ message: 'Incident escalation not found' });
    return;
  }

  const escalation = await prisma.incidentEscalation.findFirst({
    where: buildScopedEscalationWhere({ id }, scope),
    include: incidentEscalationInclude,
  });

  if (!escalation) {
    res.status(404).json({ message: 'Incident escalation not found' });
    return;
  }

  if (!hasCityToProvinceWorkflowIntegrity(escalation)) {
    res.status(404).json({ message: 'Incident escalation not found' });
    return;
  }

  if (escalation.status !== 'pending') {
    res.status(409).json({ message: 'Only pending escalations can be updated' });
    return;
  }

  if (escalation.fromLevel !== 'city' || escalation.toLevel !== 'province') {
    res.status(409).json({
      message: 'Only pending city-to-province escalations can be updated',
    });
    return;
  }

  const { status } = req.body as EscalationPatchBody;
  const updatedEscalation = await prisma.incidentEscalation.update({
    where: { id: escalation.id },
    data: { status },
    include: incidentEscalationInclude,
  });

  res.json(updatedEscalation);
}

function respondImmutableWorkflowRecord(res: Response): void {
  res.status(405).json({
    message:
      'Incident escalation records are immutable workflow records and cannot be deleted or restored.',
  });
}

export async function deleteIncidentEscalation(_req: Request, res: Response): Promise<void> {
  respondImmutableWorkflowRecord(res);
}

export async function restoreIncidentEscalation(_req: Request, res: Response): Promise<void> {
  respondImmutableWorkflowRecord(res);
}

export { PATCHABLE_STATUSES, VALID_LEVELS, VALID_STATUSES };
