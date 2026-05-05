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
import { ROLE_PROFILES, USER_ROLES, canManageRole, normalizeUserRoleInput } from '../types/auth.js';
import { resolveJurisdictionScope } from '../middleware/jurisdiction.js';
import { buildPaginatedResponse, getListQuery, getPaginationQuery } from '../utils/request.js';
import { usersListQueryConfig } from '../utils/listQueryConfig.js';
import {
  isArchiveEnabled,
  withActiveRecords,
  withArchivedRecords,
  withArchiveScope,
} from '../utils/archive.js';
import {
  buildCanonicalNameCreateData,
  buildCanonicalNameUpdateData,
  formatCanonicalDisplayName,
  hasAnyCanonicalNameField,
} from '../utils/nameFields.js';

const userSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  firstName: true,
  middleName: true,
  lastName: true,
  suffix: true,
  email: true,
  role: true,
  jurisdictionType: true,
  jurisdictionId: true,
} as const;

const userSyncSelect = {
  ...userSelect,
  supabaseAuthUserId: true,
} as const;

const UNPAGINATED_USERS_LIMIT = 5000;

// Accept any Postgres UUID-shaped value, including seeded fixtures that do not
// encode an RFC version nibble.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function getUserId(req: Request, res?: Response): string | null {
  const id = req.params.id;
  if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
    if (res) {
      res.status(400).json({ message: 'Invalid id parameter (must be a valid UUID)' });
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

type ManagedJurisdictionAssignment = {
  jurisdictionType: string | null;
  jurisdictionId: string | null;
};

const JURISDICTION_REQUIRED_SCOPES = new Set(['region', 'province', 'city']);

const JURISDICTION_TYPE_ALIASES: Record<string, 'region' | 'province' | 'city' | 'barangay'> = {
  region: 'region',
  province: 'province',
  city: 'city',
  barangay: 'barangay',
};

const PRIVILEGED_AUDIT_TARGET_ROLES = [
  'NATIONAL_ADMIN',
  'REGIONAL_DIRECTOR',
  'PROVINCIAL_ADMIN',
  'CITY_ADMIN',
  'DISPATCHER',
  'AUDITOR',
] as const;

function isPrivilegedAuditTargetRole(role: string): boolean {
  return PRIVILEGED_AUDIT_TARGET_ROLES.includes(
    role as (typeof PRIVILEGED_AUDIT_TARGET_ROLES)[number],
  );
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function normalizeJurisdictionTypeInput(
  value: string | null | undefined,
): 'region' | 'province' | 'city' | 'barangay' | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, '_');
  return JURISDICTION_TYPE_ALIASES[normalized] ?? null;
}

function roleRequiresJurisdictionBinding(role: string | null | undefined): boolean {
  const normalizedRole = normalizeUserRoleInput(role);
  if (!normalizedRole) {
    return false;
  }

  return JURISDICTION_REQUIRED_SCOPES.has(ROLE_PROFILES[normalizedRole].scope);
}

function hasJurisdictionBinding(
  jurisdictionType: string | null | undefined,
  jurisdictionId: string | null | undefined,
): boolean {
  return normalizeJurisdictionTypeInput(jurisdictionType) !== null && Boolean(jurisdictionId);
}

async function getStoredUserJurisdiction(userId: string): Promise<ManagedJurisdictionAssignment> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { jurisdictionType: true, jurisdictionId: true },
  });

  return {
    jurisdictionType: user?.jurisdictionType ?? null,
    jurisdictionId: user?.jurisdictionId ?? null,
  };
}

async function jurisdictionExists(type: string, id: string): Promise<boolean> {
  if (type === 'region') {
    return Boolean(
      await prisma.region.findFirst({ where: withActiveRecords({ id }), select: { id: true } }),
    );
  }

  if (type === 'province') {
    return Boolean(
      await prisma.province.findFirst({ where: withActiveRecords({ id }), select: { id: true } }),
    );
  }

  if (type === 'city') {
    return Boolean(
      await prisma.cityMunicipality.findFirst({
        where: withActiveRecords({ id, type: 'CITY' }),
        select: { id: true },
      }),
    );
  }

  if (type === 'barangay') {
    return Boolean(
      await prisma.barangay.findFirst({ where: withActiveRecords({ id }), select: { id: true } }),
    );
  }

  return false;
}

function isJurisdictionWithinScope(
  scope: Awaited<ReturnType<typeof resolveJurisdictionScope>>,
  type: string,
  id: string,
): boolean {
  if (scope.type === 'national') {
    return true;
  }

  if (type === 'region') {
    return scope.regionIds?.includes(id) ?? false;
  }

  if (type === 'province') {
    return scope.provinceIds?.includes(id) ?? false;
  }

  if (type === 'city') {
    return scope.cityMunicipalityIds?.includes(id) ?? false;
  }

  if (type === 'barangay') {
    return scope.barangayIds?.includes(id) ?? false;
  }

  return false;
}

type UserReadAccessScope =
  | { type: 'national' }
  | {
      type: 'scoped';
      manageableRoles: string[];
      jurisdictionScope: Awaited<ReturnType<typeof resolveJurisdictionScope>>;
    };

async function getUserReadAccessScope(authUser: { id: string; role: string }, res: Response) {
  if (authUser.role === 'NATIONAL_ADMIN') {
    return { type: 'national' } satisfies UserReadAccessScope;
  }

  const actorJurisdiction = await getStoredUserJurisdiction(authUser.id);
  if (!actorJurisdiction.jurisdictionType || !actorJurisdiction.jurisdictionId) {
    res.status(403).json({
      message: 'Forbidden: admin account is missing a valid jurisdiction binding',
    });
    return null;
  }

  return {
    type: 'scoped',
    manageableRoles: USER_ROLES.filter((role) => canManageRole(authUser.role as any, role)),
    jurisdictionScope: await resolveJurisdictionScope(
      actorJurisdiction.jurisdictionType,
      actorJurisdiction.jurisdictionId,
    ),
  } satisfies UserReadAccessScope;
}

function buildScopedUserJurisdictionFilters(
  scope: Awaited<ReturnType<typeof resolveJurisdictionScope>>,
): Prisma.UserWhereInput[] {
  const filters: Prisma.UserWhereInput[] = [];

  if (scope.regionIds?.length) {
    filters.push({ jurisdictionType: 'region', jurisdictionId: { in: scope.regionIds } });
  }

  if (scope.provinceIds?.length) {
    filters.push({ jurisdictionType: 'province', jurisdictionId: { in: scope.provinceIds } });
  }

  if (scope.cityMunicipalityIds?.length) {
    filters.push({ jurisdictionType: 'city', jurisdictionId: { in: scope.cityMunicipalityIds } });
  }

  if (scope.barangayIds?.length) {
    filters.push({ jurisdictionType: 'barangay', jurisdictionId: { in: scope.barangayIds } });
  }

  return filters;
}

function buildUserReadWhere(
  authUser: { id: string; role: string },
  scope: UserReadAccessScope,
  baseWhere: Prisma.UserWhereInput,
): Prisma.UserWhereInput {
  if (scope.type === 'national') {
    return baseWhere;
  }

  const jurisdictionFilters = buildScopedUserJurisdictionFilters(scope.jurisdictionScope);

  return {
    AND: [
      baseWhere,
      {
        OR: [
          { id: authUser.id },
          {
            role: { in: scope.manageableRoles },
            OR: jurisdictionFilters,
          },
        ],
      },
    ],
  };
}

function canReadUserRecord(
  authUser: { id: string; role: string },
  candidate: {
    id: string;
    role: string;
    jurisdictionType: string | null;
    jurisdictionId: string | null;
  },
  scope: UserReadAccessScope,
): boolean {
  if (scope.type === 'national') {
    return true;
  }

  if (candidate.id === authUser.id) {
    return true;
  }

  const normalizedRole = getStoredUserRole(candidate.role);
  if (!normalizedRole || !canManageRole(authUser.role as any, normalizedRole)) {
    return false;
  }

  const normalizedType = normalizeJurisdictionTypeInput(candidate.jurisdictionType);
  if (!normalizedType || !candidate.jurisdictionId) {
    return false;
  }

  // For PROVINCIAL_ADMIN, enforce that they can only read users in cities within their province
  if (authUser.role === 'PROVINCIAL_ADMIN' && normalizedType === 'city') {
    const provinceCities = scope.jurisdictionScope.cityMunicipalityIds || [];
    if (!provinceCities.includes(candidate.jurisdictionId)) {
      return false;
    }
  }

  return isJurisdictionWithinScope(
    scope.jurisdictionScope,
    normalizedType,
    candidate.jurisdictionId,
  );
}

async function resolveManagedJurisdictionAssignment(input: {
  actorId: string;
  actorRole: string;
  jurisdictionType?: string;
  jurisdictionId?: string;
  mode: 'create' | 'update';
  res: Response;
}): Promise<ManagedJurisdictionAssignment | undefined> {
  const typeProvided = input.jurisdictionType !== undefined;
  const idProvided = input.jurisdictionId !== undefined;

  if (!typeProvided && !idProvided) {
    if (input.mode === 'create' && input.actorRole === 'CITY_ADMIN') {
      const actorJurisdiction = await getStoredUserJurisdiction(input.actorId);
      if (actorJurisdiction.jurisdictionType !== 'city' || !actorJurisdiction.jurisdictionId) {
        input.res.status(403).json({
          message:
            'Forbidden: city or municipal admin account is missing a valid city jurisdiction',
        });
        return undefined;
      }

      return actorJurisdiction;
    }

    return input.mode === 'update' ? undefined : { jurisdictionType: null, jurisdictionId: null };
  }

  if (!typeProvided || !idProvided) {
    input.res.status(422).json({
      message: 'jurisdictionType and jurisdictionId must be provided together',
    });
    return undefined;
  }

  if (typeof input.jurisdictionType !== 'string' || typeof input.jurisdictionId !== 'string') {
    input.res.status(422).json({
      message: 'jurisdictionType must be a string and jurisdictionId must be a UUID string',
    });
    return undefined;
  }

  const normalizedType = normalizeJurisdictionTypeInput(input.jurisdictionType);
  if (!normalizedType) {
    input.res.status(422).json({
      message: 'jurisdictionType must be one of region, province, city, or barangay',
    });
    return undefined;
  }

  const jurisdictionId = input.jurisdictionId.trim();
  if (!UUID_REGEX.test(jurisdictionId)) {
    input.res.status(422).json({
      message: 'jurisdictionId must be a valid UUID',
    });
    return undefined;
  }

  if (!(await jurisdictionExists(normalizedType, jurisdictionId))) {
    input.res.status(422).json({
      message: `jurisdictionId must reference an active ${normalizedType}`,
    });
    return undefined;
  }

  const actorJurisdiction = await getStoredUserJurisdiction(input.actorId);

  if (input.actorRole === 'CITY_ADMIN') {
    if (
      actorJurisdiction.jurisdictionType !== 'city' ||
      actorJurisdiction.jurisdictionId !== jurisdictionId ||
      normalizedType !== 'city'
    ) {
      input.res.status(403).json({
        message: 'Forbidden: city admins can only manage users inside their own city',
      });
      return undefined;
    }

    return {
      jurisdictionType: 'city',
      jurisdictionId,
    };
  }

  if (input.actorRole !== 'NATIONAL_ADMIN') {
    const scope = await resolveJurisdictionScope(
      actorJurisdiction.jurisdictionType,
      actorJurisdiction.jurisdictionId,
    );

    if (!isJurisdictionWithinScope(scope, normalizedType, jurisdictionId)) {
      input.res.status(403).json({
        message: 'Forbidden: you are not allowed to assign users outside your jurisdiction scope',
      });
      return undefined;
    }
  }

  return {
    jurisdictionType: normalizedType,
    jurisdictionId,
  };
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
  const canUpdateUser = [
    'user:update:city',
    'user:manage:province',
    'user:manage:region',
    'user:manage:global',
  ].some((permission) => profile.permissions.includes(permission));

  const canDeleteUser = profile.permissions.includes('user:manage:global');

  res.json({
    role: authUser.role,
    label: profile.label,
    permissions: profile.permissions,
    scope: profile.scope,
    canUpdateUser,
    canDeleteUser,
  });
}

// Returns all users from the database.
export async function getUsers(req: Request, res: Response): Promise<void> {
  const authUser = getAuthUser(req);
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const pagination = getPaginationQuery(req, {
    unpaginatedTake: UNPAGINATED_USERS_LIMIT,
  });
  const listQuery = getListQuery(req, res, usersListQueryConfig);
  if (!listQuery) {
    return;
  }

  const readScope = await getUserReadAccessScope(authUser, res);
  if (!readScope) {
    return;
  }

  const scopedWhere = buildUserReadWhere(
    authUser,
    readScope,
    (listQuery.where ?? {}) as Prisma.UserWhereInput,
  );

  if (pagination.enabled) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: userSelect,
        where: withArchiveScope(scopedWhere, listQuery.archiveScope),
        orderBy: listQuery.orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.user.count({
        where: withArchiveScope(scopedWhere, listQuery.archiveScope),
      }),
    ]);
    res.json(buildPaginatedResponse(users, total, pagination));
    return;
  }

  const users = await prisma.user.findMany({
    select: userSelect,
    where: withArchiveScope(scopedWhere, listQuery.archiveScope),
    orderBy: listQuery.orderBy,
    take: pagination.unpaginatedTake ?? undefined,
  });
  res.json(users);
}

// Returns a single user by UUID. Responds 404 if not found.
export async function getUserById(req: Request, res: Response): Promise<void> {
  const authUser = getAuthUser(req);
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const id = getUserId(req, res);
  if (id === null) return;
  const readScope = await getUserReadAccessScope(authUser, res);
  if (!readScope) {
    return;
  }
  const user = await prisma.user.findFirst({
    where: withActiveRecords({ id }),
    select: userSelect,
  });
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  if (!canReadUserRecord(authUser, user, readScope)) {
    res.status(403).json({ message: 'Forbidden: you are not allowed to view that user' });
    return;
  }

  res.json(user);
}

// Creates a new user account. Requires name, email, and password.
export async function createUser(req: Request, res: Response): Promise<void> {
  const authUser = getAuthUser(req);
  const { email, password, role, jurisdictionType, jurisdictionId } = req.body as {
    email?: string;
    password?: string;
    role?: string;
    jurisdictionType?: string;
    jurisdictionId?: string;
  };
  const nameData = buildCanonicalNameCreateData(req.body as Record<string, unknown>);
  const displayName = nameData ? formatCanonicalDisplayName(nameData) : null;

  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  if (!nameData || !displayName || !email || !password) {
    res.status(422).json({ message: 'firstName, lastName, email, and password are required' });
    return;
  }

  const canonicalNameData = nameData;
  const canonicalDisplayName = displayName;

  const normalizedEmail = normalizeEmail(email);

  const normalizedRole = normalizeRole(role ?? 'CITIZEN_REPORTER');
  if (!normalizedRole) {
    res.status(422).json({
      message:
        'role must be one of NATIONAL_ADMIN, REGIONAL_DIRECTOR, PROVINCIAL_ADMIN, CITY_ADMIN, CITY_CONTENT_EDITOR, DISPATCHER, RESPONDER, CITIZEN_REPORTER, AUDITOR',
    });
    return;
  }

  if (!canManageRole(authUser.role, normalizedRole)) {
    res.status(403).json({
      message: 'Forbidden: you are not allowed to create a user with that role',
    });
    return;
  }

  const managedJurisdiction = await resolveManagedJurisdictionAssignment({
    actorId: authUser.id,
    actorRole: authUser.role,
    jurisdictionType,
    jurisdictionId,
    mode: 'create',
    res,
  });
  if (res.headersSent) {
    return;
  }

  if (
    roleRequiresJurisdictionBinding(normalizedRole) &&
    !hasJurisdictionBinding(
      managedJurisdiction?.jurisdictionType ?? null,
      managedJurisdiction?.jurisdictionId ?? null,
    )
  ) {
    res.status(422).json({
      message:
        'jurisdictionType and jurisdictionId are required for region-, province-, and city-scoped roles',
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
        displayName: canonicalDisplayName,
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
      name: canonicalDisplayName,
      firstName: canonicalNameData.firstName,
      middleName: canonicalNameData.middleName,
      lastName: canonicalNameData.lastName,
      suffix: canonicalNameData.suffix,
      email: normalizedEmail,
      role: normalizedRole,
      jurisdictionType: managedJurisdiction?.jurisdictionType ?? null,
      jurisdictionId: managedJurisdiction?.jurisdictionId ?? null,
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
      privilegedTarget: isPrivilegedAuditTargetRole(normalizedRole),
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
  const { email, password, role, jurisdictionType, jurisdictionId } = req.body as {
    email?: string;
    password?: string;
    role?: string;
    jurisdictionType?: string;
    jurisdictionId?: string;
  };
  const body = req.body as Record<string, unknown>;
  const nameData = buildCanonicalNameUpdateData(body);
  const hasNameFields = hasAnyCanonicalNameField(body);

  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const existingUser = await prisma.user.findFirst({
    where: withActiveRecords({ id }),
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
        'role must be one of NATIONAL_ADMIN, REGIONAL_DIRECTOR, PROVINCIAL_ADMIN, CITY_ADMIN, CITY_CONTENT_EDITOR, DISPATCHER, RESPONDER, CITIZEN_REPORTER, AUDITOR',
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

  const managedJurisdiction = await resolveManagedJurisdictionAssignment({
    actorId: authUser.id,
    actorRole: authUser.role,
    jurisdictionType,
    jurisdictionId,
    mode: 'update',
    res,
  });
  if (res.headersSent) {
    return;
  }

  const targetRole = normalizedRole ?? existingUserRole;
  const effectiveJurisdictionType = managedJurisdiction
    ? managedJurisdiction.jurisdictionType
    : existingUser.jurisdictionType;
  const effectiveJurisdictionId = managedJurisdiction
    ? managedJurisdiction.jurisdictionId
    : existingUser.jurisdictionId;

  if (
    roleRequiresJurisdictionBinding(targetRole) &&
    (normalizedRole !== null || jurisdictionType !== undefined || jurisdictionId !== undefined) &&
    !hasJurisdictionBinding(effectiveJurisdictionType, effectiveJurisdictionId)
  ) {
    res.status(422).json({
      message:
        'jurisdictionType and jurisdictionId are required for region-, province-, and city-scoped roles',
    });
    return;
  }

  const data: Prisma.UserUpdateInput = {};
  const normalizedEmail = email !== undefined ? normalizeEmail(email) : undefined;

  if (hasNameFields) {
    const nextNameState = {
      firstName: nameData.firstName ?? existingUser.firstName ?? undefined,
      middleName: nameData.middleName ?? existingUser.middleName,
      lastName: nameData.lastName ?? existingUser.lastName ?? undefined,
      suffix: nameData.suffix ?? existingUser.suffix,
    };
    const displayName = formatCanonicalDisplayName(nextNameState);

    if (!displayName) {
      res.status(422).json({ message: 'firstName and lastName are required for canonical name updates' });
      return;
    }

    data.name = displayName;
    if (Object.prototype.hasOwnProperty.call(nameData, 'firstName')) {
      data.firstName = nameData.firstName;
    }
    if (Object.prototype.hasOwnProperty.call(nameData, 'middleName')) {
      data.middleName = nameData.middleName;
    }
    if (Object.prototype.hasOwnProperty.call(nameData, 'lastName')) {
      data.lastName = nameData.lastName;
    }
    if (Object.prototype.hasOwnProperty.call(nameData, 'suffix')) {
      data.suffix = nameData.suffix;
    }
  }

  if (normalizedEmail !== undefined) {
    data.email = normalizedEmail;
  }

  if (normalizedRole) {
    data.role = normalizedRole;
  }

  if (managedJurisdiction) {
    data.jurisdictionType = managedJurisdiction.jurisdictionType;
    data.jurisdictionId = managedJurisdiction.jurisdictionId;
  }

  if (isSupabaseAuthEnabled()) {
    if (existingUser.supabaseAuthUserId) {
      try {
        await updateSupabaseAuthUser(existingUser.supabaseAuthUserId, {
          email: normalizedEmail,
          password,
          displayName: hasNameFields ? (data.name as string) : undefined,
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
      privilegedTarget: isPrivilegedAuditTargetRole(updatedUser.role),
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
    where: withActiveRecords({ id }),
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

  const readScope = await getUserReadAccessScope(authUser, res);
  if (!readScope) {
    return;
  }

  if (!canReadUserRecord(authUser, existingUser, readScope)) {
    res.status(403).json({ message: 'Forbidden: you are not allowed to delete that user' });
    return;
  }

  await revokeAllUserSessions(id);

  res.locals.auditMetadata = {
    previousRole: existingUserRole,
    managedUserRole: existingUserRole,
    privilegedTarget: isPrivilegedAuditTargetRole(existingUserRole),
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
    where: withArchivedRecords({ id }),
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

  const readScope = await getUserReadAccessScope(authUser, res);
  if (!readScope) {
    return;
  }

  if (!canReadUserRecord(authUser, user, readScope)) {
    res.status(403).json({ message: 'Forbidden: you are not allowed to restore that user' });
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
    privilegedTarget: isPrivilegedAuditTargetRole(existingUserRole),
    restoredFromArchive: true,
  };

  res.json(restoredUser);
}
