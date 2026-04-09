import type { Request } from 'express';
import { parseListQuery } from '../utils/request.js';
import { citizensListQueryConfig } from '../utils/listQueryConfig.js';

function makeRequest(query: Record<string, unknown>): Request {
  return {
    query,
  } as unknown as Request;
}

describe('parseListQuery', () => {
  it('parses valid filters', () => {
    const req = makeRequest({
      filters: JSON.stringify([
        { field: 'name', operator: 'contains', value: 'juan' },
        {
          field: 'createdAt',
          operator: 'between',
          value: ['2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z'],
        },
      ]),
    });

    const result = parseListQuery(req, citizensListQueryConfig);

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.query?.where).toBeDefined();
  });

  it('rejects invalid field names', () => {
    const req = makeRequest({
      filters: JSON.stringify([{ field: 'passwordHash', operator: 'equals', value: 'x' }]),
    });

    const result = parseListQuery(req, citizensListQueryConfig);

    expect(result.ok).toBe(false);
    expect(result.errors[0].field).toContain('field');
  });

  it('rejects invalid operators', () => {
    const req = makeRequest({
      filters: JSON.stringify([{ field: 'name', operator: 'startsWith', value: 'x' }]),
    });

    const result = parseListQuery(req, citizensListQueryConfig);

    expect(result.ok).toBe(false);
    expect(result.errors[0].field).toContain('operator');
  });

  it('rejects invalid value types', () => {
    const req = makeRequest({
      filters: JSON.stringify([{ field: 'createdAt', operator: 'gte', value: 'not-a-date' }]),
    });

    const result = parseListQuery(req, citizensListQueryConfig);

    expect(result.ok).toBe(false);
    expect(result.errors[0].field).toContain('value');
  });

  it('accepts arbitrary allowed sortBy values', () => {
    const req = makeRequest({ sortBy: 'name', sortOrder: 'asc' });

    const result = parseListQuery(req, citizensListQueryConfig);

    expect(result.ok).toBe(true);
    expect(result.query?.orderBy).toEqual({ name: 'asc' });
  });

  it('rejects disallowed sortBy values', () => {
    const req = makeRequest({ sortBy: 'passwordHash' });

    const result = parseListQuery(req, citizensListQueryConfig);

    expect(result.ok).toBe(false);
    expect(result.errors[0].field).toBe('sortBy');
  });

  it('combines search, filters, and sort', () => {
    const req = makeRequest({
      search: 'ana',
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      filters: JSON.stringify([{ field: 'preferredChannel', operator: 'equals', value: 'Email' }]),
    });

    const result = parseListQuery(req, citizensListQueryConfig);

    expect(result.ok).toBe(true);
    expect(result.query?.search).toBe('ana');
    expect(result.query?.orderBy).toEqual({ updatedAt: 'desc' });
    expect((result.query?.where as { AND?: unknown[] }).AND?.length).toBeGreaterThan(1);
  });

  it('parses includeArchived=true as archiveScope all', () => {
    const req = makeRequest({ includeArchived: 'true' });

    const result = parseListQuery(req, citizensListQueryConfig);

    expect(result.ok).toBe(true);
    expect(result.query?.archiveScope).toBe('all');
  });

  it('parses archivedOnly=true as archiveScope archived', () => {
    const req = makeRequest({ archivedOnly: 'true' });

    const result = parseListQuery(req, citizensListQueryConfig);

    expect(result.ok).toBe(true);
    expect(result.query?.archiveScope).toBe('archived');
  });

  it('rejects conflicting archive scope flags', () => {
    const req = makeRequest({ includeArchived: 'true', archivedOnly: 'true' });

    const result = parseListQuery(req, citizensListQueryConfig);

    expect(result.ok).toBe(false);
    expect(result.errors[0].field).toBe('archivedOnly');
  });
});
