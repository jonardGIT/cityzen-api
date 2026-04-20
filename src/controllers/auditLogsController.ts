import type { Request, Response } from 'express';
import type { AuditLog } from '@prisma/client';
import prisma from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import {
  buildPaginatedResponse,
  getListQuery,
  getPaginationQuery,
  getParamId,
} from '../utils/request.js';
import {
  auditLogsListQueryConfig,
  auditorAuditLogsListQueryConfig,
} from '../utils/listQueryConfig.js';

function serializeAuditLog(auditLog: AuditLog, req: AuthenticatedRequest): AuditLog {
  if (req.authUser?.role !== 'AUDITOR' || auditLog.resource !== 'auth') {
    return auditLog;
  }

  return {
    ...auditLog,
    ipAddress: null,
    userAgent: null,
    requestId: null,
    metadata: null,
  };
}

function serializeAuditLogs(auditLogs: AuditLog[], req: AuthenticatedRequest): AuditLog[] {
  return auditLogs.map((auditLog) => serializeAuditLog(auditLog, req));
}

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  const pagination = getPaginationQuery(req);
  const listQueryConfig =
    (req as AuthenticatedRequest).authUser?.role === 'AUDITOR'
      ? auditorAuditLogsListQueryConfig
      : auditLogsListQueryConfig;
  const listQuery = getListQuery(req, res, listQueryConfig);
  if (!listQuery) {
    return;
  }

  if (pagination.enabled) {
    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: listQuery.where,
        orderBy: listQuery.orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.auditLog.count({ where: listQuery.where }),
    ]);

    res.json(
      buildPaginatedResponse(
        serializeAuditLogs(auditLogs, req as AuthenticatedRequest),
        total,
        pagination,
      ),
    );
    return;
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: listQuery.where,
    orderBy: listQuery.orderBy,
  });

  res.json(serializeAuditLogs(auditLogs, req as AuthenticatedRequest));
}

export async function getAuditLogById(req: Request, res: Response): Promise<void> {
  const id = getParamId(req, res);
  if (id === null) {
    return;
  }

  const auditLog = await prisma.auditLog.findUnique({ where: { id } });
  if (!auditLog) {
    res.status(404).json({ message: 'Audit log not found' });
    return;
  }

  res.json(serializeAuditLog(auditLog, req as AuthenticatedRequest));
}
