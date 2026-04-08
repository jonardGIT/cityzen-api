import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { publishSecurityAlerts } from './securityAlertService.js';

export interface CreateAuditLogInput {
  timestamp?: Date;
  action: string;
  summary: string;
  outcome: 'success' | 'failure';
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  resource: string;
  method: string;
  path: string;
  statusCode?: number | null;
  targetId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}

export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
  const auditLogDelegate = prisma.auditLog;
  if (!auditLogDelegate?.create) {
    return;
  }

  await auditLogDelegate.create({
    data: {
      timestamp: input.timestamp ?? new Date(),
      action: input.action,
      summary: input.summary,
      outcome: input.outcome,
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail ?? null,
      actorRole: input.actorRole ?? null,
      resource: input.resource,
      method: input.method,
      path: input.path,
      statusCode: input.statusCode ?? null,
      targetId: input.targetId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      requestId: input.requestId ?? null,
      metadata: input.metadata ?? undefined,
    },
  });

  await publishSecurityAlerts(input).catch((error: unknown) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Failed to publish security alert', error);
    }
  });
}
