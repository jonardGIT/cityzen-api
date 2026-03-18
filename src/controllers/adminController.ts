import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';

// Returns all users for admin-level management views.
export async function getAllUsersForAdmin(_req: Request, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  res.json(users);
}
