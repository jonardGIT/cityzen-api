import { isArchiveFeatureEnabled } from '../featureSelection.js';

export function isArchiveEnabled(): boolean {
  return isArchiveFeatureEnabled();
}

export function withActiveRecords(where?: Record<string, unknown>): Record<string, unknown> {
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

export function withArchivedRecords(where?: Record<string, unknown>): Record<string, unknown> {
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
): Record<string, unknown> {
  if (archiveScope === 'all') {
    return where ?? {};
  }

  if (archiveScope === 'archived') {
    return withArchivedRecords(where);
  }

  return withActiveRecords(where);
}
