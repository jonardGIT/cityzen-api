// Handles CRUD operations for system users.
import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import { revokeAllUserSessions } from '../services/authSessionService.js';
import {
  ROLE_PROFILES,
  canManageRole,
  normalizeUserRoleInput,
} from '../types/auth.js';
import { buildPaginatedResponse, getListQuery, getPaginationQuery } from '../utils/request.js';
import { usersListQueryConfig } from '../utils/listQueryConfig.js';

const userSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  email: true,
  role: true,
} as const;

// UUID v4 validation regex
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function getUserId(req: Request, res?: Response): string | null {
  const id = req.params.id;
  if (typeof id !== 'string' || !UUID_V4_REGEX.test(id)) {
    if (res) {
      res.status(400).json({ message: 'Invalid id parameter (must be a valid UUID v4)' });
    }
    return null;
  }
  return id;
}

function getAuthUser(req: Request) {
  return (req as AuthenticatedRequest).authUser;
}

function normalizeRole(role?: string) {
  return normalizeUserRoleInput(role);
}

function getStoredUserRole(role: string) {
  return normalizeUserRoleInput(role);
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

// Returns capability metadata for the authenticated user role.
export async function getUserCapabilities(req: Request, res: Response): Promise<void> {
  const authUser = getAuthUser(req);
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const profile = ROLE_PROFILES[authUser.role];
  res.json({
    role: authUser.role,
    label: profile.label,
    permissions: profile.permissions,
    scope: profile.scope,
    canUpdateUser:
      profile.permissions.includes('user:update:department') ||
      profile.permissions.includes('user:manage:global'),
    canDeleteUser: profile.permissions.includes('user:manage:global'),
  });
}

// Returns all users from the database.
export async function getUsers(req: Request, res: Response): Promise<void> {
  const pagination = getPaginationQuery(req);
  const listQuery = getListQuery(req, res, usersListQueryConfig);
  if (!listQuery) {
    return;
  }

  if (pagination.enabled) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: userSelect,
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
    select: userSelect,
    where: listQuery.where as any,
    orderBy: listQuery.orderBy as any,
  });
  res.json(users);
}

// Returns a single user by UUID. Responds 404 if not found.
export async function getUserById(req: Request, res: Response): Promise<void> {
  const id = getUserId(req, res);
  if (id === null) return;
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.json(user);
}

// Creates a new user account. Requires name, email, and password.
export async function createUser(req: Request, res: Response): Promise<void> {
  const authUser = getAuthUser(req);
  const { name, email, password, role } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  if (!name || !email || !password) {
    res.status(422).json({ message: 'name, email, and password are required' });
    return;
  }

  const normalizedRole = normalizeRole(role ?? 'CITIZEN_REPORTER');
  if (!normalizedRole) {
    res.status(422).json({
      message:
        'role must be one of SYSTEM_ADMIN, DEPARTMENT_MANAGER, SUPERVISOR, DISPATCHER, RESPONDER, CITIZEN_REPORTER, AUDITOR',
    });
    return;
  }

  if (!canManageRole(authUser.role, normalizedRole)) {
    res.status(403).json({
      message: 'Forbidden: you are not allowed to create a user with that role',
    });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: normalizedRole,
      },
      select: userSelect,
    });
    res.status(201).json(newUser);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      res.status(409).json({ message: 'A user with that email already exists' });
      return;
    }

    throw error;
  }
}

// Updates an existing user account while enforcing access-level hierarchy rules.
export async function updateUser(req: Request, res: Response): Promise<void> {
  const authUser = getAuthUser(req);
  const id = getUserId(req, res);
  if (id === null) return;
  const { name, email, password, role } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const existingUser = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!existingUser) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const existingUserRole = getStoredUserRole(existingUser.role);
  if (!existingUserRole) {
    res.status(500).json({ message: 'Invalid stored user role' });
    return;
  }

  const isSelfUpdate = String(authUser.id) === String(existingUser.id);
  if (!isSelfUpdate && !canManageRole(authUser.role, existingUserRole)) {
    res.status(403).json({
      message: 'Forbidden: you are not allowed to edit that user role',
    });
    return;
  }

  const normalizedRole = normalizeRole(role);
  if (role !== undefined && !normalizedRole) {
    res.status(422).json({
      message:
        'role must be one of SYSTEM_ADMIN, DEPARTMENT_MANAGER, SUPERVISOR, DISPATCHER, RESPONDER, CITIZEN_REPORTER, AUDITOR',
    });
    return;
  }

  if (isSelfUpdate && normalizedRole && normalizedRole !== existingUserRole) {
    res.status(403).json({ message: 'Forbidden: you cannot change your own access level' });
    return;
  }

  if (normalizedRole && !canManageRole(authUser.role, normalizedRole)) {
    res.status(403).json({
      message: 'Forbidden: you are not allowed to assign that role',
    });
    return;
  }

  const data: {
    name?: string;
    email?: string;
    passwordHash?: string;
    role?: string;
  } = {};

  if (name !== undefined) {
    data.name = name;
  }

  if (email !== undefined) {
    data.email = email;
  }

  if (password !== undefined) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  if (normalizedRole) {
    data.role = normalizedRole;
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });

    if (password !== undefined || normalizedRole !== null) {
      await revokeAllUserSessions(id);
    }

    res.json(updatedUser);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      res.status(409).json({ message: 'A user with that email already exists' });
      return;
    }

    throw error;
  }
}

// Deletes an existing user account while preventing self-deletion and peer escalation.
export async function deleteUser(req: Request, res: Response): Promise<void> {
  const authUser = getAuthUser(req);
  const id = getUserId(req, res);
  if (id === null) return;

  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const existingUser = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!existingUser) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const existingUserRole = getStoredUserRole(existingUser.role);
  if (!existingUserRole) {
    res.status(500).json({ message: 'Invalid stored user role' });
    return;
  }

  if (String(authUser.id) === String(existingUser.id)) {
    res.status(403).json({ message: 'Forbidden: you cannot delete your own account' });
    return;
  }

  if (!canManageRole(authUser.role, existingUserRole)) {
    res.status(403).json({
      message: 'Forbidden: you are not allowed to delete that user role',
    });
    return;
  }

  await prisma.user.delete({ where: { id } });
  res.status(204).send();
}
