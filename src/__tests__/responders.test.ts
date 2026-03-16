import request from 'supertest';
import app, { API_V1 } from '../app.js';

const BASE = `${API_V1}/responders`;

describe(`GET ${BASE}`, () => {
  it('should return 200 with an array of responders', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe(`GET ${BASE}/:id`, () => {
  it('should return 200 for a valid id', async () => {
    const res = await request(app).get(`${BASE}/1`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('should return 404 for a non-existent id', async () => {
    const res = await request(app).get(`${BASE}/9999`);
    expect(res.status).toBe(404);
  });
});

describe(`POST ${BASE}`, () => {
  it('should create a responder and return 201', async () => {
    const res = await request(app).post(BASE).send({
      name: 'Responder A',
      agency: 'Fire Dept',
      role: 'Medic',
      contactInfo: 'responder@gov.com',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Responder A' });
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app).post(BASE).send({ name: 'Incomplete' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });
});
