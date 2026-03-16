import request from 'supertest';
import app, { API_V1 } from '../app.js';

const BASE = `${API_V1}/incidents`;

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
  it('should create and return 201 with valid referenced ids', async () => {
    const res = await request(app).post(BASE).send({
      description: 'Test incident',
      statusId: 1,
      citizenId: 1,
      locationId: 1,
      categoryId: 1,
      severityId: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ description: 'Test incident' });
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app).post(BASE).send({ description: 'Missing ids' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 400 for invalid foreign key reference', async () => {
    const res = await request(app).post(BASE).send({
      description: 'Bad ref',
      statusId: 9999,
      citizenId: 1,
      locationId: 1,
      categoryId: 1,
      severityId: 1,
    });
    expect(res.status).toBe(400);
  });
});
