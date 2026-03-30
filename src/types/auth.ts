export const USER_ROLES = [
  'SYSTEM_ADMIN',
  'DEPARTMENT_MANAGER',
  'SUPERVISOR',
  'DISPATCHER',
  'RESPONDER',
  'CITIZEN_REPORTER',
  'AUDITOR',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type AccessScope = 'own' | 'team' | 'department' | 'region' | 'global';

export interface RoleProfile {
  label: string;
  permissions: string[];
  scope: AccessScope;
}

const ROLE_ALIASES: Record<string, UserRole> = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  'SYSTEM ADMIN': 'SYSTEM_ADMIN',
  SUPER_ADMIN: 'SYSTEM_ADMIN',
  DEPARTMENT_MANAGER: 'DEPARTMENT_MANAGER',
  'DEPARTMENT MANAGER': 'DEPARTMENT_MANAGER',
  ADMIN: 'DEPARTMENT_MANAGER',
  SUPERVISOR: 'SUPERVISOR',
  DISPATCHER: 'DISPATCHER',
  RESPONDER: 'RESPONDER',
  CITIZEN_REPORTER: 'CITIZEN_REPORTER',
  'CITIZEN REPORTER': 'CITIZEN_REPORTER',
  VIEWER: 'CITIZEN_REPORTER',
  AUDITOR: 'AUDITOR',
};

export const ROLE_PROFILES: Record<UserRole, RoleProfile> = {
  CITIZEN_REPORTER: {
    label: 'Citizen Reporter',
    permissions: ['incident:create', 'incident:read', 'incident:update:own', 'media:upload'],
    scope: 'own',
  },
  RESPONDER: {
    label: 'Responder',
    permissions: ['incident:read', 'incident:update:assigned', 'comment:create'],
    scope: 'team',
  },
  DISPATCHER: {
    label: 'Dispatcher',
    permissions: ['incident:read', 'incident:assign', 'incident:update:priority'],
    scope: 'department',
  },
  SUPERVISOR: {
    label: 'Supervisor',
    permissions: ['incident:read', 'incident:reassign', 'incident:close', 'report:generate'],
    scope: 'region',
  },
  DEPARTMENT_MANAGER: {
    label: 'Department Manager',
    permissions: [
      'user:create',
      'user:read',
      'user:update',
      'user:reset_password',
      'incident:read',
      'incident:assign',
    ],
    scope: 'department',
  },
  SYSTEM_ADMIN: {
    label: 'System Admin',
    permissions: ['user:manage', 'role:manage', 'settings:manage', 'incident:delete'],
    scope: 'global',
  },
  AUDITOR: {
    label: 'Auditor',
    permissions: ['incident:read', 'audit:export'],
    scope: 'global',
  },
};

export const ROLE_LEVELS: Record<UserRole, number> = {
  SYSTEM_ADMIN: 7,
  DEPARTMENT_MANAGER: 6,
  SUPERVISOR: 5,
  DISPATCHER: 4,
  RESPONDER: 3,
  AUDITOR: 2,
  CITIZEN_REPORTER: 1,
};

export const ADMIN_ROLES: UserRole[] = ['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'];
export const DISPATCH_ROLES: UserRole[] = [
  'SYSTEM_ADMIN',
  'DEPARTMENT_MANAGER',
  'SUPERVISOR',
  'DISPATCHER',
];
export const INCIDENT_WRITE_ROLES: UserRole[] = [
  'SYSTEM_ADMIN',
  'DEPARTMENT_MANAGER',
  'SUPERVISOR',
  'DISPATCHER',
  'RESPONDER',
];
export const MFA_REQUIRED_ROLES: UserRole[] = [
  'SYSTEM_ADMIN',
  'DEPARTMENT_MANAGER',
  'SUPERVISOR',
  'DISPATCHER',
];

export function normalizeUserRoleInput(value: string | null | undefined): UserRole | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return ROLE_ALIASES[normalized] ?? null;
}

export function isUserRole(value: string): value is UserRole {
  return normalizeUserRoleInput(value) !== null;
}

export function hasHigherAccessLevel(actorRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_LEVELS[actorRole] > ROLE_LEVELS[targetRole];
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
