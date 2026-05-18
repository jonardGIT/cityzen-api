import prisma from '../lib/prisma.js';
import sql from '../lib/sql.js';
import { resolveStoredDisplayName } from '../utils/nameFields.js';
import {
  getAuthSessionStatus,
  getSessionMetadata,
  type SessionStatus,
} from '../utils/sessionMetadata.js';

type SessionOwner = {
  id: string;
  email: string;
  role: string;
  name: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  suffix: string | null;
};

type LocalSessionRow = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  refreshExpiresAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  userAgent: string | null;
  ipAddress: string | null;
  user: SessionOwner;
};

type SupabaseSessionRow = {
  id: string;
  user_id: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  not_after: string | Date | null;
  refreshed_at: string | Date | null;
  user_agent: string | null;
  ip: string | null;
};

export interface AdminSessionInventoryRecord {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  userDisplayName: string | null;
  authProvider: 'app-jwt' | 'supabase-jwt';
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  status: SessionStatus;
  browserFamily: string | null;
  osFamily: string | null;
  deviceLabel: string | null;
  ipAddressMasked: string | null;
  isCurrentActorSession: boolean;
}

function toIsoString(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function maskIpAddress(ipAddress: string | null | undefined): string | null {
  const normalized = ipAddress?.trim();
  if (!normalized) {
    return null;
  }

  const ipv4Candidate = normalized.startsWith('::ffff:') ? normalized.slice(7) : normalized;
  const ipv4Parts = ipv4Candidate.split('.');
  if (ipv4Parts.length === 4 && ipv4Parts.every((part) => /^\d+$/.test(part))) {
    return `${ipv4Parts[0]}.${ipv4Parts[1]}.${ipv4Parts[2]}.x`;
  }

  if (normalized.includes(':')) {
    const groups = normalized.split(':').filter(Boolean);
    if (groups.length >= 2) {
      return `${groups.slice(0, 2).join(':')}:*`;
    }

    return 'ipv6:*';
  }

  return 'redacted';
}

function buildAdminSessionRecord(input: {
  id: string;
  owner: SessionOwner | null;
  authProvider: 'app-jwt' | 'supabase-jwt';
  createdAt: string | Date;
  updatedAt: string | Date;
  expiresAt: string | Date | null;
  refreshExpiresAt?: string | Date | null;
  revokedAt: string | Date | null;
  lastUsedAt: string | Date | null;
  userAgent: string | null;
  ipAddress: string | null;
  currentActorSessionId: string | null;
}): AdminSessionInventoryRecord {
  const metadata = getSessionMetadata(input.userAgent);
  const refreshExpiry = input.refreshExpiresAt ?? input.expiresAt;
  const status =
    input.authProvider === 'supabase-jwt' && !refreshExpiry
      ? 'active'
      : getAuthSessionStatus({
          revokedAt: input.revokedAt,
          refreshExpiresAt: refreshExpiry ?? new Date(0),
        });

  return {
    id: input.id,
    userId: input.owner?.id ?? null,
    userEmail: input.owner?.email ?? null,
    userRole: input.owner?.role ?? null,
    userDisplayName: input.owner ? resolveStoredDisplayName(input.owner) : null,
    authProvider: input.authProvider,
    createdAt: toIsoString(input.createdAt) ?? new Date(0).toISOString(),
    updatedAt:
      toIsoString(input.updatedAt) ?? toIsoString(input.createdAt) ?? new Date(0).toISOString(),
    lastUsedAt: toIsoString(input.lastUsedAt),
    expiresAt: toIsoString(input.expiresAt),
    revokedAt: toIsoString(input.revokedAt),
    status,
    browserFamily: metadata.browserFamily,
    osFamily: metadata.osFamily,
    deviceLabel: metadata.deviceLabel,
    ipAddressMasked: maskIpAddress(input.ipAddress),
    isCurrentActorSession: input.id === input.currentActorSessionId,
  };
}

async function getSupabaseSessionColumns(): Promise<Set<string>> {
  const rows = await sql<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'auth'
      AND table_name = 'sessions'
  `;

  return new Set(rows.map((row) => row.column_name));
}

function buildAdminSupabaseSessionsQuery(columns: Set<string>, sessionId?: string): string {
  const selectParts = [
    columns.has('id') ? 'id' : 'NULL::uuid AS id',
    columns.has('user_id') ? 'user_id::text AS user_id' : 'NULL::text AS user_id',
    columns.has('created_at') ? 'created_at' : 'NOW() AS created_at',
    columns.has('updated_at')
      ? 'updated_at'
      : columns.has('created_at')
        ? 'created_at AS updated_at'
        : 'NOW() AS updated_at',
    columns.has('not_after') ? 'not_after' : 'NULL::timestamptz AS not_after',
    columns.has('refreshed_at') ? 'refreshed_at' : 'NULL::timestamptz AS refreshed_at',
    columns.has('user_agent') ? 'user_agent' : 'NULL::text AS user_agent',
    columns.has('ip') ? 'ip::text AS ip' : 'NULL::text AS ip',
  ];

  const whereClause = sessionId ? 'WHERE id = $1::uuid' : '';

  return `
    SELECT ${selectParts.join(', ')}
    FROM auth.sessions
    ${whereClause}
    ORDER BY updated_at DESC, created_at DESC
  `;
}

async function buildSupabaseOwnersByAuthUserId(): Promise<Map<string, SessionOwner>> {
  const users = await prisma.user.findMany({
    where: { supabaseAuthUserId: { not: null } },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      firstName: true,
      middleName: true,
      lastName: true,
      suffix: true,
      supabaseAuthUserId: true,
    },
  });

  return new Map(
    users
      .filter((user): user is typeof user & { supabaseAuthUserId: string } =>
        Boolean(user.supabaseAuthUserId),
      )
      .map((user) => [
        user.supabaseAuthUserId,
        {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          firstName: user.firstName,
          middleName: user.middleName,
          lastName: user.lastName,
          suffix: user.suffix,
        },
      ]),
  );
}

export async function listAdminAuthSessions(
  currentActorSessionId: string | null,
): Promise<AdminSessionInventoryRecord[]> {
  const sessions = await prisma.authSession.findMany({
    orderBy: [{ revokedAt: 'asc' }, { lastUsedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      expiresAt: true,
      refreshExpiresAt: true,
      revokedAt: true,
      lastUsedAt: true,
      userAgent: true,
      ipAddress: true,
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          name: true,
          firstName: true,
          middleName: true,
          lastName: true,
          suffix: true,
        },
      },
    },
  });

  return sessions.map((session) =>
    buildAdminSessionRecord({
      id: session.id,
      owner: session.user,
      authProvider: 'app-jwt',
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
      refreshExpiresAt: session.refreshExpiresAt,
      revokedAt: session.revokedAt,
      lastUsedAt: session.lastUsedAt,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      currentActorSessionId,
    }),
  );
}

export async function getAdminAuthSessionById(
  sessionId: string,
  currentActorSessionId: string | null,
): Promise<AdminSessionInventoryRecord | null> {
  const session = await prisma.authSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      expiresAt: true,
      refreshExpiresAt: true,
      revokedAt: true,
      lastUsedAt: true,
      userAgent: true,
      ipAddress: true,
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          name: true,
          firstName: true,
          middleName: true,
          lastName: true,
          suffix: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  return buildAdminSessionRecord({
    id: session.id,
    owner: session.user,
    authProvider: 'app-jwt',
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    expiresAt: session.expiresAt,
    refreshExpiresAt: session.refreshExpiresAt,
    revokedAt: session.revokedAt,
    lastUsedAt: session.lastUsedAt,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    currentActorSessionId,
  });
}

export async function revokeAdminAuthSession(sessionId: string): Promise<boolean> {
  const result = await prisma.authSession.updateMany({
    where: {
      id: sessionId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count > 0;
}

export async function listAdminSupabaseSessions(
  currentActorSessionId: string | null,
): Promise<AdminSessionInventoryRecord[]> {
  const [columns, ownersByAuthUserId] = await Promise.all([
    getSupabaseSessionColumns(),
    buildSupabaseOwnersByAuthUserId(),
  ]);
  const rows = await sql.unsafe<SupabaseSessionRow[]>(buildAdminSupabaseSessionsQuery(columns));

  return rows.map((session) =>
    buildAdminSessionRecord({
      id: session.id,
      owner: session.user_id ? (ownersByAuthUserId.get(session.user_id) ?? null) : null,
      authProvider: 'supabase-jwt',
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      expiresAt: session.not_after,
      revokedAt: null,
      lastUsedAt: session.refreshed_at ?? session.updated_at,
      userAgent: session.user_agent,
      ipAddress: session.ip,
      currentActorSessionId,
    }),
  );
}

export async function getAdminSupabaseSessionById(
  sessionId: string,
  currentActorSessionId: string | null,
): Promise<AdminSessionInventoryRecord | null> {
  const [columns, ownersByAuthUserId] = await Promise.all([
    getSupabaseSessionColumns(),
    buildSupabaseOwnersByAuthUserId(),
  ]);
  const rows = await sql.unsafe<SupabaseSessionRow[]>(
    buildAdminSupabaseSessionsQuery(columns, sessionId),
    [sessionId],
  );
  const session = rows[0];

  if (!session) {
    return null;
  }

  return buildAdminSessionRecord({
    id: session.id,
    owner: session.user_id ? (ownersByAuthUserId.get(session.user_id) ?? null) : null,
    authProvider: 'supabase-jwt',
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    expiresAt: session.not_after,
    revokedAt: null,
    lastUsedAt: session.refreshed_at ?? session.updated_at,
    userAgent: session.user_agent,
    ipAddress: session.ip,
    currentActorSessionId,
  });
}

export async function revokeAdminSupabaseSession(sessionId: string): Promise<boolean> {
  const result = await sql<{ id: string }[]>`
    DELETE FROM auth.sessions
    WHERE id = ${sessionId}::uuid
    RETURNING id
  `;

  return result.length > 0;
}
