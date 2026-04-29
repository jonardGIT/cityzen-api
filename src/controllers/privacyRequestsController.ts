import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import {
  AMBIGUOUS_LINKED_CITIZEN_MESSAGE,
  CONFLICTING_LINKED_CITIZEN_MESSAGE,
  resolveLinkedCitizenForAuthUser,
} from '../services/userCitizenLinkService.js';
import {
  buildDataSubjectRequestDueAt,
  isDataSubjectRequestStatus,
  isDataSubjectRequestType,
} from '../utils/privacyRequests.js';

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

async function resolveOptionalCitizenId(
  userId: string,
  email: string,
  res: Response,
): Promise<string | null | symbol> {
  const resolution = await resolveLinkedCitizenForAuthUser({ id: userId, email });

  if (resolution.status === 'ambiguous') {
    res.status(409).json({ message: AMBIGUOUS_LINKED_CITIZEN_MESSAGE });
    return Symbol.for('handled');
  }

  if (resolution.status === 'conflict') {
    res.status(409).json({ message: CONFLICTING_LINKED_CITIZEN_MESSAGE });
    return Symbol.for('handled');
  }

  return resolution.status === 'linked' ? resolution.citizenId : null;
}

const ownRequestSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  requestType: true,
  status: true,
  channel: true,
  requesterEmail: true,
  details: true,
  reviewerNotes: true,
  resolutionSummary: true,
  acknowledgedAt: true,
  reviewedAt: true,
  resolvedAt: true,
  dueAt: true,
} as const;

const adminRequestSelect = {
  ...ownRequestSelect,
  requesterUserId: true,
  reviewerUserId: true,
  citizenId: true,
  requesterUser: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  },
  reviewerUser: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  },
} as const;

export async function createMyDataSubjectRequest(req: Request, res: Response): Promise<void> {
  const authUser = getAuthenticatedUser(req, res);
  if (!authUser) {
    return;
  }

  const requestType = typeof req.body?.requestType === 'string' ? req.body.requestType.trim() : '';
  const details = typeof req.body?.details === 'string' ? req.body.details.trim() : '';

  if (!isDataSubjectRequestType(requestType)) {
    res.status(422).json({ message: 'requestType must be a supported data-subject request type' });
    return;
  }

  if (!details) {
    res.status(422).json({ message: 'details are required to process a data-subject request' });
    return;
  }

  const citizenId = await resolveOptionalCitizenId(authUser.id, authUser.email, res);
  if (typeof citizenId === 'symbol') {
    return;
  }

  const requestedAt = new Date();
  const dueAt = buildDataSubjectRequestDueAt(requestedAt);

  const createdRequest = await prisma.dataSubjectRequest.create({
    data: {
      requesterUserId: authUser.id,
      requesterEmail: authUser.email,
      citizenId,
      requestType,
      status: 'SUBMITTED',
      channel: 'self-service',
      details,
      dueAt,
    },
    select: ownRequestSelect,
  });

  res.locals.auditMetadata = {
    requestType,
    status: 'SUBMITTED',
    dueAt: dueAt.toISOString(),
    citizenLinked: Boolean(citizenId),
  };

  res.status(201).json(createdRequest);
}

export async function listMyDataSubjectRequests(req: Request, res: Response): Promise<void> {
  const authUser = getAuthenticatedUser(req, res);
  if (!authUser) {
    return;
  }

  const requests = await prisma.dataSubjectRequest.findMany({
    where: {
      requesterUserId: authUser.id,
    },
    select: ownRequestSelect,
    orderBy: [{ createdAt: 'desc' }],
  });

  res.json(requests);
}

export async function getMyDataSubjectRequestById(req: Request, res: Response): Promise<void> {
  const authUser = getAuthenticatedUser(req, res);
  if (!authUser) {
    return;
  }

  const id = getRouteParamId(req, res);
  if (!id) {
    return;
  }

  const requestRecord = await prisma.dataSubjectRequest.findFirst({
    where: {
      id,
      requesterUserId: authUser.id,
    },
    select: ownRequestSelect,
  });

  if (!requestRecord) {
    res.status(404).json({ message: 'Data-subject request not found' });
    return;
  }

  res.json(requestRecord);
}

export async function listAdminDataSubjectRequests(req: Request, res: Response): Promise<void> {
  const rawStatus = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const rawRequestType =
    typeof req.query.requestType === 'string' ? req.query.requestType.trim() : '';

  if (rawStatus && !isDataSubjectRequestStatus(rawStatus)) {
    res.status(422).json({ message: 'status must be a supported data-subject request status' });
    return;
  }

  if (rawRequestType && !isDataSubjectRequestType(rawRequestType)) {
    res.status(422).json({ message: 'requestType must be a supported data-subject request type' });
    return;
  }

  const requests = await prisma.dataSubjectRequest.findMany({
    where: {
      ...(rawStatus ? { status: rawStatus } : {}),
      ...(rawRequestType ? { requestType: rawRequestType } : {}),
    },
    select: adminRequestSelect,
    orderBy: [{ createdAt: 'desc' }],
    take: 500,
  });

  res.json({
    summary: {
      total: requests.length,
      submitted: requests.filter((requestRecord) => requestRecord.status === 'SUBMITTED').length,
      inReview: requests.filter((requestRecord) => requestRecord.status === 'IN_REVIEW').length,
      overdue: requests.filter(
        (requestRecord) =>
          requestRecord.status !== 'FULFILLED' &&
          requestRecord.status !== 'REJECTED' &&
          requestRecord.status !== 'CANCELLED' &&
          requestRecord.dueAt < new Date(),
      ).length,
    },
    data: requests,
  });
}

export async function getAdminDataSubjectRequestById(req: Request, res: Response): Promise<void> {
  const id = getRouteParamId(req, res);
  if (!id) {
    return;
  }

  const requestRecord = await prisma.dataSubjectRequest.findUnique({
    where: { id },
    select: adminRequestSelect,
  });

  if (!requestRecord) {
    res.status(404).json({ message: 'Data-subject request not found' });
    return;
  }

  res.json(requestRecord);
}

export async function updateAdminDataSubjectRequest(req: Request, res: Response): Promise<void> {
  const { authUser } = req as AuthenticatedRequest;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const id = getRouteParamId(req, res);
  if (!id) {
    return;
  }

  const requestRecord = await prisma.dataSubjectRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      acknowledgedAt: true,
    },
  });

  if (!requestRecord) {
    res.status(404).json({ message: 'Data-subject request not found' });
    return;
  }

  const nextStatus = typeof req.body?.status === 'string' ? req.body.status.trim() : undefined;
  const reviewerNotes =
    typeof req.body?.reviewerNotes === 'string' ? req.body.reviewerNotes.trim() : undefined;
  const resolutionSummary =
    typeof req.body?.resolutionSummary === 'string' ? req.body.resolutionSummary.trim() : undefined;

  if (nextStatus && !isDataSubjectRequestStatus(nextStatus)) {
    res.status(422).json({ message: 'status must be a supported data-subject request status' });
    return;
  }

  const terminalStatus =
    nextStatus === 'FULFILLED' || nextStatus === 'REJECTED' || nextStatus === 'CANCELLED';
  if (terminalStatus && !resolutionSummary) {
    res
      .status(422)
      .json({ message: 'resolutionSummary is required when closing a data-subject request' });
    return;
  }

  const updatedRequest = await prisma.dataSubjectRequest.update({
    where: { id: requestRecord.id },
    data: {
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(reviewerNotes !== undefined ? { reviewerNotes } : {}),
      ...(resolutionSummary !== undefined ? { resolutionSummary } : {}),
      reviewerUserId: authUser.id,
      acknowledgedAt:
        requestRecord.acknowledgedAt ??
        (nextStatus && nextStatus !== 'SUBMITTED' ? new Date() : undefined),
      reviewedAt: nextStatus === 'IN_REVIEW' ? new Date() : undefined,
      resolvedAt: terminalStatus ? new Date() : undefined,
    },
    select: adminRequestSelect,
  });

  res.locals.auditMetadata = {
    previousStatus: requestRecord.status,
    nextStatus: updatedRequest.status,
    reviewerAssigned: authUser.id,
  };

  res.json(updatedRequest);
}
