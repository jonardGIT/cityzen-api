import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import {
  buildPaginatedResponse,
  getListQuery,
  getPaginationQuery,
  getParamId,
} from '../utils/request.js';
import { auditLogsListQueryConfig } from '../utils/listQueryConfig.js';

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  const pagination = getPaginationQuery(req);
  const listQuery = getListQuery(req, res, auditLogsListQueryConfig);
  if (!listQuery) {
    return;
  }

  if (pagination.enabled) {
    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: listQuery.where as any,
        orderBy: listQuery.orderBy as any,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.auditLog.count({ where: listQuery.where as any }),
    ]);

    res.json(buildPaginatedResponse(auditLogs, total, pagination));
    return;
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: listQuery.where as any,
    orderBy: listQuery.orderBy as any,
  });

  res.json(auditLogs);
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

  res.json(auditLog);
}
