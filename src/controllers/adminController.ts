import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { MFA_REQUIRED_ROLES } from '../types/auth.js';
import { buildPaginatedResponse, getListQuery, getPaginationQuery } from '../utils/request.js';
import { usersListQueryConfig } from '../utils/listQueryConfig.js';
import { withArchiveScope } from '../utils/archive.js';

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
