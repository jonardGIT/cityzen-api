// Handles CRUD operations for citizen-reported incidents.
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

async function getLinkedCitizenIdByAuthEmail(email: string): Promise<string | null> {
  const citizen = await prisma.citizen.findFirst({
    where: withActiveRecords({ contactInfo: email }),
    select: { id: true },
  });
  return citizen?.id ?? null;
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

  if (authUser.role === 'CITIZEN_REPORTER') {
    const citizenId = await getLinkedCitizenIdByAuthEmail(authUser.email);
    if (!citizenId) {
      res.status(422).json({
        message:
          'No citizen profile is linked to this account email. Create a citizen profile first.',
      });
      return null;
    }

    if (incident.citizenId !== citizenId) {
      res.status(404).json({ message: 'CitizenIncident not found' });
      return null;
    }
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

  let incidents;
  if (authUser.role === 'CITIZEN_REPORTER') {
    const citizenId = await getLinkedCitizenIdByAuthEmail(authUser.email);
    if (!citizenId) {
      res.status(422).json({
        message:
          'No citizen profile is linked to this account email. Create a citizen profile first.',
      });
      return;
    }

    const scopedWhereClauses =
      where.AND && Array.isArray(where.AND)
        ? [...(where.AND as Record<string, unknown>[]), { citizenId }]
        : [{ citizenId }];

    where = {
      AND: scopedWhereClauses,
    };
  }

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
  } = req.body as Partial<CitizenIncident> & { mediaUrls?: string[] };

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
    if (
      !(await prisma.category.findFirst({ where: withActiveRecords({ id: categoryId }) }))
    ) {
      res.status(400).json({ message: 'categoryId does not reference a valid Category' });
      return;
    }
    if (
      !(await prisma.severity.findFirst({ where: withActiveRecords({ id: severityId }) }))
    ) {
      res.status(400).json({ message: 'severityId does not reference a valid Severity' });
      return;
    }
    const incident = await prisma.citizenIncident.create({
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
    res.status(201).json(await serializeIncident(incident));
  } catch (err) {
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
  } = req.body as Partial<CitizenIncident> & { mediaUrls?: string[] };

  const normalizedMediaUrls = normalizeMediaUrls({ mediaUrl, mediaUrls });

  if (!description || !categoryId || !severityId) {
    res.status(400).json({
      message: 'description, categoryId, and severityId are required',
    });
    return;
  }
  try {
    const citizenId = await getLinkedCitizenIdByAuthEmail(authUser.email);
    if (!citizenId) {
      res.status(422).json({
        message:
          'No citizen profile is linked to this account email. Create a citizen profile first.',
      });
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
    if (
      !(await prisma.category.findFirst({ where: withActiveRecords({ id: categoryId }) }))
    ) {
      res.status(400).json({ message: 'categoryId does not reference a valid Category' });
      return;
    }
    if (
      !(await prisma.severity.findFirst({ where: withActiveRecords({ id: severityId }) }))
    ) {
      res.status(400).json({ message: 'severityId does not reference a valid Severity' });
      return;
    }
    const incident = await prisma.citizenIncident.create({
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
    res.status(201).json(await serializeIncident(incident));
  } catch (err) {
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
  } = req.body as Partial<CitizenIncident> & { mediaUrls?: string[] };

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

  const incident = await prisma.$transaction(async (transaction) => {
    if (normalizedMediaUrls !== undefined) {
      await transaction.incidentMedia.deleteMany({ where: { incidentId: id } });
    }

    return transaction.citizenIncident.update({
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
