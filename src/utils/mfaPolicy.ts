import type { UserRole } from '../types/auth.js';
import { MFA_REQUIRED_ROLES } from '../types/auth.js';
import { isAnyMfaFeatureEnabled } from '../featureSelection.js';

const MFA_ENROLLMENT_ALLOWED_PATH_SUFFIXES = new Set([
  '/auth/me',
  '/auth/logout',
  '/auth/mfa/setup',
  '/auth/mfa/enable',
  '/auth/mfa/disable',
]);

export function isPrivilegedRole(role: UserRole): boolean {
  return MFA_REQUIRED_ROLES.includes(role);
}

export function isProductionMfaEnforcementActive(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isPrivilegedMfaFeatureMisconfigured(role: UserRole): boolean {
  return isProductionMfaEnforcementActive() && isPrivilegedRole(role) && !isAnyMfaFeatureEnabled();
}

export function requiresPrivilegedMfaEnrollment(role: UserRole, mfaEnabled: boolean): boolean {
  return isProductionMfaEnforcementActive() && isPrivilegedRole(role) && !mfaEnabled;
}

export function isPathAllowedDuringMfaEnrollment(originalUrl: string): boolean {
  const path = originalUrl.split('?')[0] ?? originalUrl;

  for (const allowedSuffix of MFA_ENROLLMENT_ALLOWED_PATH_SUFFIXES) {
    if (path.endsWith(allowedSuffix)) {
      return true;
    }
  }

  return false;
}