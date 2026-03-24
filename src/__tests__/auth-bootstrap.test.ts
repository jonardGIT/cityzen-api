import request from 'supertest';
import app, { API_V1 } from '../app.js';

jest.setTimeout(20000);

describe('Auth bootstrap endpoints', () => {
  it('POST /auth/register should create a VIEWER account and return token', async () => {
    const stamp = Date.now();
    const res = await request(app).post(`${API_V1}/auth/register`).send({
      name: `Bootstrap User ${stamp}`,
      email: `bootstrap.${stamp}@postman.local`,
      password: 'Password123!',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('role', 'VIEWER');
  });

  it('POST /auth/login should return token for seeded admin', async () => {
    const res = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
  });

  it('GET /auth/me should return current user with bearer token', async () => {
    const login = await request(app).post(`${API_V1}/auth/login`).send({
      email: 'admin@xypes.local',
      password: 'Password123!',
    });

    expect(login.status).toBe(200);

    const me = await request(app)
      .get(`${API_V1}/auth/me`)
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(me.status).toBe(200);
    expect(me.body).toHaveProperty('id');
    expect(me.body).toHaveProperty('email', 'admin@xypes.local');
  });
});
