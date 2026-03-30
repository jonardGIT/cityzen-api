import request from 'supertest';
import app, { API_V1 } from '../app.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';

const CAPABILITIES = `${API_V1}/users/capabilities`;
const USERS = `${API_V1}/users`;

let adminToken = '';
let citizenReporterToken = '';

beforeAll(async () => {
  [adminToken, citizenReporterToken] = await Promise.all([
    getAdminToken(),
    getTokenForRole('analyst@xypes.local'),
  ]);
});

describe(`GET ${CAPABILITIES}`, () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await request(app).get(CAPABILITIES);
    expect(res.status).toBe(401);
  });

  it('should return 200 with own capability metadata for CITIZEN_REPORTER', async () => {
    const res = await request(app)
      .get(CAPABILITIES)
      .set('Authorization', `Bearer ${citizenReporterToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      role: 'CITIZEN_REPORTER',
      label: 'Citizen Reporter',
      scope: 'own',
      canUpdateUser: false,
      canDeleteUser: false,
    });
    expect(res.body.permissions).toEqual(
      expect.arrayContaining([
        'citizen:link:self',
        'incident:create:self',
        'incident:read:self',
        'incident:update:self',
        'media:upload:self',
      ]),
    );
  });

  it('should return 200 with capability metadata for SYSTEM_ADMIN', async () => {
    const res = await request(app).get(CAPABILITIES).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      role: 'SYSTEM_ADMIN',
      label: 'System Admin',
      scope: 'global',
      canUpdateUser: true,
      canDeleteUser: true,
    });
    expect(res.body.permissions).toEqual(
      expect.arrayContaining([
        'user:manage:global',
        'role:manage:global',
        'settings:manage:global',
        'incident:delete:global',
      ]),
    );
  });

  it('should return boolean values (not null or string)', async () => {
    const res = await request(app).get(CAPABILITIES).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.canUpdateUser).toBe('boolean');
    expect(typeof res.body.canDeleteUser).toBe('boolean');
  });

  it('should return 200 with department-scoped capability metadata for DISPATCHER', async () => {
    const dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
    const res = await request(app)
      .get(CAPABILITIES)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      role: 'DISPATCHER',
      label: 'Dispatcher',
      scope: 'department',
      canUpdateUser: false,
      canDeleteUser: false,
    });
    expect(res.body.permissions).toEqual(
      expect.arrayContaining([
        'incident:read:department',
        'incident:assign:department',
        'incident:update:priority:department',
      ]),
    );
  });
});

describe(`GET ${USERS}`, () => {
  it('should return array when pagination params are not provided', async () => {
    const res = await request(app).get(USERS).set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should return paginated response when page and pageSize are provided', async () => {
    const res = await request(app)
      .get(`${USERS}?page=1&pageSize=2`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination).toMatchObject({
      page: 1,
      pageSize: 2,
    });
    expect(typeof res.body.pagination.total).toBe('number');
    expect(typeof res.body.pagination.totalPages).toBe('number');
    expect(typeof res.body.pagination.hasNextPage).toBe('boolean');
    expect(typeof res.body.pagination.hasPrevPage).toBe('boolean');
    expect(res.body.data.length).toBeLessThanOrEqual(2);
  });

  it('should support updatedAt sorting and range filters', async () => {
    const updatedFrom = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .get(
        `${USERS}?page=1&pageSize=5&sortBy=updatedAt&sortOrder=desc&updatedFrom=${encodeURIComponent(updatedFrom)}`,
      )
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    for (const user of res.body.data) {
      expect(new Date(user.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(updatedFrom).getTime(),
      );
    }

    if (res.body.data.length >= 2) {
      const first = new Date(res.body.data[0].updatedAt).getTime();
      const second = new Date(res.body.data[1].updatedAt).getTime();
      expect(first).toBeGreaterThanOrEqual(second);
    }
  });
});
