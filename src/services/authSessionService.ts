import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { normalizeUserRoleInput, type UserRole } from '../types/auth.js';

const ACCESS_TOKEN_TTL_HOURS = 12;
const REFRESH_TOKEN_TTL_DAYS = 30;

interface SessionTokenBundle {
  token: string;
  refreshToken: string;
  sessionId: string;
  expiresAt: string;
  refreshExpiresAt: string;
}

interface AuthSessionRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  refreshExpiresAt: string;
  refreshUsedAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  userAgent: string | null;
  ipAddress: string | null;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET must be configured');
  }

  return secret;
}

function buildSessionExpiry(): Date {
  return new Date(Date.now() + ACCESS_TOKEN_TTL_HOURS * 60 * 60 * 1000);
}

function buildRefreshExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function hashRefreshToken(refreshToken: string): string {
  return createHash('sha256').update(refreshToken).digest('hex');
}

function generateRefreshToken(): string {
  return randomBytes(48).toString('hex');
}

function signAccessToken(input: { userId: string; email: string; role: UserRole; sessionId: string }): string {
  return jwt.sign(
    {
      email: input.email,
      role: input.role,
      sid: input.sessionId,
    },
    getJwtSecret(),
    {
      subject: input.userId,
      expiresIn: `${ACCESS_TOKEN_TTL_HOURS}h`,
    },
  );
}

export async function createAuthSession(input: {
  userId: string;
  email: string;
  role: string;
  userAgent: string | null;
  ipAddress: string | null;
}): Promise<SessionTokenBundle> {
  const normalizedRole: UserRole = normalizeUserRoleInput(input.role) ?? 'CITIZEN_REPORTER';
  const expiresAt = buildSessionExpiry();
  const refreshExpiresAt = buildRefreshExpiry();
  const refreshToken = generateRefreshToken();
  const session = await prisma.authSession.create({
    data: {
      userId: input.userId,
      expiresAt,
      refreshTokenHash: hashRefreshToken(refreshToken),
      refreshExpiresAt,
      refreshUsedAt: new Date(),
      lastUsedAt: new Date(),
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    },
    select: {
      id: true,
      expiresAt: true,
      refreshExpiresAt: true,
    },
  });

  const token = signAccessToken({
    userId: input.userId,
    email: input.email,
    role: normalizedRole,
    sessionId: session.id,
  });

  return {
    token,
    refreshToken,
    sessionId: session.id,
    expiresAt: session.expiresAt.toISOString(),
    refreshExpiresAt: session.refreshExpiresAt.toISOString(),
  };
}

export async function refreshAuthSession(input: {
  refreshToken: string;
  userAgent: string | null;
  ipAddress: string | null;
}): Promise<SessionTokenBundle | null> {
  const session = await prisma.authSession.findFirst({
    where: {
      refreshTokenHash: hashRefreshToken(input.refreshToken),
    },
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

  if (!session || session.revokedAt || session.refreshExpiresAt.getTime() <= Date.now()) {
    return null;
  }

  const normalizedRole: UserRole =
    normalizeUserRoleInput(session.user.role) ?? 'CITIZEN_REPORTER';
  const nextRefreshToken = generateRefreshToken();
  const nextRefreshExpiresAt = buildRefreshExpiry();
  const nextAccessExpiresAt = buildSessionExpiry();

  const updatedSession = await prisma.authSession.update({
    where: { id: session.id },
    data: {
      expiresAt: nextAccessExpiresAt,
      refreshTokenHash: hashRefreshToken(nextRefreshToken),
      refreshExpiresAt: nextRefreshExpiresAt,
      refreshUsedAt: new Date(),
      lastUsedAt: new Date(),
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    },
    select: {
      id: true,
      expiresAt: true,
      refreshExpiresAt: true,
    },
  });

  return {
    token: signAccessToken({
      userId: session.user.id,
      email: session.user.email,
      role: normalizedRole,
      sessionId: updatedSession.id,
    }),
    refreshToken: nextRefreshToken,
    sessionId: updatedSession.id,
    expiresAt: updatedSession.expiresAt.toISOString(),
    refreshExpiresAt: updatedSession.refreshExpiresAt.toISOString(),
  };
}

export async function revokeAuthSession(sessionId: string): Promise<void> {
  await prisma.authSession.updateMany({
    where: {
      id: sessionId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.authSession.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function listAuthSessionsForUser(userId: string): Promise<AuthSessionRecord[]> {
  const sessions = await prisma.authSession.findMany({
    where: { userId },
    orderBy: [{ revokedAt: 'asc' }, { lastUsedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      expiresAt: true,
      refreshExpiresAt: true,
      refreshUsedAt: true,
      revokedAt: true,
      lastUsedAt: true,
      userAgent: true,
      ipAddress: true,
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    refreshExpiresAt: session.refreshExpiresAt.toISOString(),
    refreshUsedAt: session.refreshUsedAt?.toISOString() ?? null,
    revokedAt: session.revokedAt?.toISOString() ?? null,
    lastUsedAt: session.lastUsedAt?.toISOString() ?? null,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
  }));
}

export async function revokeUserSession(userId: string, sessionId: string): Promise<boolean> {
  const result = await prisma.authSession.updateMany({
    where: {
      id: sessionId,
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count > 0;
}