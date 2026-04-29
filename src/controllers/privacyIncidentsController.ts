import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import {
  buildPrivacyIncidentNotificationDueAt,
  buildPrivacyIncidentReferenceCode,
  isPrivacyIncidentSeverity,
  isPrivacyIncidentStatus,
} from '../utils/privacyIncidents.js';

const privacyIncidentSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  referenceCode: true,
  status: true,
  severity: true,
  detectedAt: true,
  occurredAt: true,
  summary: true,
  details: true,
  likelyPersonalDataBreach: true,
  npcNotificationRequired: true,
  npcNotificationDueAt: true,
  npcNotifiedAt: true,
  npcNotificationReference: true,
  dataSubjectNotificationRequired: true,
  dataSubjectNotifiedAt: true,
  dataSubjectNotificationReference: true,
  affectedRecordCount: true,
  affectedDataCategories: true,
  containmentActions: true,
  riskAssessment: true,
  reviewerNotes: true,
  resolutionSummary: true,
  closedAt: true,
  metadata: true,
  reportedByUserId: true,
  reviewedByUserId: true,
  reportedByUser: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  },
  reviewedByUser: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  },
} as const;

function getAuthenticatedUser(req: Request, res: Response) {
  const { authUser } = req as AuthenticatedRequest;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return null;
  }

  return authUser;
}

function getRouteParamId(req: Request, res: Response): string | null {
  const id = req.params.id;

  if (typeof id !== 'string' || !id.trim()) {
    res.status(400).json({ message: 'id must be a valid UUID' });
    return null;
  }

  return id;
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export async function createPrivacyIncident(req: Request, res: Response): Promise<void> {
  const authUser = getAuthenticatedUser(req, res);
  if (!authUser) {
    return;
  }

  const severity = typeof req.body?.severity === 'string' ? req.body.severity.trim() : 'HIGH';
  const detectedAt = parseDate(req.body?.detectedAt) ?? new Date();
  const occurredAt = parseDate(req.body?.occurredAt) ?? null;
  const summary = typeof req.body?.summary === 'string' ? req.body.summary.trim() : '';
  const details = typeof req.body?.details === 'string' ? req.body.details.trim() : undefined;
  const containmentActions =
    typeof req.body?.containmentActions === 'string'
      ? req.body.containmentActions.trim()
      : undefined;
  const riskAssessment =
    typeof req.body?.riskAssessment === 'string' ? req.body.riskAssessment.trim() : undefined;
  const npcNotificationRequired = req.body?.npcNotificationRequired === true;
  const dataSubjectNotificationRequired = req.body?.dataSubjectNotificationRequired === true;
  const affectedRecordCount =
    typeof req.body?.affectedRecordCount === 'number' ? req.body.affectedRecordCount : undefined;
  const affectedDataCategories = parseStringArray(req.body?.affectedDataCategories) ?? [];

  if (!isPrivacyIncidentSeverity(severity)) {
    res.status(422).json({ message: 'severity must be a supported privacy incident severity' });
    return;
  }

  if (!summary) {
    res.status(422).json({ message: 'summary is required to register a privacy incident' });
    return;
  }

  const createdIncident = await prisma.privacyIncident.create({
    data: {
      reportedByUserId: authUser.id,
      referenceCode: buildPrivacyIncidentReferenceCode(),
      status: 'REPORTED',
      severity,
      detectedAt,
      occurredAt,
      summary,
      details,
      containmentActions,
      riskAssessment,
      likelyPersonalDataBreach: req.body?.likelyPersonalDataBreach !== false,
      npcNotificationRequired,
      npcNotificationDueAt: npcNotificationRequired
        ? buildPrivacyIncidentNotificationDueAt(detectedAt)
        : null,
      dataSubjectNotificationRequired,
      affectedRecordCount,
      affectedDataCategories,
    },
    select: privacyIncidentSelect,
  });

  res.locals.auditMetadata = {
    referenceCode: createdIncident.referenceCode,
    severity: createdIncident.severity,
    npcNotificationRequired,
    dataSubjectNotificationRequired,
  };

  res.status(201).json(createdIncident);
}

export async function listPrivacyIncidents(req: Request, res: Response): Promise<void> {
  const rawStatus = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const rawSeverity = typeof req.query.severity === 'string' ? req.query.severity.trim() : '';

  if (rawStatus && !isPrivacyIncidentStatus(rawStatus)) {
    res.status(422).json({ message: 'status must be a supported privacy incident status' });
    return;
  }

  if (rawSeverity && !isPrivacyIncidentSeverity(rawSeverity)) {
    res.status(422).json({ message: 'severity must be a supported privacy incident severity' });
    return;
  }

  const incidents = await prisma.privacyIncident.findMany({
    where: {
      ...(rawStatus ? { status: rawStatus } : {}),
      ...(rawSeverity ? { severity: rawSeverity } : {}),
    },
    select: privacyIncidentSelect,
    orderBy: [{ detectedAt: 'desc' }, { createdAt: 'desc' }],
    take: 500,
  });

  res.json({
    summary: {
      total: incidents.length,
      open: incidents.filter((incident) => incident.status !== 'CLOSED').length,
      pendingNpcNotification: incidents.filter(
        (incident) => incident.npcNotificationRequired && !incident.npcNotifiedAt,
      ).length,
      overdueNpcNotification: incidents.filter(
        (incident) =>
          incident.npcNotificationRequired &&
          !incident.npcNotifiedAt &&
          incident.npcNotificationDueAt &&
          incident.npcNotificationDueAt < new Date(),
      ).length,
    },
    data: incidents,
  });
}

export async function getPrivacyIncidentById(req: Request, res: Response): Promise<void> {
  const id = getRouteParamId(req, res);
  if (!id) {
    return;
  }

  const incident = await prisma.privacyIncident.findUnique({
    where: { id },
    select: privacyIncidentSelect,
  });

  if (!incident) {
    res.status(404).json({ message: 'Privacy incident not found' });
    return;
  }

  res.json(incident);
}

export async function updatePrivacyIncident(req: Request, res: Response): Promise<void> {
  const authUser = getAuthenticatedUser(req, res);
  if (!authUser) {
    return;
  }

  const id = getRouteParamId(req, res);
  if (!id) {
    return;
  }

  const existingIncident = await prisma.privacyIncident.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      detectedAt: true,
      npcNotificationRequired: true,
      npcNotificationDueAt: true,
      npcNotifiedAt: true,
      dataSubjectNotificationRequired: true,
      dataSubjectNotifiedAt: true,
    },
  });

  if (!existingIncident) {
    res.status(404).json({ message: 'Privacy incident not found' });
    return;
  }

  const nextStatus = typeof req.body?.status === 'string' ? req.body.status.trim() : undefined;
  const severity = typeof req.body?.severity === 'string' ? req.body.severity.trim() : undefined;
  const reviewerNotes =
    typeof req.body?.reviewerNotes === 'string' ? req.body.reviewerNotes.trim() : undefined;
  const resolutionSummary =
    typeof req.body?.resolutionSummary === 'string' ? req.body.resolutionSummary.trim() : undefined;
  const npcNotificationReference =
    typeof req.body?.npcNotificationReference === 'string'
      ? req.body.npcNotificationReference.trim()
      : undefined;
  const dataSubjectNotificationReference =
    typeof req.body?.dataSubjectNotificationReference === 'string'
      ? req.body.dataSubjectNotificationReference.trim()
      : undefined;
  const containmentActions =
    typeof req.body?.containmentActions === 'string'
      ? req.body.containmentActions.trim()
      : undefined;
  const riskAssessment =
    typeof req.body?.riskAssessment === 'string' ? req.body.riskAssessment.trim() : undefined;
  const npcNotificationRequired =
    req.body?.npcNotificationRequired === undefined
      ? undefined
      : req.body.npcNotificationRequired === true;
  const dataSubjectNotificationRequired =
    req.body?.dataSubjectNotificationRequired === undefined
      ? undefined
      : req.body.dataSubjectNotificationRequired === true;
  const affectedDataCategories = parseStringArray(req.body?.affectedDataCategories);
  const affectedRecordCount =
    typeof req.body?.affectedRecordCount === 'number' ? req.body.affectedRecordCount : undefined;

  if (nextStatus && !isPrivacyIncidentStatus(nextStatus)) {
    res.status(422).json({ message: 'status must be a supported privacy incident status' });
    return;
  }

  if (severity && !isPrivacyIncidentSeverity(severity)) {
    res.status(422).json({ message: 'severity must be a supported privacy incident severity' });
    return;
  }

  if (nextStatus === 'CLOSED' && !resolutionSummary) {
    res
      .status(422)
      .json({ message: 'resolutionSummary is required when closing a privacy incident' });
    return;
  }

  const updatedIncident = await prisma.privacyIncident.update({
    where: { id },
    data: {
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(severity ? { severity } : {}),
      ...(reviewerNotes !== undefined ? { reviewerNotes } : {}),
      ...(resolutionSummary !== undefined ? { resolutionSummary } : {}),
      ...(npcNotificationReference !== undefined ? { npcNotificationReference } : {}),
      ...(dataSubjectNotificationReference !== undefined
        ? { dataSubjectNotificationReference }
        : {}),
      ...(containmentActions !== undefined ? { containmentActions } : {}),
      ...(riskAssessment !== undefined ? { riskAssessment } : {}),
      ...(affectedDataCategories !== undefined ? { affectedDataCategories } : {}),
      ...(affectedRecordCount !== undefined ? { affectedRecordCount } : {}),
      ...(npcNotificationRequired !== undefined ? { npcNotificationRequired } : {}),
      ...(dataSubjectNotificationRequired !== undefined ? { dataSubjectNotificationRequired } : {}),
      reviewedByUserId: authUser.id,
      npcNotificationDueAt:
        npcNotificationRequired === false
          ? null
          : npcNotificationRequired === true || existingIncident.npcNotificationRequired
            ? (existingIncident.npcNotificationDueAt ??
              buildPrivacyIncidentNotificationDueAt(existingIncident.detectedAt))
            : null,
      npcNotifiedAt:
        nextStatus === 'NPC_NOTIFIED' ? (existingIncident.npcNotifiedAt ?? new Date()) : undefined,
      dataSubjectNotifiedAt:
        nextStatus === 'DATA_SUBJECTS_NOTIFIED'
          ? (existingIncident.dataSubjectNotifiedAt ?? new Date())
          : undefined,
      closedAt: nextStatus === 'CLOSED' ? new Date() : undefined,
    },
    select: privacyIncidentSelect,
  });

  res.locals.auditMetadata = {
    referenceCode: updatedIncident.referenceCode,
    previousStatus: existingIncident.status,
    nextStatus: updatedIncident.status,
    npcNotificationRequired: updatedIncident.npcNotificationRequired,
  };

  res.json(updatedIncident);
}
