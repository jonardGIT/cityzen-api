import request from 'supertest';
import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';
import {
  AMBIGUOUS_LINKED_CITIZEN_MESSAGE,
  MANUAL_LINK_REQUIRED_LINKED_CITIZEN_MESSAGE,
} from '../services/userCitizenLinkService.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';

const BASE = `${API_V1}/citizens`;
let adminToken = '';

beforeAll(async () => {
  adminToken = await getAdminToken();
});

describe(`GET ${BASE}`, () => {
  it('should return 200 with an array of citizens', async () => {
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

describe(`GET ${BASE}/:id`, () => {
  let createdId: string;

  beforeAll(async () => {
    // Create a citizen to get a valid UUID
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Test User ${Date.now()}`,
        contactInfo: `test${Date.now()}@mail.com`,
        preferredChannel: 'Email',
      });
    createdId = res.body.id;
  });

  it('should return 200 with the citizen for a valid id', async () => {
    const res = await request(app)
      .get(`${BASE}/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdId);
  });

  it('should return 404 for a non-existent id', async () => {
    // Use a random UUID
    const unknownId = '11111111-1111-4111-8111-111111111111';
    const res = await request(app)
      .get(`${BASE}/${unknownId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).get(`${BASE}/${createdId}`);
    expect(res.status).toBe(401);
  });
});

describe(`POST ${BASE}`, () => {
  it('should create a citizen and return 201', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      name: 'Test User',
      contactInfo: 'test@example.com',
      preferredChannel: 'Email',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Test User' });
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Incomplete' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).post(BASE).send({
      name: 'Test User',
      contactInfo: 'test@example.com',
      preferredChannel: 'Email',
    });
    expect(res.status).toBe(401);
  });
});

describe(`GET ${BASE} (pagination)`, () => {
  it('should return paginated result when page and pageSize are provided', async () => {
    const res = await request(app)
      .get(`${BASE}?page=1&pageSize=2`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({ page: 1, pageSize: 2 });
    expect(typeof res.body.pagination.total).toBe('number');
    expect(res.body.data.length).toBeLessThanOrEqual(2);
  });

  it('should return 422 for disallowed sortBy', async () => {
    const res = await request(app)
      .get(`${BASE}?sortBy=passwordHash`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(422);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('should support combined search, filter, and sort', async () => {
    const filters = JSON.stringify([
      { field: 'preferredChannel', operator: 'equals', value: 'Email' },
    ]);
    const res = await request(app)
      .get(
        `${BASE}?search=Test&sortBy=name&sortOrder=asc&filters=${encodeURIComponent(filters)}&page=1&pageSize=5`,
      )
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe(`PATCH ${BASE}/:id`, () => {
  let testId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `PatchCitizen-${Date.now()}`,
        contactInfo: `patch${Date.now()}@mail.com`,
        preferredChannel: 'Email',
      });
    testId = res.body.id;
  });

  it('should update and return 200', async () => {
    const res = await request(app)
      .patch(`${BASE}/${testId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Citizen' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', testId);
    expect(res.body).toHaveProperty('name', 'Updated Citizen');
  });

  it('should return 404 for non-existent id', async () => {
    const res = await request(app)
      .patch(`${BASE}/00000000-0000-0000-0000-000000000099`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).patch(`${BASE}/${testId}`).send({ name: 'NoAuth' });
    expect(res.status).toBe(401);
  });

  it('should return 403 for VIEWER role', async () => {
    const viewerToken = await getTokenForRole('analyst@xypes.local');
    const res = await request(app)
      .patch(`${BASE}/${testId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'ViewerPatch' });
    expect(res.status).toBe(403);
  });
});

describe(`DELETE ${BASE}/:id`, () => {
  let deleteId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `DeleteCitizen-${Date.now()}`,
        contactInfo: `del${Date.now()}@mail.com`,
        preferredChannel: 'SMS',
      });
    deleteId = res.body.id;
  });

  it('should delete and return 204', async () => {
    const res = await request(app)
      .delete(`${BASE}/${deleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  it('should return 404 for non-existent id', async () => {
    const res = await request(app)
      .delete(`${BASE}/00000000-0000-0000-0000-000000000099`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).delete(`${BASE}/${deleteId}`);
    expect(res.status).toBe(401);
  });
});

describe(`POST ${BASE}/link-me`, () => {
  it('should fail closed when multiple active citizens share the authenticated email', async () => {
    const unique = `${Date.now()}-${Math.random()}`;
    const email = `duplicate-link-${unique}@postman.local`;

    const registerRes = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: `Duplicate Link ${unique}`,
        email,
        password: 'Password123!',
      });

    expect(registerRes.status).toBe(201);

    const token = registerRes.body.token as string;

    const firstCitizen = await prisma.citizen.create({
      data: {
        name: `Duplicate Citizen A ${unique}`,
        contactInfo: email,
        preferredChannel: 'sms',
      },
    });

    const secondCitizen = await prisma.citizen.create({
      data: {
        name: `Duplicate Citizen B ${unique}`,
        contactInfo: email,
        preferredChannel: 'email',
      },
    });

    const linkRes = await request(app)
      .post(`${BASE}/link-me`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Should Not Link', preferredChannel: 'app' });

    expect(linkRes.status).toBe(409);
    expect(linkRes.body).toMatchObject({
      message: AMBIGUOUS_LINKED_CITIZEN_MESSAGE,
    });

    const citizens = await prisma.citizen.findMany({
      where: { id: { in: [firstCitizen.id, secondCitizen.id] } },
      orderBy: { createdAt: 'asc' },
    });

    expect(citizens).toHaveLength(2);
    expect(citizens[0]).toMatchObject({
      id: firstCitizen.id,
      name: firstCitizen.name,
      preferredChannel: firstCitizen.preferredChannel,
    });
    expect(citizens[1]).toMatchObject({
      id: secondCitizen.id,
      name: secondCitizen.name,
      preferredChannel: secondCitizen.preferredChannel,
    });
  });

  it('should require manual support linking when exactly one legacy citizen matches the authenticated account', async () => {
    const unique = `${Date.now()}-${Math.random()}`;
    const email = `legacy-link-${unique}@postman.local`;

    const registerRes = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: `Legacy Link ${unique}`,
        email,
        password: 'Password123!',
      });

    expect(registerRes.status).toBe(201);

    const token = registerRes.body.token as string;

    const legacyCitizen = await prisma.citizen.create({
      data: {
        name: `Legacy Citizen ${unique}`,
        contactInfo: email,
        preferredChannel: 'sms',
      },
    });

    const linkRes = await request(app)
      .post(`${BASE}/link-me`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Should Not Create Duplicate', preferredChannel: 'app' });

    expect(linkRes.status).toBe(409);
    expect(linkRes.body).toEqual({
      message: MANUAL_LINK_REQUIRED_LINKED_CITIZEN_MESSAGE,
    });

    const reporter = await prisma.user.findUniqueOrThrow({
      where: { email },
      select: { citizenId: true },
    });

    expect(reporter.citizenId).toBeNull();

    const matchedCitizens = await prisma.citizen.findMany({
      where: { contactInfo: email },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        preferredChannel: true,
      },
    });

    expect(matchedCitizens).toEqual([
      {
        id: legacyCitizen.id,
        name: legacyCitizen.name,
        preferredChannel: legacyCitizen.preferredChannel,
      },
    ]);
  });
});
