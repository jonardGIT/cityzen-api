import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { resolveJurisdictionScope } from '../middleware/jurisdiction.js';
import type { AuthUser } from '../types/auth.js';
import { withActiveRecords } from '../utils/archive.js';
import { mutualAidRequestsListQueryConfig } from '../utils/listQueryConfig.js';
import {
  buildPaginatedResponse,
  getListQuery,
  getPaginationQuery,
  getParamId,
} from '../utils/request.js';

const VALID_STATUSES = ['requested', 'approved', 'declined'] as const;
const PATCHABLE_STATUSES = ['approved', 'declined'] as const;
const DUPLICATE_GUARD_STATUSES = ['requested', 'approved', 'declined', 'pending'] as const;
const MUTUAL_AID_WORKFLOW_TYPE = 'same-province-city-to-city';

type AuthenticatedRequest = Request & { authUser?: AuthUser };

type CityMutualAidScope = { kind: 'city'; cityMunicipalityIds: string[] };
type ProvinceMutualAidScope = {
  kind: 'province';
  provinceIds: string[];
  cityMunicipalityIds: string[];
};
type MutualAidReadScope = CityMutualAidScope | ProvinceMutualAidScope;

type MutualAidTransaction = Prisma.TransactionClient;

type IncidentScopeRecord = {
  id: string;
  cityMunicipalityId: string | null;
  provinceId: string | null;
  cityMunicipalityRef: {
    provinceId: string;
    archivedAt: Date | null;
  } | null;
};

type MutualAidWorkflowProvinceRecord = {
  incident: {
    provinceId: string | null;
  } | null;
  requestingJurisdiction: {
    provinceId: string;
  } | null;
  targetJurisdiction: {
    provinceId: string;
  } | null;
};

type MutualAidCreateBody = {
  incidentId: string;
  targetJurisdictionId: string;
  notes?: string | null;
};

type MutualAidPatchBody = {
  status: (typeof PATCHABLE_STATUSES)[number];
};

type ValidationFailureBody = {
  message: 'Validation failed';
  errors: Array<{ field: string; message: string }>;
};

type ControllerResult<TBody> = {
  status: number;
  body: TBody | ValidationFailureBody | { message: string };
};

const mutualAidRequestInclude = Prisma.validator<Prisma.MutualAidRequestInclude>()({
  incident: true,
  requestingJurisdiction: true,
  targetJurisdiction: true,
});

function getAuthUser(req: Request, res: Response): AuthUser | null {
  const { authUser } = req as AuthenticatedRequest;

  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return null;
  }

  return authUser;
}

async function resolveCityActorScope(authUserId: string): Promise<CityMutualAidScope | null> {
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
): Promise<ProvinceMutualAidScope | null> {
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
    cityMunicipalityIds: scope.cityMunicipalityIds ?? [],
  };
}

async function resolveReadScope(authUser: AuthUser): Promise<MutualAidReadScope | null> {
  if (authUser.role === 'CITY_ADMIN' || authUser.role === 'DISPATCHER') {
    return resolveCityActorScope(authUser.id);
  }

  if (authUser.role === 'PROVINCIAL_ADMIN') {
    return resolveProvinceActorScope(authUser.id);
  }

  return null;
}

function hasScopedReadAccess(scope: MutualAidReadScope | null): scope is MutualAidReadScope {
  if (!scope) {
    return false;
  }

  if (scope.cityMunicipalityIds.length === 0) {
    return false;
  }

  if (scope.kind === 'province' && scope.provinceIds.length === 0) {
    return false;
  }

  return true;
}

function buildParticipantWhere(cityMunicipalityIds: string[]): Prisma.MutualAidRequestWhereInput {
  return {
    OR: [
      { requestingJurisdictionId: { in: cityMunicipalityIds } },
      { targetJurisdictionId: { in: cityMunicipalityIds } },
    ],
  };
}

function buildProvinceContainedParticipantWhere(
  cityMunicipalityIds: string[],
): Prisma.MutualAidRequestWhereInput {
  return {
    requestingJurisdictionId: { in: cityMunicipalityIds },
    targetJurisdictionId: { in: cityMunicipalityIds },
  };
}

function buildScopedWhere(
  baseWhere: Prisma.MutualAidRequestWhereInput,
  scope: MutualAidReadScope,
): Prisma.MutualAidRequestWhereInput {
  const scopeWhere =
    scope.kind === 'province'
      ? buildProvinceContainedParticipantWhere(scope.cityMunicipalityIds)
      : buildParticipantWhere(scope.cityMunicipalityIds);

  if (Object.keys(baseWhere).length === 0) {
    return scopeWhere;
  }

  return {
    AND: [baseWhere, scopeWhere],
  };
}

function buildWorkflowContainedReadWhere(
  baseWhere: Prisma.MutualAidRequestWhereInput,
  scope: MutualAidReadScope,
): Prisma.MutualAidRequestWhereInput {
  return {
    AND: [
      buildScopedWhere(baseWhere, scope),
      {
        status: { in: [...VALID_STATUSES] },
      },
    ],
  };
}

function isMutualAidWorkflowRecord(value: unknown): value is {
  incidentId: string;
  requestingJurisdictionId: string;
  targetJurisdictionId: string;
  status: string;
} {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.incidentId === 'string' &&
    typeof candidate.requestingJurisdictionId === 'string' &&
    typeof candidate.targetJurisdictionId === 'string' &&
    typeof candidate.status === 'string'
  );
}

function respondWithEmptyScope(req: Request, res: Response): void {
  const pagination = getPaginationQuery(req);
  if (pagination.enabled) {
    res.json(buildPaginatedResponse([], 0, pagination));
    return;
  }

  res.json([]);
}

function buildValidationFailure(field: string, message: string): ControllerResult<never> {
  return {
    status: 400,
    body: {
      message: 'Validation failed',
      errors: [{ field, message }],
    },
  };
}

async function findScopedIncidentForCreate(
  transaction: MutualAidTransaction,
  incidentId: string,
  scope: CityMutualAidScope,
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

async function findActiveTargetJurisdiction(
  transaction: MutualAidTransaction,
  targetJurisdictionId: string,
): Promise<{ id: string; provinceId: string } | null> {
  return transaction.cityMunicipality.findFirst({
    where: withActiveRecords({ id: targetJurisdictionId }),
    select: { id: true, provinceId: true },
  });
}

async function findDuplicatePendingMutualAidRequest(
  transaction: MutualAidTransaction,
  incidentId: string,
  targetJurisdictionId: string,
): Promise<{ id: string } | null> {
  return transaction.mutualAidRequest.findFirst({
    where: {
      incidentId,
      targetJurisdictionId,
      status: { in: [...DUPLICATE_GUARD_STATUSES] },
    },
    select: { id: true },
  });
}

async function acquireMutualAidCreateLock(
  transaction: MutualAidTransaction,
  incidentId: string,
  targetJurisdictionId: string,
): Promise<void> {
  const lockKey = `${incidentId}:${targetJurisdictionId}`;
  await transaction.$executeRaw`
    SELECT pg_advisory_xact_lock(
      hashtext('mutual_aid_requests_create'),
      hashtext(${lockKey})
    )
  `;
}

async function filterSameProvinceWorkflowRecords<T extends MutualAidWorkflowProvinceRecord>(
  records: T[],
): Promise<T[]> {
  if (records.length === 0) {
    return records;
  }

  return records.filter((record) => {
    const incidentProvinceId = record.incident?.provinceId;
    const requestingProvinceId = record.requestingJurisdiction?.provinceId;
    const targetProvinceId = record.targetJurisdiction?.provinceId;

    if (!incidentProvinceId || !requestingProvinceId || !targetProvinceId) {
      return false;
    }

    return requestingProvinceId === incidentProvinceId && targetProvinceId === incidentProvinceId;
  });
}

async function hasSameProvinceWorkflowRecord(
  record: MutualAidWorkflowProvinceRecord,
): Promise<boolean> {
  const visibleRecords = await filterSameProvinceWorkflowRecords([record]);
  return visibleRecords.length === 1;
}

export async function getMutualAidRequests(req: Request, res: Response): Promise<void> {
  const authUser = getAuthUser(req, res);
  if (!authUser) {
    return;
  }

  const pagination = getPaginationQuery(req);
  const listQuery = getListQuery(req, res, mutualAidRequestsListQueryConfig);
  if (!listQuery) {
    return;
  }

  const scope = await resolveReadScope(authUser);
  if (!hasScopedReadAccess(scope)) {
    respondWithEmptyScope(req, res);
    return;
  }

  const readWhere = buildWorkflowContainedReadWhere(
    (listQuery.where ?? {}) as Prisma.MutualAidRequestWhereInput,
    scope,
  );

  if (pagination.enabled) {
    const [requests, countCandidates] = await Promise.all([
      prisma.mutualAidRequest.findMany({
        where: readWhere,
        include: mutualAidRequestInclude,
        orderBy: listQuery.orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.mutualAidRequest.findMany({
        where: readWhere,
        select: {
          incident: {
            select: {
              provinceId: true,
            },
          },
          requestingJurisdiction: {
            select: {
              provinceId: true,
            },
          },
          targetJurisdiction: {
            select: {
              provinceId: true,
            },
          },
        },
      }),
    ]);

    const [visibleRequests, visibleCountCandidates] = await Promise.all([
      filterSameProvinceWorkflowRecords(requests),
      filterSameProvinceWorkflowRecords(countCandidates),
    ]);

    res.json(buildPaginatedResponse(visibleRequests, visibleCountCandidates.length, pagination));
    return;
  }

  const requests = await prisma.mutualAidRequest.findMany({
    where: readWhere,
    include: mutualAidRequestInclude,
    orderBy: listQuery.orderBy,
  });

  res.json(await filterSameProvinceWorkflowRecords(requests));
}

export async function getMutualAidRequestById(req: Request, res: Response): Promise<void> {
  const authUser = getAuthUser(req, res);
  if (!authUser) {
    return;
  }

  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const scope = await resolveReadScope(authUser);
  if (!hasScopedReadAccess(scope)) {
    res.status(404).json({ message: 'Mutual aid request not found' });
    return;
  }

  const requestRecord = await prisma.mutualAidRequest.findFirst({
    where: buildWorkflowContainedReadWhere({ id }, scope),
    include: mutualAidRequestInclude,
  });

  if (!requestRecord || !(await hasSameProvinceWorkflowRecord(requestRecord))) {
    res.status(404).json({ message: 'Mutual aid request not found' });
    return;
  }

  res.json(requestRecord);
}

export async function createMutualAidRequest(req: Request, res: Response): Promise<void> {
  const authUser = getAuthUser(req, res);
  if (!authUser) {
    return;
  }

  const scope = await resolveCityActorScope(authUser.id);
  if (!scope || scope.cityMunicipalityIds.length === 0) {
    res.status(403).json({ message: 'A valid city jurisdiction scope is required' });
    return;
  }

  const { incidentId, targetJurisdictionId, notes } = req.body as MutualAidCreateBody;
  const result = await prisma.$transaction(async (transaction) => {
    await acquireMutualAidCreateLock(transaction, incidentId, targetJurisdictionId);

    const incident = await findScopedIncidentForCreate(transaction, incidentId, scope);
    if (!incident) {
      return { status: 404, body: { message: 'Incident not found' } };
    }

    if (!incident.cityMunicipalityId || !incident.provinceId) {
      return {
        status: 409,
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
        status: 409,
        body: {
          message: 'Incident locality is malformed and cannot be used for mutual aid routing',
        },
      };
    }

    const canonicalIncidentProvinceId = incident.cityMunicipalityRef.provinceId;

    const targetJurisdiction = await findActiveTargetJurisdiction(
      transaction,
      targetJurisdictionId,
    );
    if (!targetJurisdiction) {
      return buildValidationFailure(
        'targetJurisdictionId',
        'targetJurisdictionId must reference an active city municipality',
      );
    }

    if (targetJurisdiction.id === incident.cityMunicipalityId) {
      return buildValidationFailure(
        'targetJurisdictionId',
        'targetJurisdictionId must be different from the requesting jurisdiction',
      );
    }

    if (targetJurisdiction.provinceId !== canonicalIncidentProvinceId) {
      return buildValidationFailure(
        'targetJurisdictionId',
        'targetJurisdictionId must belong to the same province as the incident',
      );
    }

    const existingRequest = await findDuplicatePendingMutualAidRequest(
      transaction,
      incident.id,
      targetJurisdiction.id,
    );
    if (existingRequest) {
      return {
        status: 409,
        body: {
          message:
            'A requested mutual aid workflow already exists for this incident and target city',
        },
      };
    }

    const createdRequest = await transaction.mutualAidRequest.create({
      data: {
        incidentId: incident.id,
        requestingJurisdictionId: incident.cityMunicipalityId,
        targetJurisdictionId: targetJurisdiction.id,
        requestedById: authUser.id,
        status: 'requested',
        notes: notes ?? null,
      },
      include: mutualAidRequestInclude,
    });

    return { status: 201, body: createdRequest };
  });

  if (result.status === 201 && isMutualAidWorkflowRecord(result.body)) {
    res.locals.auditMetadata = {
      incidentId: result.body.incidentId,
      requestingJurisdictionId: result.body.requestingJurisdictionId,
      targetJurisdictionId: result.body.targetJurisdictionId,
      workflowType: MUTUAL_AID_WORKFLOW_TYPE,
    };
  }

  res.status(result.status).json(result.body);
}

export async function updateMutualAidRequest(req: Request, res: Response): Promise<void> {
  const authUser = getAuthUser(req, res);
  if (!authUser) {
    return;
  }

  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const scope = await resolveCityActorScope(authUser.id);
  if (!scope || scope.cityMunicipalityIds.length === 0) {
    res.status(404).json({ message: 'Mutual aid request not found' });
    return;
  }

  const requestRecord = await prisma.mutualAidRequest.findFirst({
    where: {
      id,
      targetJurisdictionId: { in: scope.cityMunicipalityIds },
    },
    include: mutualAidRequestInclude,
  });

  if (!requestRecord || !(await hasSameProvinceWorkflowRecord(requestRecord))) {
    res.status(404).json({ message: 'Mutual aid request not found' });
    return;
  }

  if (requestRecord.status !== 'requested') {
    res.status(409).json({
      message: 'Only requested mutual aid requests can be approved or declined',
    });
    return;
  }

  const { status } = req.body as MutualAidPatchBody;
  const fromStatus = requestRecord.status;
  const updatedRequest = await prisma.mutualAidRequest.update({
    where: { id: requestRecord.id },
    data: { status },
    include: mutualAidRequestInclude,
  });

  res.locals.auditMetadata = {
    incidentId: updatedRequest.incidentId,
    requestingJurisdictionId: updatedRequest.requestingJurisdictionId,
    targetJurisdictionId: updatedRequest.targetJurisdictionId,
    workflowType: MUTUAL_AID_WORKFLOW_TYPE,
    fromStatus,
    toStatus: updatedRequest.status,
  };

  res.json(updatedRequest);
}

function respondImmutableWorkflowRecord(res: Response): void {
  res.status(405).json({
    message:
      'Mutual aid request records are immutable workflow records and cannot be deleted or restored.',
  });
}

export async function deleteMutualAidRequest(_req: Request, res: Response): Promise<void> {
  respondImmutableWorkflowRecord(res);
}

export async function restoreMutualAidRequest(_req: Request, res: Response): Promise<void> {
  respondImmutableWorkflowRecord(res);
}

export { PATCHABLE_STATUSES, VALID_STATUSES };
