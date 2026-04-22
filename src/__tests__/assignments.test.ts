import request from 'supertest';
import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';
import {
  buildIncidentLocationSnapshot,
  createCitizen,
  createCategory,
  createSeverity,
  createAgency,
  createResponder,
  getStatusId,
} from './helpers/factories.js';

jest.setTimeout(120000);

const BASE = `${API_V1}/assignments`;
let adminToken = '';
let dispatcherToken = '';
let cityAdminToken = '';
let tuguegaraoCityAdminToken = '';
let ilaganCityId = '';
let tuguegaraoCityId = '';
let ilaganBarangayName = '';
let tuguegaraoBarangayName = '';

beforeAll(async () => {
  adminToken = await getAdminToken();
  dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
  cityAdminToken = await getTokenForRole('ops.lead@xypes.local');
  tuguegaraoCityAdminToken = await getTokenForRole('tuguegarao.city.admin@xypes.local');

  const [ilaganCity, tuguegaraoCity, ilaganBarangay, tuguegaraoBarangay] = await Promise.all([
    prisma.cityMunicipality.findFirst({
      where: { name: 'Ilagan City', archivedAt: null },
      select: { id: true },
    }),
    prisma.cityMunicipality.findFirst({
      where: { name: 'Tuguegarao City', archivedAt: null },
      select: { id: true },
    }),
    prisma.barangay.findFirst({
      where: {
        archivedAt: null,
        cityMunicipality: { name: 'Ilagan City', archivedAt: null },
      },
      select: { name: true },
    }),
    prisma.barangay.findFirst({
      where: {
        archivedAt: null,
        cityMunicipality: { name: 'Tuguegarao City', archivedAt: null },
      },
      select: { name: true },
    }),
  ]);

  expect(ilaganCity).not.toBeNull();
  expect(tuguegaraoCity).not.toBeNull();
  expect(ilaganBarangay).not.toBeNull();
  expect(tuguegaraoBarangay).not.toBeNull();

  ilaganCityId = ilaganCity!.id;
  tuguegaraoCityId = tuguegaraoCity!.id;
  ilaganBarangayName = ilaganBarangay!.name;
  tuguegaraoBarangayName = tuguegaraoBarangay!.name;
});

beforeEach(async () => {
  await prisma.user.update({
    where: { email: 'dispatcher@xypes.local' },
    data: { jurisdictionType: 'city', jurisdictionId: ilaganCityId, archivedAt: null },
  });

  await prisma.user.update({
    where: { email: 'ops.lead@xypes.local' },
    data: { jurisdictionType: 'city', jurisdictionId: ilaganCityId, archivedAt: null },
  });

  await prisma.user.update({
    where: { email: 'tuguegarao.city.admin@xypes.local' },
    data: { jurisdictionType: 'city', jurisdictionId: tuguegaraoCityId, archivedAt: null },
  });
});

function buildIlaganIncidentLocationSnapshot() {
  return {
    ...buildIncidentLocationSnapshot(),
    cityName: 'Ilagan City',
    provinceName: 'Isabela',
    barangay: ilaganBarangayName,
  };
}

function buildTuguegaraoIncidentLocationSnapshot() {
  return {
    ...buildIncidentLocationSnapshot(),
    cityName: 'Tuguegarao City',
    provinceName: 'Cagayan',
    barangay: tuguegaraoBarangayName,
  };
}

describe(`GET ${BASE}`, () => {
  it('should return 200 with array', async () => {
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
});

// Move these to outer scope for use in POST tests
let incidentId: string;
let responderId: string;

describe(`GET ${BASE}/:id`, () => {
  let createdId: string;

  beforeAll(async () => {
    const statusId = await getStatusId(adminToken);
    const citizenId = await createCitizen(adminToken);
    const categoryId = await createCategory(adminToken);
    const severityId = await createSeverity(adminToken);

    const incidentRes = await request(app)
      .post(`${API_V1}/incidents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Test assignment incident',
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIlaganIncidentLocationSnapshot(),
      });
    incidentId = incidentRes.body.id;

    const agencyId = await createAgency(adminToken);
    responderId = await createResponder(adminToken, agencyId);

    // Assignment
    const assignmentRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ incidentId, responderId });
    createdId = assignmentRes.body.id;
  });

  it('should return 200 for valid id', async () => {
    const res = await request(app)
      .get(`${BASE}/${createdId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdId);
  });

  it('should return 404 for unknown id', async () => {
    // Use a random UUID
    const unknownId = '11111111-1111-4111-8111-111111111111';
    const res = await request(app)
      .get(`${BASE}/${unknownId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(404);
  });

  it('should return 400 for invalid id format', async () => {
    const res = await request(app)
      .get(`${BASE}/not-a-real-uuid`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(400);
  });
});

describe(`POST ${BASE}`, () => {
  it('should create and return 201', async () => {
    // Use the ids created in beforeAll
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      incidentId,
      responderId,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ incidentId, responderId });
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 400 for invalid foreign key reference', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      incidentId: 'not-a-real-uuid',
      responderId: 'uuid-responder-1',
    });
    expect(res.status).toBe(400);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).post(BASE).send({
      incidentId,
      responderId,
    });
    expect(res.status).toBe(401);
  });

  it('should return 403 for VIEWER role', async () => {
    const viewerToken = await getTokenForRole('analyst@xypes.local');
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ incidentId, responderId });
    expect(res.status).toBe(403);
  });

  it('should return 403 when a dispatcher assigns across city scope', async () => {
    const statusId = await getStatusId(tuguegaraoCityAdminToken);
    const citizenId = await createCitizen(adminToken);
    const categoryId = await createCategory(adminToken);
    const severityId = await createSeverity(adminToken);

    const incidentRes = await request(app)
      .post(`${API_V1}/incidents`)
      .set('Authorization', `Bearer ${tuguegaraoCityAdminToken}`)
      .send({
        description: 'Out of scope assignment incident',
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildTuguegaraoIncidentLocationSnapshot(),
      });

    expect(incidentRes.status).toBe(201);

    const agencyId = await createAgency(adminToken);
    await prisma.agency.update({
      where: { id: agencyId },
      data: {
        cityMunicipalityId: tuguegaraoCityId,
        jurisdictionType: 'city',
        jurisdictionId: tuguegaraoCityId,
      },
    });
    const scopedResponderId = await createResponder(adminToken, agencyId);

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({ incidentId: incidentRes.body.id, responderId: scopedResponderId });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('outside your allowed scope');
  });
});

describe(`GET ${BASE} (pagination)`, () => {
  it('should return paginated result when page and pageSize are provided', async () => {
    const res = await request(app)
      .get(`${BASE}?page=1&pageSize=2`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({ page: 1, pageSize: 2 });
    expect(typeof res.body.pagination.total).toBe('number');
    expect(res.body.data.length).toBeLessThanOrEqual(2);
  });
});

describe(`PATCH ${BASE}/:id`, () => {
  let patchId: string;

  beforeAll(async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      incidentId,
      responderId,
    });
    patchId = res.body.id;
  });

  it('should update notes and return 200', async () => {
    const res = await request(app)
      .patch(`${BASE}/${patchId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Updated notes', outcome: 'Resolved' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', patchId);
    expect(res.body).toHaveProperty('notes', 'Updated notes');
    expect(res.body).toHaveProperty('outcome', 'Resolved');
  });

  it('should return 404 for non-existent id', async () => {
    const res = await request(app)
      .patch(`${BASE}/00000000-0000-4000-8000-000000000099`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Ghost' });
    expect(res.status).toBe(404);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).patch(`${BASE}/${patchId}`).send({ notes: 'NoAuth' });
    expect(res.status).toBe(401);
  });

  it('should return 404 when updating an out-of-scope assignment', async () => {
    const statusId = await getStatusId(tuguegaraoCityAdminToken);
    const citizenId = await createCitizen(adminToken);
    const categoryId = await createCategory(adminToken);
    const severityId = await createSeverity(adminToken);

    const incidentRes = await request(app)
      .post(`${API_V1}/incidents`)
      .set('Authorization', `Bearer ${tuguegaraoCityAdminToken}`)
      .send({
        description: 'Out of scope assignment update incident',
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildTuguegaraoIncidentLocationSnapshot(),
      });

    expect(incidentRes.status).toBe(201);

    const agencyId = await createAgency(adminToken);
    await prisma.agency.update({
      where: { id: agencyId },
      data: {
        cityMunicipalityId: tuguegaraoCityId,
        jurisdictionType: 'city',
        jurisdictionId: tuguegaraoCityId,
      },
    });
    const scopedResponderId = await createResponder(adminToken, agencyId);

    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ incidentId: incidentRes.body.id, responderId: scopedResponderId });

    expect(createRes.status).toBe(201);

    const res = await request(app)
      .patch(`${BASE}/${createRes.body.id}`)
      .set('Authorization', `Bearer ${cityAdminToken}`)
      .send({ notes: 'Attempted cross-city update' });

    expect(res.status).toBe(404);
  });
});

describe(`DELETE ${BASE}/:id`, () => {
  let deleteId: string;

  beforeAll(async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      incidentId,
      responderId,
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
      .delete(`${BASE}/00000000-0000-4000-8000-000000000099`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).delete(`${BASE}/${deleteId}`);
    expect(res.status).toBe(401);
  });
});
