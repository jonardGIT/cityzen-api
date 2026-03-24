
import request from 'supertest';
import app, { API_V1 } from '../app.js';
import { getAdminToken } from './helpers/auth.js';
import prisma from '../lib/prisma.js';

const BASE = `${API_V1}/responders`;

let adminToken = '';
const validAgencyId = '00000000-0000-0000-0000-000000000001';


beforeAll(async () => {
  adminToken = await getAdminToken();
  // Ensure the agency exists for responder creation tests
  await prisma.agency.upsert({
    where: { id: validAgencyId },
    update: {},
    create: {
      id: validAgencyId,
      name: 'Quezon City Fire District',
      contactNumber: '+63-2-8928-8363',
    },
  });
});

describe(`GET ${BASE}`, () => {
  it('should return 200 with an array of responders', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe(`GET ${BASE}/:id`, () => {

  it('should return 200 for a valid id', async () => {
    // Use a real UUID from seed-data.sql
    const validResponderId = '00000000-0000-0000-0000-000000006001';
    const res = await request(app).get(`${BASE}/${validResponderId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', validResponderId);
    expect(res.body).toHaveProperty('agency.id');
  });


  it('should return 400 for an invalid id format', async () => {
    const res = await request(app).get(`${BASE}/not-a-real-uuid`);
    expect(res.status).toBe(400);
  });

  it('should return 404 for a non-existent id', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000006099';
    const res = await request(app).get(`${BASE}/${nonExistentId}`);
    expect(res.status).toBe(404);
  });
});

describe(`POST ${BASE}`, () => {

  it('should create a responder and return 201', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      name: 'Responder A',
      agencyId: validAgencyId,
      role: 'Medic',
      contactInfo: 'responder@gov.com',
    });
    if (res.status !== 201) {
      // Log the response body for debugging
      // eslint-disable-next-line no-console
      console.error('Responder creation failed:', res.body);
    }
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Responder A' });
    expect(res.body).toHaveProperty('agencyId', validAgencyId);
  });


  it('should return 400 when agencyId is not a valid UUID', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      name: 'Responder A',
      agencyId: 'not-a-real-uuid',
      role: 'Medic',
      contactInfo: 'responder@gov.com',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('agencyId');
  });

  it('should return 422 when agencyId does not reference a valid Agency', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      name: 'Responder A',
      agencyId: '00000000-0000-0000-0000-000000000099', // valid UUID, not in DB
      role: 'Medic',
      contactInfo: 'responder@gov.com',
    });
    expect(res.status).toBe(422);
    expect(res.body.message).toContain('agencyId');
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Incomplete' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });
});
