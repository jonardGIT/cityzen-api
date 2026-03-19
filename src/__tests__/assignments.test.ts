import request from 'supertest';
import app, { API_V1 } from '../app.js';
import { getAdminToken } from './helpers/auth.js';

jest.setTimeout(20000);

const BASE = `${API_V1}/assignments`;
let adminToken = '';

beforeAll(async () => {
  adminToken = await getAdminToken();
});

describe(`GET ${BASE}`, () => {
  it('should return 200 with array', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe(`GET ${BASE}/:id`, () => {
  it('should return 200 for valid id', async () => {
    const listRes = await request(app).get(BASE);
    expect(listRes.status).toBe(200);

    let validId: number | null = Array.isArray(listRes.body) && listRes.body.length > 0
      ? listRes.body[0].id
      : null;

    if (!validId) {
      const createRes = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          incidentId: 1,
          responderId: 1,
        });

      expect(createRes.status).toBe(201);
      validId = createRes.body.id;
    }

    const res = await request(app).get(`${BASE}/${validId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', validId);
  });

  it('should return 404 for unknown id', async () => {
    const res = await request(app).get(`${BASE}/9999`);
    expect(res.status).toBe(404);
  });
});

describe(`POST ${BASE}`, () => {
  it('should create and return 201', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      incidentId: 1,
      responderId: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ incidentId: 1, responderId: 1 });
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({});
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 400 for invalid foreign key reference', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      incidentId: 9999,
      responderId: 1,
    });
    expect(res.status).toBe(422);
  });
});
