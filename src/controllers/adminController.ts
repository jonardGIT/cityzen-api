import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { buildPaginatedResponse, getPaginationQuery } from '../utils/request.js';

// Returns all users for admin-level management views.
export async function getAllUsersForAdmin(req: Request, res: Response): Promise<void> {
  const pagination = getPaginationQuery(req);
  const select = {
    id: true,
    name: true,
    email: true,
    role: true,
  } as const;

  if (pagination.enabled) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.user.count(),
    ]);
    res.json(buildPaginatedResponse(users, total, pagination));
    return;
  }

  const users = await prisma.user.findMany({ select });

  res.json(users);
}
