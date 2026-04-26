import type { Request } from 'express';
import { getPaginationQuery } from '../utils/request.js';

function createRequest(query: Record<string, unknown>): Request {
  return {
    query,
  } as Request;
}

describe('request pagination query helpers', () => {
  it('does not enable pagination by default when page params are absent', () => {
    const pagination = getPaginationQuery(createRequest({}));

    expect(pagination.enabled).toBe(false);
    expect(pagination.unpaginatedTake).toBeNull();
  });

  it('applies an opt-in hard cap for unpaginated requests', () => {
    const pagination = getPaginationQuery(createRequest({}), {
      unpaginatedTake: 100,
    });

    expect(pagination.enabled).toBe(false);
    expect(pagination.unpaginatedTake).toBe(100);
  });

  it('ignores the unpaginated hard cap when explicit pagination is requested', () => {
    const pagination = getPaginationQuery(createRequest({ page: '2', pageSize: '10' }), {
      unpaginatedTake: 100,
    });

    expect(pagination.enabled).toBe(true);
    expect(pagination.page).toBe(2);
    expect(pagination.pageSize).toBe(10);
    expect(pagination.unpaginatedTake).toBeNull();
  });
});
