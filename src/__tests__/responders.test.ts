import request from 'supertest';
import prisma from '../lib/prisma.js';
import app, { API_V1 } from '../app.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';

const BASE = `${API_V1}/responders`;

let adminToken = '';
let dispatcherToken = '';
let validAgencyId = '';

async function ensureRoxasMunicipalityScope() {
  const region = await prisma.region.upsert({
    where: { code: '020000000' },
    update: { name: 'Cagayan Valley', designation: 'Region II', archivedAt: null },
    create: { code: '020000000', name: 'Cagayan Valley', designation: 'Region II' },
  });

  const province = await prisma.province.upsert({
    where: { code: '023100000' },
    update: { name: 'Isabela', regionId: region.id, archivedAt: null },
    create: { code: '023100000', name: 'Isabela', regionId: region.id },
  });

  return prisma.cityMunicipality.upsert({
    where: { code: '023101000' },
    update: { name: 'Ilagan City', type: 'CITY', provinceId: province.id, archivedAt: null },
    create: { code: '023101000', name: 'Ilagan City', type: 'CITY', provinceId: province.id },
  });
}

async function createAgency() {
  const city = await ensureRoxasMunicipalityScope();
  const response = await request(app)
    .post(`${API_V1}/agencies`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Responder Test Agency ${Date.now()}-${Math.random()}`,
      contactNumber: '09171234567',
      jurisdictionType: 'city',
      jurisdictionId: city.id,
      cityMunicipalityId: city.id,
    });

  expect(response.status).toBe(201);
  return response.body.id as string;
}

async function createResponder(
  overrides: Partial<Record<'name' | 'agencyId' | 'role' | 'contactInfo', string>> = {},
) {
  const response = await request(app)
    .post(BASE)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: overrides.name ?? `Responder ${Date.now()}-${Math.random()}`,
      agencyId: overrides.agencyId ?? validAgencyId,
      role: overrides.role ?? 'Medic',
      contactInfo: overrides.contactInfo ?? `responder.${Date.now()}-${Math.random()}@gov.com`,
    });

  expect(response.status).toBe(201);
  return response.body.id as string;
}

beforeAll(async () => {
  const city = await ensureRoxasMunicipalityScope();
  await prisma.user.updateMany({
    where: { email: 'dispatcher@xypes.local' },
    data: { jurisdictionType: 'city', jurisdictionId: city.id },
  });

  adminToken = await getAdminToken();
  dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
  validAgencyId = await createAgency();
});

describe(`GET ${BASE}`, () => {
  it('should return 200 with an array of responders', async () => {
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  it('should return 403 for VIEWER role', async () => {
    const viewerToken = await getTokenForRole('analyst@xypes.local');
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  it('should return 403 when trying to assign a responder to an out-of-scope agency', async () => {
    const outOfScopeAgencyRes = await request(app)
      .post(`${API_V1}/agencies`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Responder OutOfScope Agency ${Date.now()}-${Math.random()}`,
        contactNumber: '09179999999',
      });

    expect(outOfScopeAgencyRes.status).toBe(201);

    const cityAdminToken = await getTokenForRole('ops.lead@xypes.local');
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${cityAdminToken}`)
      .send({
        name: 'Out Of Scope Responder',
        agencyId: outOfScopeAgencyRes.body.id,
        role: 'Medic',
        contactInfo: 'out-of-scope@gov.com',
      });

    expect(res.status).toBe(403);
  });
});

describe(`GET ${BASE}/:id`, () => {
  let validResponderId = '';

  beforeAll(async () => {
    validResponderId = await createResponder();
  });

  it('should return 200 for a valid id', async () => {
    const res = await request(app)
      .get(`${BASE}/${validResponderId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', validResponderId);
    expect(res.body).toHaveProperty('agency.id');
  });

  it('should return 400 for an invalid id format', async () => {
    const res = await request(app)
      .get(`${BASE}/not-a-real-uuid`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(400);
  });

  it('should return 404 for a non-existent id', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000006099';
    const res = await request(app)
      .get(`${BASE}/${nonExistentId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
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

  it('should return 401 without auth token', async () => {
    const res = await request(app).post(BASE).send({
      name: 'No Auth',
      agencyId: validAgencyId,
      role: 'Medic',
      contactInfo: 'no-auth@gov.com',
    });
    expect(res.status).toBe(401);
  });

  it('should return 403 for VIEWER role', async () => {
    const viewerToken = await getTokenForRole('analyst@xypes.local');
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${viewerToken}`).send({
      name: 'Viewer Create',
      agencyId: validAgencyId,
      role: 'Medic',
      contactInfo: 'viewer@gov.com',
    });
    expect(res.status).toBe(403);
  });
});

describe(`PATCH ${BASE}/:id`, () => {
  let testResponderId = '';

  beforeAll(async () => {
    testResponderId = await createResponder({
      name: 'PatchTarget',
      contactInfo: 'patch-target@gov.com',
    });
  });

  it('should update name and return 200', async () => {
    const res = await request(app)
      .patch(`${BASE}/${testResponderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Responder' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Updated Responder');
  });

  it('should return 404 for non-existent id', async () => {
    const res = await request(app)
      .patch(`${BASE}/00000000-0000-0000-0000-000000000099`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).patch(`${BASE}/${testResponderId}`).send({ name: 'No Auth' });
    expect(res.status).toBe(401);
  });
});

describe(`DELETE ${BASE}/:id`, () => {
  let deleteTargetId = '';

  beforeAll(async () => {
    deleteTargetId = await createResponder({
      name: 'DeleteTarget',
      contactInfo: 'delete-target@gov.com',
    });
  });

  it('should delete and return 204', async () => {
    const res = await request(app)
      .delete(`${BASE}/${deleteTargetId}`)
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
    const res = await request(app).delete(`${BASE}/${deleteTargetId}`);
    expect(res.status).toBe(401);
  });
});

describe(`GET ${BASE} ?include=`, () => {
  let responderId = '';

  beforeAll(async () => {
    responderId = await createResponder();
  });

  it('should include agency by default (no ?include= param)', async () => {
    const res = await request(app)
      .get(`${BASE}/${responderId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('agency');
    expect(res.body.agency).toHaveProperty('id', validAgencyId);
  });

  it('should include only requested relations via ?include=', async () => {
    const res = await request(app)
      .get(`${BASE}/${responderId}?include=assignments`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('assignments');
    expect(Array.isArray(res.body.assignments)).toBe(true);
    expect(res.body).not.toHaveProperty('agency');
  });

  it('should support multiple includes via comma-separated list', async () => {
    const res = await request(app)
      .get(`${BASE}/${responderId}?include=agency,assignments`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('agency');
    expect(res.body).toHaveProperty('assignments');
  });

  it('should return 400 for invalid include relation', async () => {
    const res = await request(app)
      .get(`${BASE}/${responderId}?include=nonexistent`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid include');
    expect(res.body.message).toContain('nonexistent');
    expect(res.body.message).toContain('Allowed top-level relations');
  });

  it('should work on list endpoint with ?include=', async () => {
    const res = await request(app)
      .get(`${BASE}?include=agency`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('agency');
    }
  });
});
