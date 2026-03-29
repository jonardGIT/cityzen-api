import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { buildPaginatedResponse, getListQuery, getPaginationQuery } from '../utils/request.js';
import { usersListQueryConfig } from '../utils/listQueryConfig.js';

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
        where: listQuery.where as any,
        orderBy: listQuery.orderBy as any,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.user.count({ where: listQuery.where as any }),
    ]);
    res.json(buildPaginatedResponse(users, total, pagination));
    return;
  }

  const users = await prisma.user.findMany({
    select,
    where: listQuery.where as any,
    orderBy: listQuery.orderBy as any,
  });

  res.json(users);
}
