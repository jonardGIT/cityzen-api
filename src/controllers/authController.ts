import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import { USER_ROLES } from '../types/auth.js';

function getJwtSecret(): string {
  return process.env.JWT_SECRET ?? 'dev-only-secret-change-me';
}

// Registers a new user (public endpoint for self-registration).
export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name || !email || !password) {
    res.status(422).json({ message: 'name, email, and password are required' });
    return;
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    res.status(409).json({ message: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'VIEWER',
    },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      name: true,
      email: true,
      role: true,
    },
  });

  const accessToken = jwt.sign(
    {
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    {
      subject: String(user.id),
      expiresIn: '12h',
    },
  );

  res.status(201).json({
    token: accessToken,
    tokenType: 'Bearer',
    user,
  });
}

// Authenticates a user by email and password, returning a signed JWT.
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(422).json({ message: 'email and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }

  const role = (
    USER_ROLES.includes(user.role as (typeof USER_ROLES)[number]) ? user.role : 'VIEWER'
  ) as (typeof USER_ROLES)[number];

  const accessToken = jwt.sign(
    {
      email: user.email,
      role,
    },
    getJwtSecret(),
    {
      subject: String(user.id),
      expiresIn: '12h',
    },
  );

  res.json({
    token: accessToken,
    tokenType: 'Bearer',
    user: {
      id: user.id,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      name: user.name,
      email: user.email,
      role,
    },
  });
}

// Returns the currently authenticated user context from JWT claims.
export async function me(req: Request, res: Response): Promise<void> {
  const authUser = (req as AuthenticatedRequest).authUser;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: String(authUser.id) },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  res.json(user);
}
