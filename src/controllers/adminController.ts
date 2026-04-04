import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { MFA_REQUIRED_ROLES } from '../types/auth.js';
import { buildPaginatedResponse, getListQuery, getPaginationQuery } from '../utils/request.js';
import { usersListQueryConfig } from '../utils/listQueryConfig.js';
import { withArchiveScope } from '../utils/archive.js';

function getAccessReviewStaleDays(): number {
  const rawValue = process.env.ADMIN_ACCESS_REVIEW_STALE_DAYS?.trim();
  if (!rawValue) {
    return 90;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? Math.floor(parsedValue) : 90;
}

// Returns all users for admin-level management views.
export async function getAllUsersForAdmin(req: Request, res: Response): Promise<void> {
  const pagination = getPaginationQuery(req);
  const listQuery = getListQuery(req, res, usersListQueryConfig);
  if (!listQuery) {
    return;
  }

  const select = {
    id: true,
    createdAt: true,
    updatedAt: true,
    name: true,
    email: true,
    role: true,
  } as const;

  if (pagination.enabled) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select,
        where: withArchiveScope(listQuery.where as any, listQuery.archiveScope) as any,
        orderBy: listQuery.orderBy as any,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.user.count({
        where: withArchiveScope(listQuery.where as any, listQuery.archiveScope) as any,
      }),
    ]);
    res.json(buildPaginatedResponse(users, total, pagination));
    return;
  }

  const users = await prisma.user.findMany({
    select,
    where: withArchiveScope(listQuery.where as any, listQuery.archiveScope) as any,
    orderBy: listQuery.orderBy as any,
  });

  res.json(users);
}

// Returns privileged-user MFA compliance data for operational review.
export async function getPrivilegedMfaComplianceReport(
  _req: Request,
  res: Response,
): Promise<void> {
  const privilegedUsers = await prisma.user.findMany({
    where: withArchiveScope(
      {
        role: {
          in: MFA_REQUIRED_ROLES,
        },
      },
      'active',
    ) as any,
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      name: true,
      email: true,
      role: true,
      mfaEnabled: true,
      mfaEnabledAt: true,
    },
    orderBy: [{ role: 'asc' }, { email: 'asc' }],
  });

  const data = privilegedUsers.map((user) => ({
    ...user,
    requiresMfa: true,
    compliant: user.mfaEnabled,
  }));

  const compliantCount = data.filter((user) => user.compliant).length;

  res.json({
    summary: {
      totalPrivilegedUsers: data.length,
      compliantUsers: compliantCount,
      nonCompliantUsers: data.length - compliantCount,
    },
    data,
  });
}

// Returns privileged-account access review data with session activity and stale-account flags.
export async function getPrivilegedAccessReviewReport(
  _req: Request,
  res: Response,
): Promise<void> {
  const staleAfterDays = getAccessReviewStaleDays();
  const staleBefore = new Date(Date.now() - staleAfterDays * 24 * 60 * 60 * 1000);
  const now = new Date();

  const privilegedUsers = await prisma.user.findMany({
    where: withArchiveScope(
      {
        role: {
          in: MFA_REQUIRED_ROLES,
        },
      },
      'active',
    ) as any,
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      name: true,
      email: true,
      role: true,
      mfaEnabled: true,
      mfaEnabledAt: true,
    },
    orderBy: [{ role: 'asc' }, { email: 'asc' }],
  });

  const sessionRecords =
    privilegedUsers.length > 0
      ? await prisma.authSession.findMany({
          where: {
            userId: {
              in: privilegedUsers.map((user) => user.id),
            },
          },
          select: {
            userId: true,
            createdAt: true,
            lastUsedAt: true,
            refreshExpiresAt: true,
            revokedAt: true,
          },
        })
      : [];

  const sessionsByUserId = new Map<string, typeof sessionRecords>();
  for (const session of sessionRecords) {
    const existing = sessionsByUserId.get(session.userId) ?? [];
    existing.push(session);
    sessionsByUserId.set(session.userId, existing);
  }

  const data = privilegedUsers.map((user) => {
    const userSessions = sessionsByUserId.get(user.id) ?? [];
    const activeSessionCount = userSessions.filter(
      (session) => session.revokedAt === null && session.refreshExpiresAt > now,
    ).length;
    const lastSessionUsedAt = userSessions.reduce<Date | null>((latest, session) => {
      const candidate = session.lastUsedAt ?? session.createdAt;
      if (!latest || candidate > latest) {
        return candidate;
      }

      return latest;
    }, null);
    const stale = !lastSessionUsedAt || lastSessionUsedAt < staleBefore;
    const requiresReview = !user.mfaEnabled || stale;

    return {
      ...user,
      requiresMfa: true,
      activeSessionCount,
      hasActiveSessions: activeSessionCount > 0,
      lastSessionUsedAt: lastSessionUsedAt?.toISOString() ?? null,
      stale,
      requiresReview,
      reviewReasons: [
        ...(!user.mfaEnabled ? ['mfa-disabled'] : []),
        ...(stale ? ['stale-session-activity'] : []),
      ],
    };
  });

  const usersRequiringReview = data.filter((user) => user.requiresReview).length;
  const staleUsers = data.filter((user) => user.stale).length;
  const usersWithoutMfa = data.filter((user) => !user.mfaEnabled).length;

  res.json({
    summary: {
      totalPrivilegedUsers: data.length,
      usersRequiringReview,
      staleUsers,
      usersWithoutMfa,
      staleAfterDays,
    },
    data,
  });
}
