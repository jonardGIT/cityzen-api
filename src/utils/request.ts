import type { Request, Response } from 'express';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface PaginationQuery {
  enabled: boolean;
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function getPaginationQuery(req: Request): PaginationQuery {
  const hasPageQuery = req.query.page !== undefined;
  const hasPageSizeQuery = req.query.pageSize !== undefined;
  const enabled = hasPageQuery || hasPageSizeQuery;

  const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
  const requestedPageSize = parsePositiveInt(req.query.pageSize, DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);

  return {
    enabled,
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function buildPaginatedResponse<T>(
  items: T[],
  total: number,
  pagination: Pick<PaginationQuery, 'page' | 'pageSize'>,
): PaginatedResponse<T> {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pagination.pageSize);
  return {
    data: items,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages,
      hasNextPage: pagination.page * pagination.pageSize < total,
      hasPrevPage: pagination.page > 1,
    },
  };
}

// Relaxed: Accept any non-empty string as ID (for legacy/test/seed compatibility)
export function getParamId(req: Request, res: Response): string | null {
  const id = req.params.id;
  if (typeof id !== 'string' || id.trim() === '') {
    res.status(400).json({ message: 'Invalid id parameter (must be a non-empty string)'});
    return null;
  }
  return id;
}
