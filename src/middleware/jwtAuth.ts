import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import {
  isSupabaseAuthEnabled,
  isSupabaseJwtEnabled,
  isSupabaseTotpEnabled,
  SupabaseAuthServiceError,
  verifySupabaseAccessToken,
} from '../services/supabaseAuthService.js';
import {
  MFA_REQUIRED_ROLES,
  isUserRole,
  normalizeUserRoleInput,
  type AuthUser,
  type UserRole,
} from '../types/auth.js';
import { isArchiveEnabled, withActiveRecords } from '../utils/archive.js';
import {
  isPathAllowedDuringMfaEnrollment,
  isPrivilegedMfaFeatureMisconfigured,
  requiresPrivilegedMfaEnrollment,
} from '../utils/mfaPolicy.js';

interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
  authSessionId?: string;
  authAccessToken?: string;
  authProvider?: 'app' | 'supabase';
}

interface TokenPayload {
  sub: number;
  email: string;
  role: UserRole;
  sid: string;
}

function isTokenPayload(value: unknown): value is TokenPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    (typeof payload.sub === 'string' || typeof payload.sub === 'number') &&
    typeof payload.email === 'string' &&
    typeof payload.role === 'string' &&
    typeof payload.sid === 'string'
  );
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET must be configured');
  }

  return secret;
}

function parseBearerToken(req: Request): string | null {
  const authHeader = req.header('authorization');
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token;
}

function isSupabaseConfigError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes('SUPABASE_URL must be configured') ||
      error.message.includes('SUPABASE_ANON_KEY must be configured') ||
      error.message.includes('SUPABASE_SERVICE_ROLE_KEY must be configured') ||
      error.message.includes('SUPABASE_AUTH_ENABLED must be true when SUPABASE_JWT_ENABLED=true') ||
      error.message.includes('SUPABASE_JWT_ENABLED must be true when SUPABASE_TOTP_ENABLED=true'))
  );
}

async function requireSupabaseJwtAuth(
  req: Request,
  res: Response,
  next: NextFunction,
  token: string,
): Promise<void> {
  if (!isSupabaseAuthEnabled()) {
    res.status(503).json({
      message: 'Supabase JWT mode requires SUPABASE_AUTH_ENABLED=true',
    });
    return;
  }

  try {
    const identity = await verifySupabaseAccessToken(token);
    const normalizedEmail = identity.email.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: withActiveRecords({
        OR: [{ supabaseAuthUserId: identity.id }, { email: normalizedEmail }],
      }) as any,
      select: {
        id: true,
        email: true,
        role: true,
        mfaEnabled: true,
        mfaEnabledAt: true,
        supabaseAuthUserId: true,
        archivedAt: true,
      },
    });

    if (!user) {
      res.status(401).json({ message: 'Unauthorized: no local account is linked to this token' });
      return;
    }

    if (user.supabaseAuthUserId && user.supabaseAuthUserId !== identity.id) {
      res.status(401).json({ message: 'Unauthorized: Supabase identity mapping is invalid' });
      return;
    }

    if (!user.supabaseAuthUserId) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          supabaseAuthUserId: identity.id,
        },
      });
      user.supabaseAuthUserId = identity.id;
    }

    const normalizedRole = normalizeUserRoleInput(user.role);
    if (!normalizedRole || !isUserRole(normalizedRole)) {
      res.status(500).json({ message: 'Invalid stored user role' });
      return;
    }

    if (MFA_REQUIRED_ROLES.includes(normalizedRole) && user.mfaEnabled) {
      if (isSupabaseTotpEnabled()) {
        if (identity.currentAuthenticatorLevel !== 'aal2') {
          res.status(401).json({
            message: 'Unauthorized: sign in again to satisfy MFA requirements',
          });
          return;
        }
      } else if (
        !identity.accessTokenIssuedAt ||
        (user.mfaEnabledAt !== null &&
          user.mfaEnabledAt.getTime() > identity.accessTokenIssuedAt * 1000)
      ) {
        res
          .status(401)
          .json({ message: 'Unauthorized: sign in again to satisfy MFA requirements' });
        return;
      }
    }

    if (isPrivilegedMfaFeatureMisconfigured(normalizedRole)) {
      res.status(503).json({
        message:
          'Privileged MFA enforcement is enabled in production but MFA is disabled for this build',
      });
      return;
    }

    if (
      requiresPrivilegedMfaEnrollment(normalizedRole, user.mfaEnabled) &&
      !isPathAllowedDuringMfaEnrollment(req.originalUrl)
    ) {
      res.status(403).json({
        message: 'Privileged MFA enrollment is required before accessing this route',
        mfaEnrollmentRequired: true,
      });
      return;
    }

    (req as AuthenticatedRequest).authUser = {
      id: user.id,
      email: user.email,
      role: normalizedRole,
      mfaEnabled: user.mfaEnabled,
    };
    (req as AuthenticatedRequest).authSessionId = identity.sessionId ?? undefined;
    (req as AuthenticatedRequest).authAccessToken = token;
    (req as AuthenticatedRequest).authProvider = 'supabase';

    next();
  } catch (error) {
    if (error instanceof SupabaseAuthServiceError) {
      res.status(error.status === 401 ? 401 : 503).json({
        message:
          error.status === 401
            ? 'Unauthorized: invalid or expired token'
            : `Supabase JWT is not available: ${error.message}`,
      });
      return;
    }

    if (isSupabaseConfigError(error)) {
      res.status(503).json({
        message: `Supabase JWT is not available: ${(error as Error).message}`,
      });
      return;
    }

    res.status(401).json({ message: 'Unauthorized: invalid or expired token' });
  }
}

async function requireLocalJwtAuth(
  req: Request,
  res: Response,
  next: NextFunction,
  token: string,
): Promise<boolean> {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (!isTokenPayload(decoded)) {
      return false;
    }

    const payload = decoded;
    const session = await prisma.authSession.findUnique({
      where: { id: payload.sid },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            archivedAt: true,
            mfaEnabled: true,
          },
        },
      },
    });

    if (
      !session ||
      session.userId !== String(payload.sub) ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      (isArchiveEnabled() && session.user.archivedAt !== null)
    ) {
      return false;
    }

    const normalizedRole = normalizeUserRoleInput(session.user.role);
    if (!normalizedRole || !isUserRole(normalizedRole)) {
      res.status(500).json({ message: 'Invalid stored user role' });
      return true;
    }

    if (isPrivilegedMfaFeatureMisconfigured(normalizedRole)) {
      res.status(503).json({
        message:
          'Privileged MFA enforcement is enabled in production but MFA is disabled for this build',
      });
      return true;
    }

    if (
      requiresPrivilegedMfaEnrollment(normalizedRole, session.user.mfaEnabled) &&
      !isPathAllowedDuringMfaEnrollment(req.originalUrl)
    ) {
      res.status(403).json({
        message: 'Privileged MFA enrollment is required before accessing this route',
        mfaEnrollmentRequired: true,
      });
      return true;
    }

    (req as AuthenticatedRequest).authUser = {
      id: session.user.id,
      email: session.user.email,
      role: normalizedRole,
      mfaEnabled: session.user.mfaEnabled,
    };
    (req as AuthenticatedRequest).authSessionId = session.id;
    (req as AuthenticatedRequest).authAccessToken = token;
    (req as AuthenticatedRequest).authProvider = 'app';

    void prisma.authSession
      .update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => undefined);

    next();
    return true;
  } catch {
    return false;
  }
}

// Verifies JWT token and attaches authenticated user context to request.
export async function requireJwtAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = parseBearerToken(req);
  if (!token) {
    res.status(401).json({ message: 'Unauthorized: bearer token required' });
    return;
  }

  if (isSupabaseJwtEnabled()) {
    if (await requireLocalJwtAuth(req, res, next, token)) {
      return;
    }

    await requireSupabaseJwtAuth(req, res, next, token);
    return;
  }

  if (!(await requireLocalJwtAuth(req, res, next, token))) {
    res.status(401).json({ message: 'Unauthorized: invalid or expired token' });
  }
}

// Ensures the authenticated user role is one of the allowed roles.
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authUser = (req as AuthenticatedRequest).authUser;
    if (!authUser) {
      res.status(401).json({ message: 'Unauthorized: missing authentication context' });
      return;
    }

    if (!allowedRoles.includes(authUser.role)) {
      res.status(403).json({ message: 'Forbidden: insufficient role permissions' });
      return;
    }

    next();
  };
}

export type { AuthenticatedRequest };
