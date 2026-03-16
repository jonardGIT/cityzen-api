import request from 'supertest';
import app, { API_V1 } from '../app.js';

const BASE = `${API_V1}/categories`;

describe(`GET ${BASE}`, () => {
  it('should return 200 with array', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe(`GET ${BASE}/:id`, () => {
  it('should return 200 for valid id', async () => {
    const res = await request(app).get(`${BASE}/1`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('should return 404 for unknown id', async () => {
    const res = await request(app).get(`${BASE}/9999`);
    expect(res.status).toBe(404);
  });
});

describe(`POST ${BASE}`, () => {
  it('should create and return 201', async () => {
    const res = await request(app).post(BASE).send({ name: 'Flood', subCategory: 'Urban' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Flood' });
  });

  it('should return 400 when name is missing', async () => {
    const res = await request(app).post(BASE).send({});
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });
});
