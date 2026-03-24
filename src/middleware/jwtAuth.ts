import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthUser, UserRole } from '../types/auth.js';

interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
}

interface TokenPayload {
  sub: number;
  email: string;
  role: UserRole;
}

function isTokenPayload(value: unknown): value is TokenPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    (typeof payload.sub === 'string' || typeof payload.sub === 'number') &&
    typeof payload.email === 'string' &&
    typeof payload.role === 'string'
  );
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET ?? 'dev-only-secret-change-me';
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
export function requireJwtAuth(req: Request, res: Response, next: NextFunction): void {
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
    (req as AuthenticatedRequest).authUser = {
      id: Number(payload.sub),
      email: payload.email,
      role: payload.role,
    };
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
