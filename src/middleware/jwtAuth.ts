import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { isUserRole, type AuthUser, type UserRole } from '../types/auth.js';

interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
  authSessionId?: string;
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

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (!isTokenPayload(decoded)) {
      res.status(401).json({ message: 'Unauthorized: invalid token payload' });
      return;
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
          },
        },
      },
    });

    if (
      !session ||
      session.userId !== String(payload.sub) ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      res.status(401).json({ message: 'Unauthorized: invalid or revoked session' });
      return;
    }

    if (!isUserRole(session.user.role)) {
      res.status(500).json({ message: 'Invalid stored user role' });
      return;
    }

    (req as AuthenticatedRequest).authUser = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
    };
    (req as AuthenticatedRequest).authSessionId = session.id;

    void prisma.authSession
      .update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => undefined);

    next();
  } catch {
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
