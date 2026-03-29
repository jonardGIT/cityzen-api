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

type SortOrder = 'asc' | 'desc';
type TimestampSortField = 'createdAt' | 'updatedAt';

export interface TimestampQuery {
  where: {
    createdAt?: {
      gte?: Date;
      lte?: Date;
    };
    updatedAt?: {
      gte?: Date;
      lte?: Date;
    };
  };
  hasFilters: boolean;
  sortBy: TimestampSortField;
  sortOrder: SortOrder;
  orderBy: {
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };
}

type FilterOperator = 'equals' | 'contains' | 'in' | 'gt' | 'gte' | 'lt' | 'lte' | 'between';
type FieldType = 'string' | 'uuid' | 'datetime';

interface ListFilterInput {
  field?: unknown;
  operator?: unknown;
  value?: unknown;
}

interface ListFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

interface QueryValidationError {
  field: string;
  message: string;
}

interface FieldConfig {
  type: FieldType;
  filterOperators: FilterOperator[];
  searchable?: boolean;
  sortable?: boolean;
}

export interface ListQueryConfig {
  resource: string;
  defaultSortBy: string;
  fields: Record<string, FieldConfig>;
}

export interface ListQuery {
  where?: Record<string, unknown>;
  orderBy: Record<string, SortOrder>;
  sortBy: string;
  sortOrder: SortOrder;
  search: string;
  filters: ListFilter[];
}

interface ListQueryResult {
  ok: boolean;
  query?: ListQuery;
  errors: QueryValidationError[];
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

function parseSortOrder(value: unknown): SortOrder {
  if (value === undefined) {
    return 'desc';
  }

  if (typeof value !== 'string') {
    throw new Error('sortOrder must be "asc" or "desc"');
  }

  const normalized = value.toLowerCase();
  if (normalized !== 'asc' && normalized !== 'desc') {
    throw new Error('sortOrder must be "asc" or "desc"');
  }

  return normalized;
}

function parseTimestampSortField(value: unknown): TimestampSortField {
  if (typeof value !== 'string') {
    return 'createdAt';
  }

  return value === 'updatedAt' ? 'updatedAt' : 'createdAt';
}

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== 'string') {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function buildDateFilter(
  fromValue: unknown,
  toValue: unknown,
): { gte?: Date; lte?: Date } | undefined {
  const gte = parseIsoDate(fromValue);
  const lte = parseIsoDate(toValue);

  if (!gte && !lte) {
    return undefined;
  }

  return {
    ...(gte ? { gte } : {}),
    ...(lte ? { lte } : {}),
  };
}

export function getTimestampQuery(req: Request): TimestampQuery {
  const sortBy = parseTimestampSortField(req.query.sortBy);
  const sortOrder = parseSortOrder(req.query.sortOrder);

  const createdAt = buildDateFilter(req.query.createdFrom, req.query.createdTo);
  const updatedAt = buildDateFilter(req.query.updatedFrom, req.query.updatedTo);

  return {
    where: {
      ...(createdAt ? { createdAt } : {}),
      ...(updatedAt ? { updatedAt } : {}),
    },
    hasFilters: Boolean(createdAt || updatedAt),
    sortBy,
    sortOrder,
    orderBy: {
      [sortBy]: sortOrder,
    },
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseFilterOperator(value: unknown): FilterOperator | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.toLowerCase();
  const allowed: FilterOperator[] = [
    'equals',
    'contains',
    'in',
    'gt',
    'gte',
    'lt',
    'lte',
    'between',
  ];
  return allowed.includes(normalized as FilterOperator) ? (normalized as FilterOperator) : null;
}

function parseListFilters(rawFilters: unknown): ListFilterInput[] {
  if (rawFilters === undefined) {
    return [];
  }

  if (typeof rawFilters === 'string') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawFilters);
    } catch {
      throw new Error('filters must be valid JSON');
    }

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (isPlainObject(parsed)) {
      return [parsed];
    }

    throw new Error('filters must be an array of filter objects');
  }

  throw new Error('filters must be a JSON string');
}

function parseSearch(rawSearch: unknown): string {
  if (rawSearch === undefined) {
    return '';
  }

  if (typeof rawSearch !== 'string') {
    throw new Error('search must be a string');
  }

  return rawSearch.trim();
}

function validateFieldValue(
  fieldName: string,
  field: FieldConfig,
  operator: FilterOperator,
  value: unknown,
): unknown {
  if (operator === 'in') {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error(`${fieldName} with operator in requires a non-empty array value`);
    }

    return value.map((entry) => validateFieldValue(fieldName, field, 'equals', entry));
  }

  if (operator === 'between') {
    if (field.type !== 'datetime') {
      throw new Error(`${fieldName} with operator between is only supported for datetime fields`);
    }

    if (Array.isArray(value) && value.length === 2) {
      const start = parseIsoDate(value[0]);
      const end = parseIsoDate(value[1]);
      if (!start || !end) {
        throw new Error(`${fieldName} with operator between requires valid date-time values`);
      }

      return { gte: start, lte: end };
    }

    if (isPlainObject(value)) {
      const start = parseIsoDate(value.from);
      const end = parseIsoDate(value.to);
      if (!start || !end) {
        throw new Error(`${fieldName} with operator between requires from and to date-time values`);
      }

      return { gte: start, lte: end };
    }

    throw new Error(
      `${fieldName} with operator between requires an array [from, to] or object { from, to }`,
    );
  }

  if (field.type === 'datetime') {
    const date = parseIsoDate(value);
    if (!date) {
      throw new Error(`${fieldName} requires a valid ISO date-time value`);
    }
    return date;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} requires a non-empty string value`);
  }

  return value;
}

function getSearchWhere(
  search: string,
  config: ListQueryConfig,
): Record<string, unknown> | undefined {
  if (!search) {
    return undefined;
  }

  const searchableFields = Object.entries(config.fields)
    .filter(([, fieldConfig]) => fieldConfig.searchable)
    .map(([fieldName]) => fieldName);

  if (searchableFields.length === 0) {
    return undefined;
  }

  return {
    OR: searchableFields.map((fieldName) => ({
      [fieldName]: {
        contains: search,
        mode: 'insensitive',
      },
    })),
  };
}

function buildFilterWhere(
  filters: ListFilter[],
  config: ListQueryConfig,
): Record<string, unknown>[] {
  return filters.map((filter) => {
    const fieldConfig = config.fields[filter.field];
    const validatedValue = validateFieldValue(
      filter.field,
      fieldConfig,
      filter.operator,
      filter.value,
    );

    if (filter.operator === 'between') {
      return {
        [filter.field]: validatedValue,
      };
    }

    if (filter.operator === 'equals') {
      return {
        [filter.field]: validatedValue,
      };
    }

    if (filter.operator === 'contains') {
      return {
        [filter.field]: {
          contains: validatedValue,
          mode: 'insensitive',
        },
      };
    }

    if (filter.operator === 'in') {
      return {
        [filter.field]: {
          in: validatedValue,
        },
      };
    }

    return {
      [filter.field]: {
        [filter.operator]: validatedValue,
      },
    };
  });
}

export function parseListQuery(req: Request, config: ListQueryConfig): ListQueryResult {
  const errors: QueryValidationError[] = [];

  let search = '';
  try {
    search = parseSearch(req.query.search);
  } catch (error) {
    errors.push({ field: 'search', message: (error as Error).message });
  }

  let sortOrder: SortOrder = 'desc';
  try {
    sortOrder = parseSortOrder(req.query.sortOrder);
  } catch (error) {
    errors.push({ field: 'sortOrder', message: (error as Error).message });
  }

  let sortBy = config.defaultSortBy;
  if (req.query.sortBy !== undefined) {
    if (typeof req.query.sortBy !== 'string') {
      errors.push({ field: 'sortBy', message: 'sortBy must be a string' });
    } else if (!config.fields[req.query.sortBy] || !config.fields[req.query.sortBy].sortable) {
      errors.push({
        field: 'sortBy',
        message: `${req.query.sortBy} is not sortable for ${config.resource}`,
      });
    } else {
      sortBy = req.query.sortBy;
    }
  }

  const filters: ListFilter[] = [];
  try {
    const parsedFilters = parseListFilters(req.query.filters);
    parsedFilters.forEach((rawFilter, index) => {
      if (!isPlainObject(rawFilter)) {
        errors.push({ field: `filters[${index}]`, message: 'filter must be an object' });
        return;
      }

      const fieldName = typeof rawFilter.field === 'string' ? rawFilter.field : null;
      if (!fieldName) {
        errors.push({
          field: `filters[${index}].field`,
          message: 'field is required and must be a string',
        });
        return;
      }

      const fieldConfig = config.fields[fieldName];
      if (!fieldConfig) {
        errors.push({
          field: `filters[${index}].field`,
          message: `${fieldName} is not filterable for ${config.resource}`,
        });
        return;
      }

      const operator = parseFilterOperator(rawFilter.operator);
      if (!operator) {
        errors.push({
          field: `filters[${index}].operator`,
          message: 'operator must be one of equals, contains, in, gt, gte, lt, lte, between',
        });
        return;
      }

      if (!fieldConfig.filterOperators.includes(operator)) {
        errors.push({
          field: `filters[${index}].operator`,
          message: `${operator} is not supported for ${fieldName}`,
        });
        return;
      }

      if (rawFilter.value === undefined) {
        errors.push({ field: `filters[${index}].value`, message: 'value is required' });
        return;
      }

      try {
        validateFieldValue(fieldName, fieldConfig, operator, rawFilter.value);
      } catch (error) {
        errors.push({ field: `filters[${index}].value`, message: (error as Error).message });
        return;
      }

      filters.push({
        field: fieldName,
        operator,
        value: rawFilter.value,
      });
    });
  } catch (error) {
    errors.push({ field: 'filters', message: (error as Error).message });
  }

  const createdAt = buildDateFilter(req.query.createdFrom, req.query.createdTo);
  const updatedAt = buildDateFilter(req.query.updatedFrom, req.query.updatedTo);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const whereClauses: Record<string, unknown>[] = [];
  const searchWhere = getSearchWhere(search, config);
  if (searchWhere) {
    whereClauses.push(searchWhere);
  }

  whereClauses.push(...buildFilterWhere(filters, config));

  if (createdAt) {
    whereClauses.push({ createdAt });
  }
  if (updatedAt) {
    whereClauses.push({ updatedAt });
  }

  const where =
    whereClauses.length > 0
      ? {
          AND: whereClauses,
        }
      : undefined;

  return {
    ok: true,
    query: {
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      sortBy,
      sortOrder,
      search,
      filters,
    },
    errors: [],
  };
}

export function getListQuery(
  req: Request,
  res: Response,
  config: ListQueryConfig,
): ListQuery | null {
  const parsed = parseListQuery(req, config);
  if (parsed.ok) {
    return parsed.query as ListQuery;
  }

  res.status(422).json({
    message: 'Invalid list query parameters',
    errors: parsed.errors,
  });
  return null;
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
    res.status(400).json({ message: 'Invalid id parameter (must be a non-empty string)' });
    return null;
  }
  return id;
}
