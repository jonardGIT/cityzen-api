// Handles CRUD operations for citizen-reported incidents.
import type { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import {
  buildPaginatedResponse,
  getListQuery,
  getPaginationQuery,
  getParamId,
} from '../utils/request.js';
import { incidentsListQueryConfig } from '../utils/listQueryConfig.js';
import type { CitizenIncident } from '../types/models.js';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import * as supabaseStorageService from '../services/supabaseStorageService.js';
import {
  buildPublicStatusMessage,
  hashCaseToken,
  issueIncidentTrustArtifacts,
} from '../services/incidentTrustService.js';
import {
  IncidentLocalityResolutionError,
  resolveIncidentLocalityIds,
} from '../services/incidentLocalityResolutionService.js';
import type {
  IncidentTimelineEntry,
  IncidentTrustInfo,
  PublicCaseLookupResponse,
  PublicIncidentTimelineEntry,
} from '../types/incidentTrust.js';
import { resolveJurisdictionScope } from '../middleware/jurisdiction.js';
import {
  isArchiveEnabled,
  withActiveRecords,
  withArchivedRecords,
  withArchiveScope,
} from '../utils/archive.js';

type IncidentMediaRecord = {
  id: string;
  mediaUrl: string;
  displayOrder: number;
};

type IncidentWithMediaFiles = {
  mediaUrl: string | null;
  mediaFiles?: IncidentMediaRecord[];
  [key: string]: unknown;
};

type AuthorizedIncidentWithMedia = IncidentWithMediaFiles & {
  citizenId: string;
  mediaFiles: IncidentMediaRecord[];
};

type UploadMediaItem = {
  fileName: string;
  contentType: string;
  dataBase64: string;
};

type IncidentStatusHistoryRecord = {
  id: string;
  createdAt: Date;
  note: string | null;
  fromStatus: {
    id: string;
    name: string;
  } | null;
  toStatus: {
    id: string;
    name: string;
  };
  changedByUser: {
    id: string;
    email: string;
    role: string;
  } | null;
};

type PublicIncidentStatusHistoryRecord = Pick<
  IncidentStatusHistoryRecord,
  'id' | 'createdAt' | 'toStatus'
>;

type PublicCaseTokenRecord = {
  id: string;
  expiresAt: Date;
  incident: {
    publicReference: string | null;
    status: {
      id: string;
      name: string;
    };
    dateReported: Date;
    updatedAt: Date;
    barangay: string | null;
    cityName: string | null;
    provinceName: string | null;
    category: {
      id: string;
      name: string;
      subCategory: string | null;
    };
    severity: {
      id: string;
      level: string;
      definition: string | null;
    };
    statusHistory: PublicIncidentStatusHistoryRecord[];
  };
};

type TrustLayerPrismaDelegates = {
  incidentStatusHistory: {
    create(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<IncidentStatusHistoryRecord[]>;
  };
  caseToken: {
    create(args: unknown): Promise<unknown>;
    findFirst(args: unknown): Promise<PublicCaseTokenRecord | null>;
    update(args: unknown): Promise<unknown>;
  };
};

type TrustLayerTransactionClient = Prisma.TransactionClient & TrustLayerPrismaDelegates;

type LinkedCitizenResolution =
  | { status: 'linked'; citizenId: string }
  | { status: 'missing' }
  | { status: 'ambiguous' };

type TimelineAccessResult = { allowed: true; audience: 'owner' | 'internal' } | { allowed: false };

type IncidentReadScope =
  | { kind: 'owner'; citizenId: string; audience: 'owner' }
  | { kind: 'city'; cityMunicipalityIds: string[]; audience: 'internal' }
  | { kind: 'global'; audience: 'internal' }
  | { kind: 'assigned'; responderId: string; audience: 'internal' };

type IncidentReadScopeOptions = {
  allowNationalAdmin?: boolean;
};

type IncidentReadScopeResult =
  | { status: 'scoped'; scope: IncidentReadScope }
  | { status: 'denied' }
  | { status: 'response-sent' };

type TimelineIncidentRecord = {
  id: string;
  citizenId: string;
  publicReference: string | null;
  cityMunicipalityId: string | null;
};

type IncidentWritePayload = Partial<CitizenIncident> & { mediaUrls?: string[] };

type IncidentLocalityInput = {
  barangay?: string | null;
  cityName?: string | null;
  provinceName?: string | null;
  regionName?: string | null;
  barangayId?: string | null;
  cityMunicipalityId?: string | null;
  provinceId?: string | null;
  regionId?: string | null;
};

const INCIDENT_LOCALITY_WRITE_FIELDS = [
  'barangay',
  'cityName',
  'provinceName',
  'regionName',
  'barangayId',
  'cityMunicipalityId',
  'provinceId',
  'regionId',
] as const;

type IncidentScopeRecord = Pick<TimelineIncidentRecord, 'id' | 'citizenId' | 'cityMunicipalityId'>;

const trustPrisma = prisma as typeof prisma & TrustLayerPrismaDelegates;

function buildIncidentLocationSnapshot(input: Partial<CitizenIncident>) {
  return {
    latitude: input.latitude,
    longitude: input.longitude,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2,
    barangay: input.barangay,
    districtName: input.districtName,
    cityName: input.cityName,
    provinceName: input.provinceName,
    regionName: input.regionName,
    postalCode: input.postalCode,
    landmark: input.landmark,
  };
}

function buildIncidentLocalityResolutionInput(input: IncidentLocalityInput) {
  return {
    barangay: input.barangay,
    cityName: input.cityName,
    provinceName: input.provinceName,
    regionName: input.regionName,
    barangayId: input.barangayId,
    cityMunicipalityId: input.cityMunicipalityId,
    provinceId: input.provinceId,
    regionId: input.regionId,
  };
}

function assertIncidentCityMunicipalityResolved(input: {
  cityMunicipalityId: string | null;
}): asserts input is {
  cityMunicipalityId: string;
} {
  if (!input.cityMunicipalityId) {
    throw new IncidentLocalityResolutionError(
      'Incident locality must resolve to an active city or municipality',
    );
  }
}

async function resolveLinkedCitizenByAuthEmail(email: string): Promise<LinkedCitizenResolution> {
  const citizens = await prisma.citizen.findMany({
    where: withActiveRecords({ contactInfo: email }),
    select: { id: true },
    take: 2,
  });

  if (citizens.length === 0) {
    return { status: 'missing' };
  }

  if (citizens.length > 1) {
    return { status: 'ambiguous' };
  }

  return { status: 'linked', citizenId: citizens[0].id };
}

function handleLinkedCitizenResolution(
  res: Response,
  resolution: LinkedCitizenResolution,
): string | null {
  if (resolution.status === 'linked') {
    return resolution.citizenId;
  }

  if (resolution.status === 'ambiguous') {
    res.status(409).json({
      message:
        'Multiple active citizen profiles are linked to this account email. Contact support.',
    });
    return null;
  }

  res.status(422).json({
    message: 'No citizen profile is linked to this account email. Create a citizen profile first.',
  });
  return null;
}

function normalizeMediaUrls(
  body: Partial<CitizenIncident> & { mediaUrls?: unknown },
): string[] | undefined {
  const values: string[] = [];

  if (Array.isArray(body.mediaUrls)) {
    for (const entry of body.mediaUrls) {
      if (typeof entry === 'string' && entry.trim().length > 0) {
        values.push(supabaseStorageService.normalizeIncidentMediaUrl(entry));
      }
    }
  }

  if (typeof body.mediaUrl === 'string' && body.mediaUrl.trim().length > 0) {
    const legacyMediaUrl = supabaseStorageService.normalizeIncidentMediaUrl(body.mediaUrl);
    if (!values.includes(legacyMediaUrl)) {
      values.unshift(legacyMediaUrl);
    }
  }

  return values.length > 0 ? values : undefined;
}

function buildIncidentMediaCreateMany(mediaUrls: string[] | undefined) {
  if (!mediaUrls || mediaUrls.length === 0) {
    return undefined;
  }

  return {
    create: mediaUrls.map((mediaUrl, index) => ({
      mediaUrl,
      displayOrder: index,
    })),
  };
}

function getStoredIncidentMediaUrls<T extends IncidentWithMediaFiles>(incident: T): string[] {
  const sortedMediaFiles = [...(incident.mediaFiles ?? [])].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );
  const mediaUrls = sortedMediaFiles.map((media) => media.mediaUrl);

  if (mediaUrls.length > 0) {
    return mediaUrls;
  }

  return incident.mediaUrl ? [incident.mediaUrl] : [];
}

async function serializeIncident<T extends IncidentWithMediaFiles>(incident: T) {
  const mediaUrls = await supabaseStorageService.resolveIncidentMediaUrls(
    getStoredIncidentMediaUrls(incident),
  );

  return {
    ...incident,
    mediaUrl: mediaUrls[0] ?? incident.mediaUrl ?? null,
    mediaUrls,
  };
}

async function serializeIncidentCollection<T extends IncidentWithMediaFiles>(incidents: T[]) {
  return Promise.all(incidents.map((incident) => serializeIncident(incident)));
}

function buildIncidentTrustResponse<T extends Record<string, unknown>>(
  incident: T,
  trust: IncidentTrustInfo,
): T & { trust: IncidentTrustInfo } {
  return {
    ...incident,
    trust,
  };
}

async function createIncidentStatusHistory(
  transaction: Prisma.TransactionClient,
  input: {
    incidentId: string;
    fromStatusId?: string | null;
    toStatusId: string;
    changedByUserId?: string | null;
    note?: string | null;
  },
): Promise<void> {
  const trustTransaction = transaction as TrustLayerTransactionClient;

  await trustTransaction.incidentStatusHistory.create({
    data: {
      incidentId: input.incidentId,
      fromStatusId: input.fromStatusId ?? null,
      toStatusId: input.toStatusId,
      changedByUserId: input.changedByUserId ?? null,
      note: input.note ?? null,
    },
  });
}

function serializeInternalTimelineEntry(entry: IncidentStatusHistoryRecord): IncidentTimelineEntry {
  return {
    id: entry.id,
    changedAt: entry.createdAt.toISOString(),
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    changedByUser: entry.changedByUser,
    note: entry.note,
  };
}

function serializePublicTimelineEntry(
  entry: PublicIncidentStatusHistoryRecord,
): PublicIncidentTimelineEntry {
  return {
    id: entry.id,
    changedAt: entry.createdAt.toISOString(),
    status: entry.toStatus,
    publicStatusMessage: buildPublicStatusMessage(entry.toStatus.name),
  };
}

function getUploadMediaItems(body: {
  fileName?: unknown;
  contentType?: unknown;
  dataBase64?: unknown;
  files?: unknown;
}): UploadMediaItem[] {
  if (Array.isArray(body.files) && body.files.length > 0) {
    return body.files
      .filter((entry): entry is UploadMediaItem => {
        if (!entry || typeof entry !== 'object') {
          return false;
        }

        const candidate = entry as Record<string, unknown>;
        return (
          typeof candidate.fileName === 'string' &&
          typeof candidate.contentType === 'string' &&
          typeof candidate.dataBase64 === 'string'
        );
      })
      .map((entry) => ({
        fileName: entry.fileName,
        contentType: entry.contentType,
        dataBase64: entry.dataBase64,
      }));
  }

  if (
    typeof body.fileName === 'string' &&
    typeof body.contentType === 'string' &&
    typeof body.dataBase64 === 'string'
  ) {
    return [
      {
        fileName: body.fileName,
        contentType: body.contentType,
        dataBase64: body.dataBase64,
      },
    ];
  }

  return [];
}

async function archiveIncidentMediaIfNeeded(mediaUrls: string[] | undefined): Promise<void> {
  if (!mediaUrls || mediaUrls.length === 0) {
    return;
  }

  await supabaseStorageService.archiveIncidentMediaUrls(mediaUrls);
}

async function resolveCityScopedIncidentReadScope(
  authUserId: string,
): Promise<Extract<IncidentReadScope, { kind: 'city' }> | null> {
  const user = await prisma.user.findFirst({
    where: withActiveRecords({ id: authUserId }),
    select: { jurisdictionType: true, jurisdictionId: true },
  });

  if (!user || user.jurisdictionType !== 'city' || !user.jurisdictionId) {
    return null;
  }

  const scope = await resolveJurisdictionScope(user.jurisdictionType, user.jurisdictionId);
  if (scope.type !== 'city' || !scope.cityMunicipalityIds?.includes(user.jurisdictionId)) {
    return null;
  }

  return {
    kind: 'city',
    cityMunicipalityIds: scope.cityMunicipalityIds,
    audience: 'internal',
  };
}

async function resolveAssignedResponderId(authUserEmail: string): Promise<string | null> {
  const responders = await prisma.responder.findMany({
    where: withActiveRecords({ contactInfo: authUserEmail }),
    select: { id: true },
    take: 2,
  });

  if (responders.length !== 1) {
    return null;
  }

  return responders[0].id;
}

async function resolveIncidentReadScope(
  authUser: NonNullable<AuthenticatedRequest['authUser']>,
  res: Response,
  options: IncidentReadScopeOptions = {},
): Promise<IncidentReadScopeResult> {
  if (authUser.role === 'CITIZEN_REPORTER') {
    const resolution = await resolveLinkedCitizenByAuthEmail(authUser.email);
    const citizenId = handleLinkedCitizenResolution(res, resolution);
    if (!citizenId) {
      return { status: 'response-sent' };
    }

    return {
      status: 'scoped',
      scope: {
        kind: 'owner',
        citizenId,
        audience: 'owner',
      },
    };
  }

  if (options.allowNationalAdmin && authUser.role === 'NATIONAL_ADMIN') {
    return {
      status: 'scoped',
      scope: {
        kind: 'global',
        audience: 'internal',
      },
    };
  }

  if (authUser.role === 'CITY_ADMIN' || authUser.role === 'DISPATCHER') {
    const scope = await resolveCityScopedIncidentReadScope(authUser.id);
    return scope ? { status: 'scoped', scope } : { status: 'denied' };
  }

  if (authUser.role === 'RESPONDER') {
    const responderId = await resolveAssignedResponderId(authUser.email);
    return responderId
      ? {
          status: 'scoped',
          scope: {
            kind: 'assigned',
            responderId,
            audience: 'internal',
          },
        }
      : { status: 'denied' };
  }

  return { status: 'denied' };
}

function buildIncidentReadScopeWhere(scope: IncidentReadScope): Prisma.CitizenIncidentWhereInput {
  if (scope.kind === 'owner') {
    return { citizenId: scope.citizenId };
  }

  if (scope.kind === 'global') {
    return {};
  }

  if (scope.kind === 'city') {
    return { cityMunicipalityId: { in: scope.cityMunicipalityIds } };
  }

  return {
    assignments: {
      some: withActiveRecords({ responderId: scope.responderId }),
    },
  };
}

function combineIncidentWhere(
  baseWhere: Prisma.CitizenIncidentWhereInput,
  scopeWhere: Prisma.CitizenIncidentWhereInput,
): Prisma.CitizenIncidentWhereInput {
  if (Object.keys(baseWhere).length === 0) {
    return scopeWhere;
  }

  return {
    AND: [baseWhere, scopeWhere],
  };
}

async function canReadIncidentWithScope(
  scope: IncidentReadScope,
  incident: IncidentScopeRecord,
): Promise<boolean> {
  if (scope.kind === 'owner') {
    return incident.citizenId === scope.citizenId;
  }

  if (scope.kind === 'global') {
    return true;
  }

  if (scope.kind === 'city') {
    return Boolean(
      incident.cityMunicipalityId &&
      scope.cityMunicipalityIds.includes(incident.cityMunicipalityId),
    );
  }

  const assignment = await prisma.assignment.findFirst({
    where: withActiveRecords({
      incidentId: incident.id,
      responderId: scope.responderId,
    }),
    select: { id: true },
  });

  return Boolean(assignment);
}

function denyIncidentWrite(res: Response, message: string): void {
  res.status(403).json({ message });
}

async function authorizeIncidentCreate(
  authUser: NonNullable<AuthenticatedRequest['authUser']>,
  res: Response,
  cityMunicipalityId: string,
): Promise<boolean> {
  if (authUser.role === 'RESPONDER') {
    denyIncidentWrite(res, 'Forbidden: responders cannot create incidents through this route');
    return false;
  }

  const scopeResult = await resolveIncidentReadScope(authUser, res, {
    allowNationalAdmin: true,
  });

  if (scopeResult.status !== 'scoped') {
    if (scopeResult.status === 'denied') {
      denyIncidentWrite(res, 'Forbidden: incident creation is outside your allowed scope');
    }

    return false;
  }

  if (scopeResult.scope.kind === 'global') {
    return true;
  }

  if (
    scopeResult.scope.kind === 'city' &&
    scopeResult.scope.cityMunicipalityIds.includes(cityMunicipalityId)
  ) {
    return true;
  }

  denyIncidentWrite(res, 'Forbidden: incident creation is outside your allowed scope');
  return false;
}

async function authorizeIncidentMutation(
  authUser: NonNullable<AuthenticatedRequest['authUser']>,
  res: Response,
  incident: IncidentScopeRecord,
): Promise<boolean> {
  const scopeResult = await resolveIncidentReadScope(authUser, res, {
    allowNationalAdmin: true,
  });

  if (scopeResult.status !== 'scoped') {
    if (scopeResult.status === 'denied') {
      denyIncidentWrite(res, 'Forbidden: incident mutation is outside your allowed scope');
    }

    return false;
  }

  if (await canReadIncidentWithScope(scopeResult.scope, incident)) {
    return true;
  }

  denyIncidentWrite(res, 'Forbidden: incident mutation is outside your allowed scope');
  return false;
}

async function getTimelineAccess(
  authUser: NonNullable<AuthenticatedRequest['authUser']>,
  incident: TimelineIncidentRecord,
  res: Response,
): Promise<TimelineAccessResult> {
  const scopeResult = await resolveIncidentReadScope(authUser, res, {
    allowNationalAdmin: true,
  });
  if (scopeResult.status !== 'scoped') {
    return { allowed: false };
  }

  return (await canReadIncidentWithScope(scopeResult.scope, incident))
    ? { allowed: true, audience: scopeResult.scope.audience }
    : { allowed: false };
}

async function getAuthorizedIncidentWithMedia(
  req: Request,
  res: Response,
  incidentId: string,
): Promise<AuthorizedIncidentWithMedia | null> {
  const { authUser } = req as AuthenticatedRequest;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return null;
  }

  const incident = await prisma.citizenIncident.findFirst({
    where: withActiveRecords({ id: incidentId }),
    include: {
      mediaFiles: {
        orderBy: { displayOrder: 'asc' },
      },
    },
  });

  if (!incident) {
    res.status(404).json({ message: 'CitizenIncident not found' });
    return null;
  }

  const scopeResult = await resolveIncidentReadScope(authUser, res, {
    allowNationalAdmin: true,
  });
  if (scopeResult.status === 'response-sent') {
    return null;
  }

  if (scopeResult.status === 'denied') {
    res.status(404).json({ message: 'CitizenIncident not found' });
    return null;
  }

  if (!(await canReadIncidentWithScope(scopeResult.scope, incident))) {
    res.status(404).json({ message: 'CitizenIncident not found' });
    return null;
  }

  return incident;
}

export async function uploadIncidentMedia(req: Request, res: Response): Promise<void> {
  const { authUser } = req as AuthenticatedRequest;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  try {
    const mediaItems = getUploadMediaItems(req.body as Record<string, unknown>);
    const incidentId =
      typeof req.body.incidentId === 'string' && req.body.incidentId.trim().length > 0
        ? req.body.incidentId.trim()
        : undefined;

    const files = await Promise.all(
      mediaItems.map((item) =>
        supabaseStorageService.uploadIncidentMedia({
          actorUserId: authUser.id,
          fileName: item.fileName,
          contentType: item.contentType,
          dataBase64: item.dataBase64,
          incidentId,
        }),
      ),
    );

    const responseBody: supabaseStorageService.UploadIncidentMediaBatchResult = {
      mediaUrls: files.map((file) => file.mediaUrl),
      accessUrls: files.map((file) => file.accessUrl),
      files,
    };

    res.locals.auditMetadata = {
      uploadedFileCount: files.length,
      uploadedTotalBytes: files.reduce((total, file) => total + file.size, 0),
      managedReferenceCount: files.filter((file) => file.mediaUrl.startsWith('supabase://')).length,
      incidentId: incidentId ?? null,
    };

    res.status(201).json(responseBody);
  } catch (error) {
    if (error instanceof supabaseStorageService.SupabaseStorageServiceError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    throw error;
  }
}

// Returns all incidents from the database.
export async function getIncidents(req: Request, res: Response): Promise<void> {
  const { authUser } = req as AuthenticatedRequest;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const pagination = getPaginationQuery(req);
  const listQuery = getListQuery(req, res, incidentsListQueryConfig);
  if (!listQuery) {
    return;
  }

  let where = (listQuery.where ?? {}) as Record<string, unknown>;

  const scopeResult = await resolveIncidentReadScope(authUser, res, {
    allowNationalAdmin: true,
  });
  if (scopeResult.status === 'response-sent') {
    return;
  }

  if (scopeResult.status === 'denied') {
    if (pagination.enabled) {
      res.json(buildPaginatedResponse([], 0, pagination));
      return;
    }

    res.json([]);
    return;
  }

  let incidents;
  where = combineIncidentWhere(
    where as Prisma.CitizenIncidentWhereInput,
    buildIncidentReadScopeWhere(scopeResult.scope),
  );

  const scopedWhere = withArchiveScope(where, listQuery.archiveScope);

  if (pagination.enabled) {
    const [paginatedIncidents, total] = await Promise.all([
      prisma.citizenIncident.findMany({
        where: scopedWhere,
        include: {
          mediaFiles: {
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: listQuery.orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.citizenIncident.count({ where: scopedWhere }),
    ]);
    res.json(
      buildPaginatedResponse(
        await serializeIncidentCollection(paginatedIncidents),
        total,
        pagination,
      ),
    );
    return;
  }

  incidents = await prisma.citizenIncident.findMany({
    where: scopedWhere,
    include: {
      mediaFiles: {
        orderBy: { displayOrder: 'asc' },
      },
    },
    orderBy: listQuery.orderBy,
  });

  res.json(await serializeIncidentCollection(incidents));
}

// Returns a single incident by UUID. Responds 404 if not found.
export async function getIncidentById(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res) as string | null;
  if (id === null) {
    return;
  }

  const incident = await getAuthorizedIncidentWithMedia(req, res, id);
  if (!incident) {
    return;
  }

  res.json(await serializeIncident(incident));
}

export async function getIncidentTimeline(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res) as string | null;
  if (id === null) {
    return;
  }

  const { authUser } = req as AuthenticatedRequest;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const incident = await prisma.citizenIncident.findFirst({
    where: withActiveRecords({ id }),
    select: {
      id: true,
      citizenId: true,
      publicReference: true,
      cityMunicipalityId: true,
    },
  });
  if (!incident) {
    res.status(404).json({ message: 'CitizenIncident not found' });
    return;
  }

  const access = await getTimelineAccess(authUser, incident, res);
  if (!access.allowed) {
    if (!res.headersSent) {
      res.status(404).json({ message: 'CitizenIncident not found' });
    }
    return;
  }

  const timeline = await trustPrisma.incidentStatusHistory.findMany({
    where: withActiveRecords({ incidentId: id }),
    orderBy: { createdAt: 'asc' },
    include: {
      fromStatus: {
        select: { id: true, name: true },
      },
      toStatus: {
        select: { id: true, name: true },
      },
      changedByUser: {
        select: { id: true, email: true, role: true },
      },
    },
  });

  res.json({
    incidentId: id,
    publicReference: incident.publicReference ?? null,
    timeline:
      access.audience === 'owner'
        ? timeline.map((entry: PublicIncidentStatusHistoryRecord) =>
            serializePublicTimelineEntry(entry),
          )
        : timeline.map((entry: IncidentStatusHistoryRecord) =>
            serializeInternalTimelineEntry(entry),
          ),
  });
}

export async function getPublicCaseByToken(req: Request, res: Response): Promise<void> {
  const caseTokenParam =
    typeof req.params.caseToken === 'string' ? req.params.caseToken.trim() : '';
  if (!caseTokenParam) {
    res.status(400).json({ message: 'caseToken is required' });
    return;
  }

  const tokenHash = hashCaseToken(caseTokenParam);
  const now = new Date();

  const caseToken = await trustPrisma.caseToken.findFirst({
    where: {
      tokenHash,
      archivedAt: null,
      revokedAt: null,
      expiresAt: { gt: now },
      incident: {
        archivedAt: null,
      },
    },
    include: {
      incident: {
        include: {
          status: {
            select: { id: true, name: true },
          },
          category: {
            select: { id: true, name: true, subCategory: true },
          },
          severity: {
            select: { id: true, level: true, definition: true },
          },
          statusHistory: {
            where: { archivedAt: null },
            orderBy: { createdAt: 'asc' },
            include: {
              toStatus: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
    },
  });

  if (!caseToken) {
    res.status(404).json({ message: 'Case not found or token is invalid' });
    return;
  }

  await trustPrisma.caseToken.update({
    where: { id: caseToken.id },
    data: { lastUsedAt: now },
  });

  const responseBody: PublicCaseLookupResponse = {
    publicReference: caseToken.incident.publicReference ?? null,
    status: caseToken.incident.status,
    publicStatusMessage: buildPublicStatusMessage(caseToken.incident.status.name),
    caseTokenExpiresAt: caseToken.expiresAt.toISOString(),
    reportedAt: caseToken.incident.dateReported.toISOString(),
    lastUpdatedAt: caseToken.incident.updatedAt.toISOString(),
    barangay: caseToken.incident.barangay ?? null,
    cityName: caseToken.incident.cityName ?? null,
    provinceName: caseToken.incident.provinceName ?? null,
    category: caseToken.incident.category,
    severity: caseToken.incident.severity,
    timeline: caseToken.incident.statusHistory.map((entry: PublicIncidentStatusHistoryRecord) =>
      serializePublicTimelineEntry(entry),
    ),
  };

  res.json(responseBody);
}

export async function getIncidentMediaAccess(req: Request, res: Response): Promise<void> {
  const incidentId = getParamId(req, res) as string | null;
  if (incidentId === null) {
    return;
  }

  const mediaIdParam = req.params.mediaId;
  const mediaId = typeof mediaIdParam === 'string' ? mediaIdParam.trim() : '';
  if (!mediaId) {
    res.status(400).json({ message: 'mediaId is required' });
    return;
  }

  const incident = await getAuthorizedIncidentWithMedia(req, res, incidentId);
  if (!incident) {
    return;
  }

  const mediaFile = incident.mediaFiles.find((candidate) => candidate.id === mediaId);
  if (!mediaFile) {
    res.status(404).json({ message: 'Incident media not found' });
    return;
  }

  const resolvedUrls = await supabaseStorageService.resolveIncidentMediaUrls([mediaFile.mediaUrl]);
  const accessUrl = resolvedUrls[0] ?? mediaFile.mediaUrl;

  res.locals.auditMetadata = {
    incidentId,
    mediaId: mediaFile.id,
    displayOrder: mediaFile.displayOrder,
    managedReference: mediaFile.mediaUrl.startsWith('supabase://'),
  };

  res.json({
    incidentId,
    mediaId: mediaFile.id,
    displayOrder: mediaFile.displayOrder,
    mediaUrl: mediaFile.mediaUrl,
    accessUrl,
  });
}

// Creates a new incident. Validates all FK references before persisting to the database.
export async function createIncident(req: Request, res: Response): Promise<void> {
  const { authUser } = req as AuthenticatedRequest;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const actorUserId = authUser.id;
  const {
    description,
    mediaUrl,
    mediaUrls,
    dateReported,
    latitude,
    longitude,
    addressLine1,
    addressLine2,
    barangay,
    districtName,
    cityName,
    provinceName,
    regionName,
    postalCode,
    landmark,
    statusId,
    citizenId,
    categoryId,
    severityId,
    regionId,
    provinceId,
    cityMunicipalityId,
    barangayId,
  } = req.body as IncidentWritePayload;

  const normalizedMediaUrls = normalizeMediaUrls({ mediaUrl, mediaUrls });

  if (!description || !statusId || !citizenId || !categoryId || !severityId) {
    res.status(400).json({
      message: 'description, statusId, citizenId, categoryId, and severityId are required',
    });
    return;
  }
  try {
    if (!(await prisma.status.findFirst({ where: withActiveRecords({ id: statusId }) }))) {
      res.status(400).json({ message: 'statusId does not reference a valid Status' });
      return;
    }
    if (!(await prisma.citizen.findFirst({ where: withActiveRecords({ id: citizenId }) }))) {
      res.status(400).json({ message: 'citizenId does not reference a valid Citizen' });
      return;
    }
    if (!(await prisma.category.findFirst({ where: withActiveRecords({ id: categoryId }) }))) {
      res.status(400).json({ message: 'categoryId does not reference a valid Category' });
      return;
    }
    if (!(await prisma.severity.findFirst({ where: withActiveRecords({ id: severityId }) }))) {
      res.status(400).json({ message: 'severityId does not reference a valid Severity' });
      return;
    }

    const resolvedLocalityIds = await resolveIncidentLocalityIds({
      barangay,
      cityName,
      provinceName,
      regionName,
      regionId,
      provinceId,
      cityMunicipalityId,
      barangayId,
    });
    assertIncidentCityMunicipalityResolved(resolvedLocalityIds);

    if (!(await authorizeIncidentCreate(authUser, res, resolvedLocalityIds.cityMunicipalityId))) {
      return;
    }

    const incident = await prisma.$transaction(async (transaction) => {
      const trustTransaction = transaction as TrustLayerTransactionClient;

      const createdIncident = await transaction.citizenIncident.create({
        data: {
          description,
          mediaUrl: normalizedMediaUrls?.[0],
          dateReported: dateReported ? new Date(dateReported) : new Date(),
          ...buildIncidentLocationSnapshot({
            latitude,
            longitude,
            addressLine1,
            addressLine2,
            barangay,
            districtName,
            cityName,
            provinceName,
            regionName,
            postalCode,
            landmark,
          }),
          ...resolvedLocalityIds,
          statusId,
          citizenId,
          categoryId,
          severityId,
          mediaFiles: buildIncidentMediaCreateMany(normalizedMediaUrls),
        },
        include: {
          mediaFiles: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      });

      await createIncidentStatusHistory(transaction, {
        incidentId: createdIncident.id,
        toStatusId: statusId,
        changedByUserId: actorUserId,
      });

      return createdIncident;
    });
    res.status(201).json(await serializeIncident(incident));
  } catch (err) {
    if (err instanceof IncidentLocalityResolutionError) {
      res.status(400).json({ message: err.message });
      return;
    }

    res
      .status(400)
      .json({ message: 'Invalid input or foreign key reference', error: (err as Error)?.message });
  }
}

// Allows a VIEWER user to submit an incident by resolving citizen profile from auth email.
export async function createCitizenIncidentReport(req: Request, res: Response): Promise<void> {
  const { authUser } = req as AuthenticatedRequest;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const {
    description,
    mediaUrl,
    mediaUrls,
    dateReported,
    latitude,
    longitude,
    addressLine1,
    addressLine2,
    barangay,
    districtName,
    cityName,
    provinceName,
    regionName,
    postalCode,
    landmark,
    categoryId,
    severityId,
  } = req.body as IncidentWritePayload;

  const normalizedMediaUrls = normalizeMediaUrls({ mediaUrl, mediaUrls });

  if (!description || !categoryId || !severityId) {
    res.status(400).json({
      message: 'description, categoryId, and severityId are required',
    });
    return;
  }
  try {
    const resolution = await resolveLinkedCitizenByAuthEmail(authUser.email);
    const citizenId = handleLinkedCitizenResolution(res, resolution);
    if (!citizenId) {
      return;
    }
    const reportedStatus = await prisma.status.findFirst({
      where: withActiveRecords({ name: 'Reported' }),
    });
    if (!reportedStatus) {
      res
        .status(500)
        .json({ message: 'Default status "Reported" not found. Contact an administrator.' });
      return;
    }
    const statusId = reportedStatus.id;
    const trustArtifacts = issueIncidentTrustArtifacts(reportedStatus.name);
    if (!(await prisma.category.findFirst({ where: withActiveRecords({ id: categoryId }) }))) {
      res.status(400).json({ message: 'categoryId does not reference a valid Category' });
      return;
    }
    if (!(await prisma.severity.findFirst({ where: withActiveRecords({ id: severityId }) }))) {
      res.status(400).json({ message: 'severityId does not reference a valid Severity' });
      return;
    }

    const resolvedLocalityIds = await resolveIncidentLocalityIds(
      buildIncidentLocalityResolutionInput({
        barangay,
        cityName,
        provinceName,
        regionName,
      }),
    );
    assertIncidentCityMunicipalityResolved(resolvedLocalityIds);

    const incident = await prisma.$transaction(async (transaction) => {
      const trustTransaction = transaction as TrustLayerTransactionClient;

      const createdIncident = await transaction.citizenIncident.create({
        data: {
          publicReference: trustArtifacts.publicReference,
          description,
          mediaUrl: normalizedMediaUrls?.[0],
          dateReported: dateReported ? new Date(dateReported) : new Date(),
          ...buildIncidentLocationSnapshot({
            latitude,
            longitude,
            addressLine1,
            addressLine2,
            barangay,
            districtName,
            cityName,
            provinceName,
            regionName,
            postalCode,
            landmark,
          }),
          ...resolvedLocalityIds,
          statusId,
          citizenId,
          categoryId,
          severityId,
          mediaFiles: buildIncidentMediaCreateMany(normalizedMediaUrls),
        },
        include: {
          mediaFiles: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      });

      await trustTransaction.caseToken.create({
        data: {
          incidentId: createdIncident.id,
          tokenHash: trustArtifacts.tokenHash,
          expiresAt: trustArtifacts.expiresAt,
        },
      });

      await createIncidentStatusHistory(transaction, {
        incidentId: createdIncident.id,
        toStatusId: statusId,
        changedByUserId: authUser.id,
      });

      return createdIncident;
    });

    const serializedIncident = await serializeIncident(incident);
    res.status(201).json(
      buildIncidentTrustResponse(serializedIncident, {
        caseToken: trustArtifacts.caseToken,
        caseLookupPath: trustArtifacts.caseLookupPath,
        caseTokenExpiresAt: trustArtifacts.expiresAt.toISOString(),
        publicStatusMessage: trustArtifacts.publicStatusMessage,
      }),
    );
  } catch (err) {
    if (err instanceof IncidentLocalityResolutionError) {
      res.status(400).json({ message: err.message });
      return;
    }

    res.status(400).json({
      message: 'Invalid input or foreign key reference',
      errors: [
        {
          field: 'id',
          message: (err as Error)?.message || 'Invalid input',
        },
      ],
    });
  }
}

// Updates an existing incident and validates any provided foreign keys.
export async function updateIncident(req: Request, res: Response): Promise<void> {
  const { authUser } = req as AuthenticatedRequest;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const actorUserId = authUser.id;
  const id = getParamId(req, res) as string | null;
  if (id === null) {
    return;
  }

  const {
    description,
    mediaUrl,
    mediaUrls,
    dateReported,
    latitude,
    longitude,
    addressLine1,
    addressLine2,
    barangay,
    districtName,
    cityName,
    provinceName,
    regionName,
    postalCode,
    landmark,
    statusId,
    citizenId,
    categoryId,
    severityId,
    regionId,
    provinceId,
    cityMunicipalityId,
    barangayId,
  } = req.body as IncidentWritePayload;

  const normalizedMediaUrls = normalizeMediaUrls({ mediaUrl, mediaUrls });

  const existingIncident = await prisma.citizenIncident.findFirst({
    where: withActiveRecords({ id }),
    include: {
      mediaFiles: {
        orderBy: { displayOrder: 'asc' },
      },
    },
  });
  if (!existingIncident) {
    res.status(404).json({ message: 'CitizenIncident not found' });
    return;
  }

  if (!(await authorizeIncidentMutation(authUser, res, existingIncident))) {
    return;
  }

  const existingMediaUrls = getStoredIncidentMediaUrls(existingIncident);

  if (
    statusId !== undefined &&
    !(await prisma.status.findFirst({ where: withActiveRecords({ id: statusId }) }))
  ) {
    res.status(400).json({ message: 'statusId does not reference a valid Status' });
    return;
  }
  if (
    citizenId !== undefined &&
    !(await prisma.citizen.findFirst({ where: withActiveRecords({ id: citizenId }) }))
  ) {
    res.status(400).json({ message: 'citizenId does not reference a valid Citizen' });
    return;
  }
  if (
    categoryId !== undefined &&
    !(await prisma.category.findFirst({ where: withActiveRecords({ id: categoryId }) }))
  ) {
    res.status(400).json({ message: 'categoryId does not reference a valid Category' });
    return;
  }
  if (
    severityId !== undefined &&
    !(await prisma.severity.findFirst({ where: withActiveRecords({ id: severityId }) }))
  ) {
    res.status(400).json({ message: 'severityId does not reference a valid Severity' });
    return;
  }

  const shouldAppendStatusHistory =
    statusId !== undefined && statusId !== existingIncident.statusId;
  const hasExplicitBarangayUpdate = Object.prototype.hasOwnProperty.call(req.body, 'barangay');

  const shouldResolveLocality = INCIDENT_LOCALITY_WRITE_FIELDS.some(
    (field) => (req.body as Record<string, unknown>)[field] !== undefined,
  );

  let resolvedLocalityIds:
    | {
        regionId: string | null;
        provinceId: string | null;
        cityMunicipalityId: string | null;
        barangayId: string | null;
      }
    | undefined;

  if (shouldResolveLocality) {
    try {
      resolvedLocalityIds = await resolveIncidentLocalityIds(
        buildIncidentLocalityResolutionInput({
          barangay: hasExplicitBarangayUpdate ? barangay : existingIncident.barangay,
          cityName: cityName ?? existingIncident.cityName,
          provinceName: provinceName ?? existingIncident.provinceName,
          regionName: regionName ?? existingIncident.regionName,
          barangayId,
          cityMunicipalityId,
          provinceId,
          regionId,
        }),
      );
      assertIncidentCityMunicipalityResolved(resolvedLocalityIds);
    } catch (err) {
      if (err instanceof IncidentLocalityResolutionError) {
        res.status(400).json({ message: err.message });
        return;
      }

      throw err;
    }
  }

  const hasCanonicalLocalityChange =
    resolvedLocalityIds !== undefined &&
    (resolvedLocalityIds.regionId !== existingIncident.regionId ||
      resolvedLocalityIds.provinceId !== existingIncident.provinceId ||
      resolvedLocalityIds.cityMunicipalityId !== existingIncident.cityMunicipalityId ||
      resolvedLocalityIds.barangayId !== existingIncident.barangayId);

  if (hasCanonicalLocalityChange) {
    const supportedEscalationCount = await prisma.incidentEscalation.count({
      where: {
        incidentId: id,
        fromLevel: 'city',
        toLevel: 'province',
      },
    });

    if (supportedEscalationCount > 0) {
      res.status(409).json({
        message:
          'Incident locality cannot be changed after a city-to-province escalation has been created',
      });
      return;
    }
  }

  const incident = await prisma.$transaction(async (transaction) => {
    if (normalizedMediaUrls !== undefined) {
      await transaction.incidentMedia.deleteMany({ where: { incidentId: id } });
    }

    const updatedIncident = await transaction.citizenIncident.update({
      where: { id },
      data: {
        description,
        mediaUrl: normalizedMediaUrls !== undefined ? (normalizedMediaUrls[0] ?? null) : undefined,
        dateReported: dateReported ? new Date(dateReported) : undefined,
        ...buildIncidentLocationSnapshot({
          latitude,
          longitude,
          addressLine1,
          addressLine2,
          barangay,
          districtName,
          cityName,
          provinceName,
          regionName,
          postalCode,
          landmark,
        }),
        ...(resolvedLocalityIds ?? {}),
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...(normalizedMediaUrls !== undefined
          ? { mediaFiles: buildIncidentMediaCreateMany(normalizedMediaUrls) }
          : {}),
      },
      include: {
        mediaFiles: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (shouldAppendStatusHistory && statusId) {
      await createIncidentStatusHistory(transaction, {
        incidentId: id,
        fromStatusId: existingIncident.statusId,
        toStatusId: statusId,
        changedByUserId: actorUserId,
      });
    }

    return updatedIncident;
  });

  if (normalizedMediaUrls !== undefined) {
    const replacedMediaUrls = existingMediaUrls.filter(
      (existingMediaUrl) => !normalizedMediaUrls.includes(existingMediaUrl),
    );
    await archiveIncidentMediaIfNeeded(replacedMediaUrls);
  }

  res.json(await serializeIncident(incident));
}

// Deletes an existing incident.
export async function deleteIncident(req: Request, res: Response): Promise<void> {
  const { authUser } = req as AuthenticatedRequest;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const id = getParamId(req, res) as string | null;
  if (id === null) {
    return;
  }

  const existingIncident = await prisma.citizenIncident.findFirst({
    where: withActiveRecords({ id }),
    include: {
      mediaFiles: {
        orderBy: { displayOrder: 'asc' },
      },
    },
  });
  if (!existingIncident) {
    res.status(404).json({ message: 'CitizenIncident not found' });
    return;
  }

  if (!(await authorizeIncidentMutation(authUser, res, existingIncident))) {
    return;
  }

  if (isArchiveEnabled()) {
    await prisma.$transaction(async (transaction) => {
      await transaction.assignment.updateMany({
        where: withActiveRecords({ incidentId: id }),
        data: { archivedAt: new Date() },
      });

      await transaction.citizenIncident.update({
        where: { id },
        data: { archivedAt: new Date() },
      });
    });
  } else {
    const existingMediaUrls = getStoredIncidentMediaUrls(existingIncident);
    await prisma.citizenIncident.delete({ where: { id } });
    await archiveIncidentMediaIfNeeded(existingMediaUrls);
  }

  res.status(204).send();
}

export async function restoreIncident(req: Request, res: Response): Promise<void> {
  const { authUser } = req as AuthenticatedRequest;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const id = getParamId(req, res) as string | null;
  if (id === null) {
    return;
  }

  if (!isArchiveEnabled()) {
    res.status(409).json({ message: 'Archive mode is disabled; restore is unavailable' });
    return;
  }

  const existingIncident = await prisma.citizenIncident.findFirst({
    where: withArchivedRecords({ id }),
    include: {
      mediaFiles: {
        orderBy: { displayOrder: 'asc' },
      },
    },
  });
  if (!existingIncident) {
    res.status(404).json({ message: 'Archived CitizenIncident not found' });
    return;
  }

  if (!(await authorizeIncidentMutation(authUser, res, existingIncident))) {
    return;
  }

  const [status, citizen, category, severity] = await Promise.all([
    prisma.status.findFirst({ where: withActiveRecords({ id: existingIncident.statusId }) }),
    prisma.citizen.findFirst({
      where: withActiveRecords({ id: existingIncident.citizenId }),
    }),
    prisma.category.findFirst({
      where: withActiveRecords({ id: existingIncident.categoryId }),
    }),
    prisma.severity.findFirst({
      where: withActiveRecords({ id: existingIncident.severityId }),
    }),
  ]);

  if (!status || !citizen || !category || !severity) {
    res.status(409).json({
      message:
        'Conflict: incident cannot be restored until its status, citizen, category, and severity are active',
    });
    return;
  }

  const incident = await prisma.$transaction(async (transaction) => {
    const restoredIncident = await transaction.citizenIncident.update({
      where: { id },
      data: { archivedAt: null },
      include: {
        mediaFiles: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    const restorableAssignments = await transaction.assignment.findMany({
      where: {
        AND: [
          { incidentId: id },
          { archivedAt: { not: null } },
          { responder: { archivedAt: null } },
        ],
      },
      select: { id: true },
    });

    if (restorableAssignments.length > 0) {
      await transaction.assignment.updateMany({
        where: { id: { in: restorableAssignments.map((assignment) => assignment.id) } },
        data: { archivedAt: null },
      });
    }

    return restoredIncident;
  });

  res.json(await serializeIncident(incident));
}
