function isTruthyEnvValue(value: string | undefined): boolean {
  return value !== undefined && ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function isArchiveEnabled(): boolean {
  const rawValue = process.env.ARCHIVE_RECORDS_ENABLED;
  if (rawValue === undefined || rawValue.trim() === '') {
    return true;
  }

  return isTruthyEnvValue(rawValue);
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