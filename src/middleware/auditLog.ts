import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedRequest } from './jwtAuth.js';
import { createAuditLog } from '../services/auditLogService.js';

interface AuditEventDefinition {
  action: string;
  resource: string;
}

function normalizePath(path: string): string {
  return path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
}

function getAuditEvent(method: string, path: string): AuditEventDefinition | null {
  const normalizedPath = normalizePath(path);
  const upperMethod = method.toUpperCase();

  if (upperMethod === 'POST' && normalizedPath === '/auth/login') {
    return { action: 'login', resource: 'auth' };
  }

  if (upperMethod === 'POST' && normalizedPath === '/auth/register') {
    return { action: 'register', resource: 'auth' };
  }

  if (upperMethod === 'POST' && normalizedPath === '/auth/password-reset/request') {
    return { action: 'password_reset_request', resource: 'auth' };
  }

  if (upperMethod === 'POST' && normalizedPath === '/auth/password-reset/confirm') {
    return { action: 'password_reset_confirm', resource: 'auth' };
  }

  if (upperMethod === 'POST' && normalizedPath === '/auth/logout') {
    return { action: 'logout', resource: 'auth' };
  }

  if (upperMethod === 'POST' && normalizedPath === '/auth/refresh') {
    return { action: 'refresh', resource: 'auth' };
  }

  if (upperMethod === 'POST' && normalizedPath === '/auth/mfa/setup') {
    return { action: 'mfa_setup', resource: 'auth' };
  }

  if (upperMethod === 'POST' && normalizedPath === '/auth/mfa/enable') {
    return { action: 'mfa_enable', resource: 'auth' };
  }

  if (upperMethod === 'POST' && normalizedPath === '/auth/mfa/disable') {
    return { action: 'mfa_disable', resource: 'auth' };
  }

  if (upperMethod === 'DELETE' && /^\/auth\/sessions\/[A-Za-z0-9-]+$/.test(normalizedPath)) {
    return { action: 'session_revoke', resource: 'auth' };
  }

  if (upperMethod === 'POST' && normalizedPath === '/citizens/link-me') {
    return { action: 'link', resource: 'citizens' };
  }

  if (upperMethod === 'POST' && normalizedPath === '/incidents/report') {
    return { action: 'report', resource: 'incidents' };
  }

  if (upperMethod === 'POST' && normalizedPath === '/incidents/media/upload') {
    return { action: 'media_upload', resource: 'incidents' };
  }

  if (
    upperMethod === 'GET' &&
    /^\/incidents\/[A-Za-z0-9-]+\/media\/[A-Za-z0-9-]+$/.test(normalizedPath)
  ) {
    return { action: 'media_access', resource: 'incidents' };
  }

  const [resourceSegment, idSegment, extraSegment] = normalizedPath.split('/').filter(Boolean);
  const auditedResources = new Set([
    'citizens',
    'agencies',
    'responders',
    'statuses',
    'categories',
    'severities',
    'incidents',
    'assignments',
    'users',
  ]);

  if (!resourceSegment || !auditedResources.has(resourceSegment)) {
    return null;
  }

  if (upperMethod === 'POST' && !idSegment) {
    return { action: 'create', resource: resourceSegment };
  }

  if (upperMethod === 'POST' && idSegment && extraSegment === 'restore') {
    return { action: 'restore', resource: resourceSegment };
  }

  if ((upperMethod === 'PATCH' || upperMethod === 'DELETE') && idSegment && !extraSegment) {
    return {
      action: upperMethod === 'PATCH' ? 'update' : 'delete',
      resource: resourceSegment,
    };
  }

  return null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getResponseAuditMetadata(res: Response): Prisma.InputJsonObject | null {
  if (!isObject(res.locals.auditMetadata)) {
    return null;
  }

  return res.locals.auditMetadata as Prisma.InputJsonObject;
}

function getTargetId(req: Request, responseBody: unknown): string | null {
  const authUser = (req as AuthenticatedRequest).authUser;
  if (normalizePath(req.path) === '/auth/logout' && authUser) {
    return authUser.id;
  }

  if (isObject(responseBody)) {
    if (typeof responseBody.id === 'string') {
      return responseBody.id;
    }

    if (isObject(responseBody.user) && typeof responseBody.user.id === 'string') {
      return responseBody.user.id;
    }
  }

  if (typeof req.params.id === 'string' && req.params.id.trim()) {
    return req.params.id;
  }

  return null;
}

function getActorContext(req: Request, responseBody: unknown) {
  const authUser = (req as AuthenticatedRequest).authUser;
  if (authUser) {
    return {
      actorUserId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
    };
  }

  if (isObject(responseBody) && isObject(responseBody.user)) {
    return {
      actorUserId: typeof responseBody.user.id === 'string' ? responseBody.user.id : null,
      actorEmail: typeof responseBody.user.email === 'string' ? responseBody.user.email : null,
      actorRole: typeof responseBody.user.role === 'string' ? responseBody.user.role : null,
    };
  }

  return {
    actorUserId: null,
    actorEmail: typeof req.body?.email === 'string' ? req.body.email.trim() : null,
    actorRole: null,
  };
}

function getMetadata(responseBody: unknown): Prisma.InputJsonObject | null {
  if (!isObject(responseBody)) {
    return null;
  }

  const metadata: Record<string, unknown> = {};

  if (typeof responseBody.message === 'string') {
    metadata.message = responseBody.message;
  }

  if (Array.isArray(responseBody.errors)) {
    metadata.errorFields = responseBody.errors.filter(isObject).map((error) => {
      const field = typeof error.field === 'string' ? error.field : 'unknown';
      const message = typeof error.message === 'string' ? error.message : undefined;
      return message ? { field, message } : { field };
    });
  }

  return Object.keys(metadata).length > 0 ? (metadata as Prisma.InputJsonObject) : null;
}

function mergeMetadata(
  responseMetadata: Prisma.InputJsonObject | null,
  localMetadata: Prisma.InputJsonObject | null,
): Prisma.InputJsonObject | null {
  if (!responseMetadata && !localMetadata) {
    return null;
  }

  return {
    ...(responseMetadata ?? {}),
    ...(localMetadata ?? {}),
  };
}

function buildSummary(
  event: AuditEventDefinition,
  outcome: 'success' | 'failure',
  targetId: string | null,
): string {
  const targetLabel = targetId ? ` (${targetId})` : '';
  const verb = outcome === 'success' ? 'succeeded' : 'failed';
  return `${event.action} ${event.resource}${targetLabel} ${verb}`;
}

export function auditLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  res.setHeader('x-request-id', requestId);

  const auditEvent = getAuditEvent(req.method, req.path);
  if (!auditEvent) {
    next();
    return;
  }

  let responseBody: unknown;
  let completed = false;

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    responseBody = body;
    return originalJson(body);
  }) as Response['json'];

  const originalEnd = res.end.bind(res);
  res.end = ((chunk?: unknown, encoding?: unknown, callback?: unknown) => {
    if (completed) {
      return originalEnd(chunk as never, encoding as never, callback as never);
    }

    completed = true;

    originalEnd(chunk as never, encoding as never, callback as never);

    const outcome = res.statusCode >= 200 && res.statusCode < 400 ? 'success' : 'failure';
    const targetId = getTargetId(req, responseBody);
    const actor = getActorContext(req, responseBody);
    const metadata = mergeMetadata(getMetadata(responseBody), getResponseAuditMetadata(res));

    void createAuditLog({
      timestamp: new Date(),
      action: auditEvent.action,
      summary: buildSummary(auditEvent, outcome, targetId),
      outcome,
      actorUserId: actor.actorUserId,
      actorEmail: actor.actorEmail,
      actorRole: actor.actorRole,
      resource: auditEvent.resource,
      method: req.method.toUpperCase(),
      path: normalizePath(req.path),
      statusCode: Number.isFinite(res.statusCode) ? res.statusCode : null,
      targetId,
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
      requestId,
      metadata,
    }).catch((error: unknown) => {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Failed to persist audit log', error);
      }
    });

    return res;
  }) as Response['end'];

  next();
}
