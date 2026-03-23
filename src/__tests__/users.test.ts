import request from 'supertest';
import app, { API_V1 } from '../app.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';

const CAPABILITIES = `${API_V1}/users/capabilities`;
const USERS = `${API_V1}/users`;

let adminToken = '';
let viewerToken = '';

beforeAll(async () => {
  [adminToken, viewerToken] = await Promise.all([
    getAdminToken(),
    getTokenForRole('analyst@xypes.local'),
  ]);
});

describe(`GET ${CAPABILITIES}`, () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await request(app).get(CAPABILITIES);
    expect(res.status).toBe(401);
  });

  it('should return 403 for VIEWER role', async () => {
    const res = await request(app)
      .get(CAPABILITIES)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  it('should return 200 with capability flags for ADMIN', async () => {
    const res = await request(app)
      .get(CAPABILITIES)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('canUpdateUser', true);
    expect(res.body).toHaveProperty('canDeleteUser', true);
  });

  it('should return boolean values (not null or string)', async () => {
    const res = await request(app)
      .get(CAPABILITIES)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.canUpdateUser).toBe('boolean');
    expect(typeof res.body.canDeleteUser).toBe('boolean');
  });

  it('should return 403 for DISPATCHER role', async () => {
    const dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
    const res = await request(app)
      .get(CAPABILITIES)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(403);
  });
});

describe(`GET ${USERS}`, () => {
  it('should return array when pagination params are not provided', async () => {
    const res = await request(app)
      .get(USERS)
      .set('Authorization', `Bearer ${adminToken}`);

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
});
