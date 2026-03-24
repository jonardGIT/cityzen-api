export const USER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'RESPONDER', 'VIEWER'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LEVELS: Record<UserRole, number> = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  DISPATCHER: 3,
  RESPONDER: 2,
  VIEWER: 1,
};

export const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN'];
export const DISPATCH_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'DISPATCHER'];
export const INCIDENT_WRITE_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'RESPONDER'];

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

export function hasHigherAccessLevel(actorRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_LEVELS[actorRole] > ROLE_LEVELS[targetRole];
}

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
}
