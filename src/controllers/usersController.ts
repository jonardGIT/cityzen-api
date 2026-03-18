// Handles CRUD operations for system users.
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';

// Returns all users from the database.
export async function getUsers(_req: Request, res: Response): Promise<void> {
  const users = await prisma.user.findMany();
  res.json(users);
}

// Returns a single user by numeric ID. Responds 404 if not found.
export async function getUserById(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const user = await prisma.user.findUnique({
    where: { id },
  });
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.json(user);
}

// Creates a new user account. Requires name and email (must be unique).
export async function createUser(req: Request, res: Response): Promise<void> {
  const { name, email } = req.body as { name?: string; email?: string };
  if (!name || !email) {
    res.status(422).json({ message: 'name and email are required' });
    return;
  }
  const newUser = await prisma.user.create({
    data: { name, email },
  });
  res.status(201).json(newUser);
}
