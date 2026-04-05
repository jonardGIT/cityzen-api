// Handles CRUD operations for system users.
import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import { revokeAllUserSessions } from '../services/authSessionService.js';
import {
  deleteSupabaseAuthUser,
  isSupabaseAuthEnabled,
  registerSupabaseAuthUser,
  SupabaseAuthServiceError,
  updateSupabaseAuthUser,
} from '../services/supabaseAuthService.js';
import { ROLE_PROFILES, canManageRole, normalizeUserRoleInput } from '../types/auth.js';
import { buildPaginatedResponse, getListQuery, getPaginationQuery } from '../utils/request.js';
import { usersListQueryConfig } from '../utils/listQueryConfig.js';
import {
  isArchiveEnabled,
  withActiveRecords,
  withArchivedRecords,
  withArchiveScope,
} from '../utils/archive.js';

const userSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  email: true,
  role: true,
} as const;

const userSyncSelect = {
  ...userSelect,
  supabaseAuthUserId: true,
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getStoredUserRole(role: string) {
  return normalizeUserRoleInput(role);
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function handleSupabaseAuthRuntimeError(res: Response, error: unknown): boolean {
  if (error instanceof SupabaseAuthServiceError) {
    res.status(error.status ?? 503).json({ message: error.message });
    return true;
  }

  if (
    error instanceof Error &&
    (error.message.includes('SUPABASE_URL must be configured') ||
      error.message.includes('SUPABASE_ANON_KEY must be configured') ||
      error.message.includes('SUPABASE_SERVICE_ROLE_KEY must be configured'))
  ) {
    res.status(503).json({
      message: `Supabase Auth is not available: ${error.message}`,
    });
    return true;
  }

  return false;
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
    select: userSelect,
    where: withArchiveScope(listQuery.where as any, listQuery.archiveScope) as any,
    orderBy: listQuery.orderBy as any,
  });
  res.json(users);
}

// Returns a single user by UUID. Responds 404 if not found.
export async function getUserById(req: Request, res: Response): Promise<void> {
  const id = getUserId(req, res);
  if (id === null) return;
  const user = await prisma.user.findFirst({
    where: withActiveRecords({ id }) as any,
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

  const normalizedEmail = normalizeEmail(email);

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

  let passwordHash: string | null = null;
  let supabaseAuthUserId: string | null = null;

  if (isSupabaseAuthEnabled()) {
    try {
      const supabaseUser = await registerSupabaseAuthUser({
        email: normalizedEmail,
        password,
        name,
        role: normalizedRole,
      });
      supabaseAuthUserId = supabaseUser.id;
    } catch (error) {
      if (handleSupabaseAuthRuntimeError(res, error)) {
        return;
      }

      throw error;
    }
  } else {
    passwordHash = await bcrypt.hash(password, 10);
  }

  try {
    const createData: Prisma.UserCreateInput = {
      name,
      email: normalizedEmail,
      role: normalizedRole,
    };

    if (passwordHash !== null) {
      createData.passwordHash = passwordHash;
    }

    if (supabaseAuthUserId !== null) {
      createData.supabaseAuthUserId = supabaseAuthUserId;
    }

    const newUser = await prisma.user.create({
      data: createData,
      select: userSelect,
    });

    res.locals.auditMetadata = {
      managedUserRole: normalizedRole,
      privilegedTarget: ['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'SUPERVISOR', 'DISPATCHER'].includes(
        normalizedRole,
      ),
      passwordChanged: password !== undefined,
      authProvider: isSupabaseAuthEnabled() ? 'supabase' : 'local',
    };

    res.status(201).json(newUser);
  } catch (error) {
    if (supabaseAuthUserId) {
      await deleteSupabaseAuthUser(supabaseAuthUserId).catch(() => undefined);
    }

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

  const existingUser = await prisma.user.findFirst({
    where: withActiveRecords({ id }) as any,
    select: userSyncSelect,
  });
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

  const data: Prisma.UserUpdateInput = {};
  const normalizedEmail = email !== undefined ? normalizeEmail(email) : undefined;

  if (name !== undefined) {
    data.name = name;
  }

  if (normalizedEmail !== undefined) {
    data.email = normalizedEmail;
  }

  if (normalizedRole) {
    data.role = normalizedRole;
  }

  if (isSupabaseAuthEnabled()) {
    if (existingUser.supabaseAuthUserId) {
      try {
        await updateSupabaseAuthUser(existingUser.supabaseAuthUserId, {
          email: normalizedEmail,
          password,
          name,
          role: normalizedRole ?? undefined,
        });
      } catch (error) {
        if (handleSupabaseAuthRuntimeError(res, error)) {
          return;
        }

        throw error;
      }
    } else if (email !== undefined || password !== undefined) {
      res.status(409).json({
        message: 'This user is not linked to Supabase Auth and cannot update email or password yet',
      });
      return;
    }

    if (password !== undefined) {
      data.passwordHash = { set: null };
    }
  } else if (password !== undefined) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });

    res.locals.auditMetadata = {
      previousRole: existingUserRole,
      managedUserRole: updatedUser.role,
      privilegedTarget: ['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'SUPERVISOR', 'DISPATCHER'].includes(
        updatedUser.role,
      ),
      roleChanged: normalizedRole !== null && normalizedRole !== existingUserRole,
      emailChanged: normalizedEmail !== undefined && normalizedEmail !== existingUser.email,
      passwordChanged: password !== undefined,
      selfUpdate: isSelfUpdate,
    };

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

  const existingUser = await prisma.user.findFirst({
    where: withActiveRecords({ id }) as any,
    select: userSyncSelect,
  });
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

  await revokeAllUserSessions(id);

  res.locals.auditMetadata = {
    previousRole: existingUserRole,
    managedUserRole: existingUserRole,
    privilegedTarget: ['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'SUPERVISOR', 'DISPATCHER'].includes(
      existingUserRole,
    ),
    archiveModeDelete: isArchiveEnabled(),
  };

  if (isArchiveEnabled()) {
    await prisma.user.update({ where: { id }, data: { archivedAt: new Date() } });
  } else {
    if (isSupabaseAuthEnabled() && existingUser.supabaseAuthUserId) {
      try {
        await deleteSupabaseAuthUser(existingUser.supabaseAuthUserId);
      } catch (error) {
        if (handleSupabaseAuthRuntimeError(res, error)) {
          return;
        }

        throw error;
      }
    }

    await prisma.user.delete({ where: { id } });
  }

  res.status(204).send();
}

export async function restoreUser(req: Request, res: Response): Promise<void> {
  const authUser = getAuthUser(req);
  const id = getUserId(req, res);
  if (id === null) return;

  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  if (!isArchiveEnabled()) {
    res.status(409).json({ message: 'Archive mode is disabled; restore is unavailable' });
    return;
  }

  const user = await prisma.user.findFirst({
    where: withArchivedRecords({ id }) as any,
    select: userSelect,
  });
  if (!user) {
    res.status(404).json({ message: 'Archived user not found' });
    return;
  }

  const existingUserRole = getStoredUserRole(user.role);
  if (!existingUserRole) {
    res.status(500).json({ message: 'Invalid stored user role' });
    return;
  }

  if (!canManageRole(authUser.role, existingUserRole)) {
    res.status(403).json({
      message: 'Forbidden: you are not allowed to restore that user role',
    });
    return;
  }

  const restoredUser = await prisma.user.update({
    where: { id },
    data: { archivedAt: null },
    select: userSelect,
  });

  res.locals.auditMetadata = {
    previousRole: existingUserRole,
    managedUserRole: existingUserRole,
    privilegedTarget: ['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'SUPERVISOR', 'DISPATCHER'].includes(
      existingUserRole,
    ),
    restoredFromArchive: true,
  };

  res.json(restoredUser);
}
