// ─── 9-Role Philippine LGU Hierarchy ───────────────────────────────────────────
// NATIONAL_ADMIN > REGIONAL_DIRECTOR > PROVINCIAL_ADMIN > CITY_ADMIN
//   └── DISPATCHER (city scope)
//   └── RESPONDER (assigned scope)
// CITIZEN_REPORTER (own scope)
// AUDITOR (global read-only, lateral)

export const USER_ROLES = [
  'NATIONAL_ADMIN',
  'REGIONAL_DIRECTOR',
  'PROVINCIAL_ADMIN',
  'CITY_ADMIN',
  'CITY_CONTENT_EDITOR',
  'DISPATCHER',
  'RESPONDER',
  'CITIZEN_REPORTER',
  'AUDITOR',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type AccessScope =
  | 'own'
  | 'assigned'
  | 'city'
  | 'province'
  | 'region'
  | 'national'
  | 'global';

export interface RoleProfile {
  label: string;
  permissions: string[];
  scope: AccessScope;
}

const ROLE_ALIASES: Record<string, UserRole> = {
  // New names
  NATIONAL_ADMIN: 'NATIONAL_ADMIN',
  'NATIONAL ADMIN': 'NATIONAL_ADMIN',
  REGIONAL_DIRECTOR: 'REGIONAL_DIRECTOR',
  'REGIONAL DIRECTOR': 'REGIONAL_DIRECTOR',
  PROVINCIAL_ADMIN: 'PROVINCIAL_ADMIN',
  'PROVINCIAL ADMIN': 'PROVINCIAL_ADMIN',
  CITY_ADMIN: 'CITY_ADMIN',
  'CITY ADMIN': 'CITY_ADMIN',
  CITY_CONTENT_EDITOR: 'CITY_CONTENT_EDITOR',
  'CITY CONTENT EDITOR': 'CITY_CONTENT_EDITOR',
  DISPATCHER: 'DISPATCHER',
  RESPONDER: 'RESPONDER',
  CITIZEN_REPORTER: 'CITIZEN_REPORTER',
  'CITIZEN REPORTER': 'CITIZEN_REPORTER',
  AUDITOR: 'AUDITOR',
  // Backward compatibility aliases
  SYSTEM_ADMIN: 'NATIONAL_ADMIN',
  'SYSTEM ADMIN': 'NATIONAL_ADMIN',
  SUPER_ADMIN: 'NATIONAL_ADMIN',
  DEPARTMENT_MANAGER: 'CITY_ADMIN',
  'DEPARTMENT MANAGER': 'CITY_ADMIN',
  ADMIN: 'CITY_ADMIN',
  SUPERVISOR: 'PROVINCIAL_ADMIN',
  VIEWER: 'CITIZEN_REPORTER',
};

export const ROLE_PROFILES: Record<UserRole, RoleProfile> = {
  NATIONAL_ADMIN: {
    label: 'National Admin',
    permissions: [
      'user:manage:global',
      'role:manage:global',
      'settings:manage:global',
      'incident:manage:global',
      'incident:assign:global',
      'assignment:create:global',
      'assignment:update:global',
      'audit:read:global',
      'audit:export:global',
      'geo:manage:global',
      'escalation:manage:global',
      'mobile_content:create:global',
      'mobile_content:read:global',
      'mobile_content:update:global',
      'mobile_content:publish:global',
      'mobile_content:archive:global',
    ],
    scope: 'national',
  },
  REGIONAL_DIRECTOR: {
    label: 'Regional Director',
    permissions: [
      'user:manage:region',
      'geo:manage:region',
      'incident:read:region',
      'incident:assign:region',
      'incident:reassign:region',
      'incident:close:region',
      'assignment:create:region',
      'assignment:update:region',
      'agency:manage:region',
      'report:generate:region',
      'escalation:manage:region',
      'mobile_content:create:region',
      'mobile_content:read:region',
      'mobile_content:update:region',
      'mobile_content:publish:region',
      'mobile_content:archive:region',
    ],
    scope: 'region',
  },
  PROVINCIAL_ADMIN: {
    label: 'Provincial Admin',
    permissions: [
      'user:manage:province',
      'geo:manage:province',
      'incident:read:province',
      'incident:assign:province',
      'incident:escalate:province',
      'assignment:create:province',
      'assignment:update:province',
      'agency:manage:province',
      'report:generate:province',
      'escalation:create:province',
      'mobile_content:create:province',
      'mobile_content:read:province',
      'mobile_content:update:province',
      'mobile_content:publish:province',
      'mobile_content:archive:province',
    ],
    scope: 'province',
  },
  CITY_ADMIN: {
    label: 'City/Municipal Admin',
    permissions: [
      'user:create:city',
      'user:read:city',
      'user:update:city',
      'user:reset_password:city',
      'geo:manage:city',
      'reference:manage:city',
      'incident:read:city',
      'incident:assign:city',
      'assignment:create:city',
      'assignment:update:city',
      'agency:manage:city',
      'escalation:create:city',
      'mobile_content:create:city',
      'mobile_content:read:city',
      'mobile_content:update:city',
      'mobile_content:publish:city',
      'mobile_content:archive:city',
    ],
    scope: 'city',
  },
  CITY_CONTENT_EDITOR: {
    label: 'City Content Editor',
    permissions: [
      'mobile_content:create:city',
      'mobile_content:read:city',
      'mobile_content:update:city',
      'mobile_content:publish:city',
      'mobile_content:archive:city',
    ],
    scope: 'city',
  },
  DISPATCHER: {
    label: 'Dispatcher',
    permissions: [
      'incident:read:city',
      'incident:assign:city',
      'incident:update:priority:city',
      'assignment:create:city',
      'assignment:update:city',
    ],
    scope: 'city',
  },
  RESPONDER: {
    label: 'Responder',
    permissions: [
      'incident:read:assigned',
      'incident:update:assigned',
      'assignment:read:own',
      'media:upload:assigned',
    ],
    scope: 'assigned',
  },
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
  NATIONAL_ADMIN: 5,
  REGIONAL_DIRECTOR: 4,
  PROVINCIAL_ADMIN: 3,
  CITY_ADMIN: 2,
  CITY_CONTENT_EDITOR: 1,
};

// ─── Role Group Constants ──────────────────────────────────────────────────────

export const NATIONAL_ROLES: UserRole[] = ['NATIONAL_ADMIN'];
export const REGIONAL_ROLES: UserRole[] = ['NATIONAL_ADMIN', 'REGIONAL_DIRECTOR'];
export const PROVINCIAL_ROLES: UserRole[] = [
  'NATIONAL_ADMIN',
  'REGIONAL_DIRECTOR',
  'PROVINCIAL_ADMIN',
];
export const CITY_ROLES: UserRole[] = [
  'NATIONAL_ADMIN',
  'REGIONAL_DIRECTOR',
  'PROVINCIAL_ADMIN',
  'CITY_ADMIN',
];

// Backward-compatible aliases
export const USER_ADMIN_ROLES: UserRole[] = CITY_ROLES;
export const ADMIN_ROLES: UserRole[] = CITY_ROLES;
export const MOBILE_CONTENT_ROLES: UserRole[] = [...CITY_ROLES, 'CITY_CONTENT_EDITOR'];

export const DISPATCH_OVERSIGHT_ROLES: UserRole[] = [...CITY_ROLES, 'DISPATCHER'];
export const DISPATCH_ROLES: UserRole[] = DISPATCH_OVERSIGHT_ROLES;
export const ASSIGNMENT_MANAGEMENT_ROLES: UserRole[] = DISPATCH_OVERSIGHT_ROLES;

export const INCIDENT_CREATE_ROLES: UserRole[] = DISPATCH_ROLES;
export const INCIDENT_UPDATE_ROLES: UserRole[] = [...DISPATCH_ROLES, 'RESPONDER'];
export const INCIDENT_DELETE_ROLES: UserRole[] = DISPATCH_ROLES;
export const INCIDENT_RESTORE_ROLES: UserRole[] = DISPATCH_ROLES;
export const MEDIA_UPLOAD_ROLES: UserRole[] = ['CITIZEN_REPORTER', ...INCIDENT_UPDATE_ROLES];
export const MFA_REQUIRED_ROLES: UserRole[] = [
  ...CITY_ROLES,
  'CITY_CONTENT_EDITOR',
  'DISPATCHER',
  'AUDITOR',
];
export const AUDIT_READ_ROLES: UserRole[] = ['NATIONAL_ADMIN', 'AUDITOR'];

// Geographic management roles (for CRUD on regions/provinces/cities/barangays)
export const GEO_ADMIN_ROLES: UserRole[] = ['NATIONAL_ADMIN', 'REGIONAL_DIRECTOR'];
export const LOCAL_GEO_ADMIN_ROLES: UserRole[] = [
  'NATIONAL_ADMIN',
  'REGIONAL_DIRECTOR',
  'PROVINCIAL_ADMIN',
];
export const BARANGAY_GEO_ADMIN_ROLES: UserRole[] = [...LOCAL_GEO_ADMIN_ROLES, 'CITY_ADMIN'];
export const GEO_READ_ROLES: UserRole[] = [...CITY_ROLES, 'DISPATCHER', 'AUDITOR'];

// Escalation roles
export const ESCALATION_ROLES: UserRole[] = [...CITY_ROLES, 'DISPATCHER'];

// ─── Functions ─────────────────────────────────────────────────────────────────

export function normalizeUserRoleInput(value: string | null | undefined): UserRole | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  return ROLE_ALIASES[normalized] ?? null;
}

export function isUserRole(value: string): value is UserRole {
  return normalizeUserRoleInput(value) !== null;
}

const HIERARCHY_LEVEL: Record<UserRole, number> = {
  NATIONAL_ADMIN: 5,
  REGIONAL_DIRECTOR: 4,
  PROVINCIAL_ADMIN: 3,
  CITY_ADMIN: 2,
  CITY_CONTENT_EDITOR: 1,
  DISPATCHER: 1,
  RESPONDER: 0,
  CITIZEN_REPORTER: 0,
  AUDITOR: -1,
};

export function canManageRole(actorRole: UserRole, targetRole: UserRole): boolean {
  // Only NATIONAL_ADMIN can manage AUDITOR
  if (targetRole === 'AUDITOR') {
    return actorRole === 'NATIONAL_ADMIN';
  }

  // Cannot manage your own level or higher
  const actorLevel = HIERARCHY_LEVEL[actorRole];
  const targetLevel = HIERARCHY_LEVEL[targetRole];

  if (actorLevel === undefined || targetLevel === undefined) return false;

  return actorLevel > targetLevel;
}

// ─── Auth User ─────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  mfaEnabled: boolean;
}
