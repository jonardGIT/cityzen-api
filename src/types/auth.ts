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

type AdminManageableRole = Exclude<UserRole, 'SYSTEM_ADMIN' | 'AUDITOR'>;

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
    permissions: [
      'citizen:link:self',
      'incident:create:self',
      'incident:read:self',
      'incident:update:self',
      'media:upload:self',
    ],
    scope: 'own',
  },
  RESPONDER: {
    label: 'Responder',
    permissions: [
      'incident:read:assigned',
      'incident:update:assigned',
      'assignment:read:own',
      'comment:create:team',
    ],
    scope: 'team',
  },
  DISPATCHER: {
    label: 'Dispatcher',
    permissions: [
      'incident:read:department',
      'incident:assign:department',
      'incident:update:priority:department',
      'assignment:create:department',
      'assignment:update:department',
    ],
    scope: 'department',
  },
  SUPERVISOR: {
    label: 'Supervisor',
    permissions: [
      'incident:read:region',
      'incident:reassign:region',
      'incident:close:region',
      'assignment:override:region',
      'report:generate:region',
    ],
    scope: 'region',
  },
  DEPARTMENT_MANAGER: {
    label: 'Department Manager',
    permissions: [
      'user:create:department',
      'user:read:department',
      'user:update:department',
      'user:reset_password:department',
      'reference:manage:department',
      'incident:read:department',
    ],
    scope: 'department',
  },
  SYSTEM_ADMIN: {
    label: 'System Admin',
    permissions: [
      'user:manage:global',
      'role:manage:global',
      'settings:manage:global',
      'incident:delete:global',
      'audit:read:global',
      'audit:export:global',
    ],
    scope: 'global',
  },
  AUDITOR: {
    label: 'Auditor',
    permissions: [
      'incident:read:global',
      'audit:read:global',
      'audit:export:global',
      'user:read:redacted',
    ],
    scope: 'global',
  },
};

export const ADMIN_MANAGEMENT_LEVELS: Partial<Record<UserRole, number>> = {
  SYSTEM_ADMIN: 3,
  DEPARTMENT_MANAGER: 2,
};

export const USER_ADMIN_ROLES: UserRole[] = ['SYSTEM_ADMIN', 'DEPARTMENT_MANAGER'];
export const ADMIN_ROLES: UserRole[] = USER_ADMIN_ROLES;

export const DISPATCH_OVERSIGHT_ROLES: UserRole[] = [
  'SYSTEM_ADMIN',
  'DEPARTMENT_MANAGER',
  'SUPERVISOR',
  'DISPATCHER',
];
export const DISPATCH_ROLES: UserRole[] = DISPATCH_OVERSIGHT_ROLES;

export const ASSIGNMENT_MANAGEMENT_ROLES: UserRole[] = DISPATCH_OVERSIGHT_ROLES;

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

export const AUDIT_READ_ROLES: UserRole[] = ['SYSTEM_ADMIN', 'AUDITOR'];

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

export function canManageRole(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === 'SYSTEM_ADMIN') {
    return targetRole !== 'SYSTEM_ADMIN' && targetRole !== 'AUDITOR';
  }

  if (actorRole === 'DEPARTMENT_MANAGER') {
    const manageableRoles: AdminManageableRole[] = [
      'SUPERVISOR',
      'DISPATCHER',
      'RESPONDER',
      'CITIZEN_REPORTER',
    ];
    return manageableRoles.includes(targetRole as AdminManageableRole);
  }

  return false;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
