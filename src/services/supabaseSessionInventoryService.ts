import sql from '../lib/sql.js';
import { getSessionMetadata, type SessionStatus } from '../utils/sessionMetadata.js';

type SupabaseSessionRow = {
  id: string;
  created_at: string | Date;
  updated_at: string | Date;
  not_after: string | Date | null;
  refreshed_at: string | Date | null;
  user_agent: string | null;
  ip: string | null;
};

export interface SupabaseSessionInventoryRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  refreshExpiresAt: string | null;
  refreshUsedAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  browserFamily: string | null;
  osFamily: string | null;
  deviceLabel: string | null;
  status: SessionStatus;
}

const AUTH_SESSIONS_TABLE_SCHEMA = 'auth';
const AUTH_SESSIONS_TABLE_NAME = 'sessions';

function toIsoString(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function getSupabaseSessionStatus(notAfter: string | Date | null): SessionStatus {
  const sessionDeadline = toIsoString(notAfter);
  if (!sessionDeadline) {
    return 'active';
  }

  return Date.parse(sessionDeadline) > Date.now() ? 'active' : 'expired';
}

async function getAuthSessionColumns(): Promise<Set<string>> {
  const rows = await sql<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = ${AUTH_SESSIONS_TABLE_SCHEMA}
      AND table_name = ${AUTH_SESSIONS_TABLE_NAME}
  `;

  return new Set(rows.map((row) => row.column_name));
}

function buildAuthSessionsSelectQuery(columns: Set<string>): string {
  const selectParts = [
    columns.has('id') ? 'id' : 'NULL::uuid AS id',
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

  const orderByClause = columns.has('updated_at')
    ? 'ORDER BY updated_at DESC, created_at DESC'
    : 'ORDER BY created_at DESC';

  return `
    SELECT ${selectParts.join(', ')}
    FROM auth.sessions
    WHERE user_id = $1
    ${orderByClause}
  `;
}

export async function listSupabaseSessionsForUser(
  supabaseAuthUserId: string,
): Promise<SupabaseSessionInventoryRecord[]> {
  const columns = await getAuthSessionColumns();
  const query = buildAuthSessionsSelectQuery(columns);
  const rows = await sql.unsafe<SupabaseSessionRow[]>(query, [supabaseAuthUserId]);

  return rows.map((session) => ({
    ...getSessionMetadata(session.user_agent),
    id: session.id,
    createdAt: toIsoString(session.created_at) ?? new Date(0).toISOString(),
    updatedAt:
      toIsoString(session.updated_at) ??
      toIsoString(session.created_at) ??
      new Date(0).toISOString(),
    expiresAt: toIsoString(session.not_after),
    refreshExpiresAt: toIsoString(session.not_after),
    refreshUsedAt: toIsoString(session.refreshed_at),
    revokedAt: null,
    lastUsedAt: toIsoString(session.refreshed_at) ?? toIsoString(session.updated_at),
    userAgent: session.user_agent,
    ipAddress: session.ip,
    status: getSupabaseSessionStatus(session.not_after),
  }));
}

export async function revokeSupabaseUserSession(
  supabaseAuthUserId: string,
  sessionId: string,
): Promise<boolean> {
  const result = await sql<{ id: string }[]>`
    DELETE FROM auth.sessions
    WHERE id = ${sessionId}::uuid
      AND user_id = ${supabaseAuthUserId}::uuid
    RETURNING id
  `;

  return result.length > 0;
}
