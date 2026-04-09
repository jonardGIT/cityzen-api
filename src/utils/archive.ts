import { isArchiveFeatureEnabled } from '../featureSelection.js';

export function isArchiveEnabled(): boolean {
  return isArchiveFeatureEnabled();
}

// Archive scope utilities return a Prisma-compatible where clause.
// Uses `any` return type so callers don't need `as any` at every call site,
// since Prisma generates distinct WhereInput types per model.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaWhere = any;

export function withActiveRecords(where?: Record<string, unknown>): PrismaWhere {
  if (!isArchiveEnabled()) {
    return where ?? {};
  }

  if (!where || Object.keys(where).length === 0) {
    return { archivedAt: null };
  }

  return {
    AND: [where, { archivedAt: null }],
  };
}

export function withArchivedRecords(where?: Record<string, unknown>): PrismaWhere {
  if (!isArchiveEnabled()) {
    return where ?? {};
  }

  if (!where || Object.keys(where).length === 0) {
    return { archivedAt: { not: null } };
  }

  return {
    AND: [where, { archivedAt: { not: null } }],
  };
}

export function withArchiveScope(
  where: Record<string, unknown> | undefined,
  archiveScope: 'active' | 'all' | 'archived',
): PrismaWhere {
  if (archiveScope === 'all') {
    return where ?? {};
  }

  if (archiveScope === 'archived') {
    return withArchivedRecords(where);
  }

  return withActiveRecords(where);
}
