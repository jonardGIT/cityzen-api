import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { buildPaginatedResponse, getPaginationQuery, getTimestampQuery } from '../utils/request.js';

// Returns all users for admin-level management views.
export async function getAllUsersForAdmin(req: Request, res: Response): Promise<void> {
  const pagination = getPaginationQuery(req);
  const timestampQuery = getTimestampQuery(req);
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
        where: timestampQuery.hasFilters ? (timestampQuery.where as any) : undefined,
        orderBy: timestampQuery.orderBy as any,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.user.count({ where: timestampQuery.hasFilters ? (timestampQuery.where as any) : undefined }),
    ]);
    res.json(buildPaginatedResponse(users, total, pagination));
    return;
  }

  const users = await prisma.user.findMany({
    select,
    where: timestampQuery.hasFilters ? (timestampQuery.where as any) : undefined,
    orderBy: timestampQuery.orderBy as any,
  });

  res.json(users);
}
