import request from 'supertest';
import app, { API_V1 } from '../app.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';
import { isArchiveEnabled } from '../utils/archive.js';
import prisma from '../lib/prisma.js';

const BASE = `${API_V1}/agencies`;
let adminToken = '';
let dispatcherToken = '';
const archiveEnabled = isArchiveEnabled();

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

async function createScopedAgency(name: string) {
  const city = await ensureRoxasMunicipalityScope();
  const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
    name,
    jurisdictionType: 'city',
    jurisdictionId: city.id,
    cityMunicipalityId: city.id,
  });

  expect(res.status).toBe(201);
  return res.body.id as string;
}

beforeAll(async () => {
  const city = await ensureRoxasMunicipalityScope();
  await prisma.user.updateMany({
    where: { email: 'dispatcher@xypes.local' },
    data: { jurisdictionType: 'city', jurisdictionId: city.id },
  });

  adminToken = await getAdminToken();
  dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
});

describe(`GET ${BASE}`, () => {
  it('should return 200 with array', async () => {
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should include contactNumber field in response', async () => {
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('contactNumber');
    }
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

describe(`GET ${BASE}/:id`, () => {
  let createdId: string;

  beforeAll(async () => {
    // Create an agency to get a valid UUID
    createdId = await createScopedAgency(`TestAgency-${Date.now()}`);
  });

  it('should return 200 for valid id', async () => {
    const res = await request(app)
      .get(`${BASE}/${createdId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdId);
  });

  it('should include contactNumber field', async () => {
    const res = await request(app)
      .get(`${BASE}/${createdId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('contactNumber');
  });

  it('should return 404 for unknown id', async () => {
    // Use a random UUID
    const unknownId = '11111111-1111-4111-8111-111111111111';
    const res = await request(app)
      .get(`${BASE}/${unknownId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(404);
  });

  it('should support nested includes via ?include=responders.agency', async () => {
    const responderRes = await request(app)
      .post(`${API_V1}/responders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `NestedResponder-${Date.now()}`,
        agencyId: createdId,
        role: 'Medic',
        contactInfo: `nested-${Date.now()}@gov.com`,
      });

    expect(responderRes.status).toBe(201);

    const res = await request(app)
      .get(`${BASE}/${createdId}?include=responders.agency`)
      .set('Authorization', `Bearer ${dispatcherToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.responders)).toBe(true);
    expect(res.body.responders.length).toBeGreaterThan(0);
    expect(res.body.responders[0]).toHaveProperty('agency.id', createdId);
  });

  it('should reject invalid nested includes', async () => {
    const res = await request(app)
      .get(`${BASE}/${createdId}?include=responders.invalidRelation`)
      .set('Authorization', `Bearer ${dispatcherToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid include');
    expect(res.body.message).toContain('responders.invalidRelation');
  });

  it('should exclude archived responders from included child collections', async () => {
    const activeResponderRes = await request(app)
      .post(`${API_V1}/responders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `VisibleResponder-${Date.now()}`,
        agencyId: createdId,
        role: 'Medic',
        contactInfo: `visible-${Date.now()}@gov.com`,
      });

    expect(activeResponderRes.status).toBe(201);

    const archivedResponderRes = await request(app)
      .post(`${API_V1}/responders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `ArchivedResponder-${Date.now()}`,
        agencyId: createdId,
        role: 'Medic',
        contactInfo: `archived-${Date.now()}@gov.com`,
      });

    expect(archivedResponderRes.status).toBe(201);

    const deleteRes = await request(app)
      .delete(`${API_V1}/responders/${archivedResponderRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(204);

    const res = await request(app)
      .get(`${BASE}/${createdId}?include=responders`)
      .set('Authorization', `Bearer ${dispatcherToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.responders)).toBe(true);
    expect(
      res.body.responders.some(
        (responder: { id: string }) => responder.id === activeResponderRes.body.id,
      ),
    ).toBe(true);
    expect(
      res.body.responders.some(
        (responder: { id: string }) => responder.id === archivedResponderRes.body.id,
      ),
    ).toBe(false);
  });
});

describe(`POST ${BASE}`, () => {
  it('should create and return 201', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Agency-${Date.now()}`,
        jurisdictionType: 'city',
        jurisdictionId: (await ensureRoxasMunicipalityScope()).id,
        cityMunicipalityId: (await ensureRoxasMunicipalityScope()).id,
      });
    expect(res.status).toBe(201);
    expect(res.body.name).toContain('Agency-');
  });

  it('should create with contactNumber and return 201', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Agency-${Date.now()}`,
        contactNumber: '+1-555-0100',
        jurisdictionType: 'city',
        jurisdictionId: (await ensureRoxasMunicipalityScope()).id,
        cityMunicipalityId: (await ensureRoxasMunicipalityScope()).id,
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('contactNumber', '+1-555-0100');
  });

  it('should reject contactNumber exceeding 20 characters', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Agency-${Date.now()}`,
        contactNumber: '+1-555-01001234567890extra',
        jurisdictionType: 'city',
        jurisdictionId: (await ensureRoxasMunicipalityScope()).id,
        cityMunicipalityId: (await ensureRoxasMunicipalityScope()).id,
      });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 422 when name is missing', async () => {
    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });
});

describe(`PATCH ${BASE}/:id`, () => {
  let testAgencyId = '';

  beforeAll(async () => {
    testAgencyId = await createScopedAgency(`TestAgency-${Date.now()}`);
  });

  it('should update contactNumber', async () => {
    const res = await request(app)
      .patch(`${BASE}/${testAgencyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `TestAgency-${Date.now()}`, contactNumber: '+1-555-0199' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('contactNumber', '+1-555-0199');
  });

  it('should clear contactNumber when set to null', async () => {
    const res = await request(app)
      .patch(`${BASE}/${testAgencyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `TestAgency-${Date.now()}`, contactNumber: null });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('contactNumber', null);
  });

  it('should reject contactNumber exceeding 20 characters', async () => {
    const res = await request(app)
      .patch(`${BASE}/${testAgencyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ contactNumber: '+1-555-01001234567890extra' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 404 for non-existent id', async () => {
    const res = await request(app)
      .patch(`${BASE}/00000000-0000-0000-0000-000000000099`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).patch(`${BASE}/${testAgencyId}`).send({ name: 'NoAuth' });
    expect(res.status).toBe(401);
  });
});

describe(`POST ${BASE} (auth)`, () => {
  it('should return 401 without auth token', async () => {
    const res = await request(app).post(BASE).send({ name: 'NoAuth' });
    expect(res.status).toBe(401);
  });

  it('should return 403 for VIEWER role', async () => {
    const viewerToken = await getTokenForRole('analyst@xypes.local');
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'ViewerCreate' });
    expect(res.status).toBe(403);
  });

  it('should hide out-of-scope agencies from city-scoped dispatcher reads', async () => {
    const outOfScopeAgencyRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `OutOfScopeAgency-${Date.now()}` });

    expect(outOfScopeAgencyRes.status).toBe(201);

    const res = await request(app)
      .get(`${BASE}/${outOfScopeAgencyRes.body.id}`)
      .set('Authorization', `Bearer ${dispatcherToken}`);

    expect(res.status).toBe(404);
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

describe(`DELETE ${BASE}/:id`, () => {
  let deleteId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `DeleteAgency-${Date.now()}` });
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

describe(`POST ${BASE}/:id/restore`, () => {
  let archivedId: string;

  beforeAll(async () => {
    archivedId = await createScopedAgency(`RestoreAgency-${Date.now()}`);

    const deleteRes = await request(app)
      .delete(`${BASE}/${archivedId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(204);
  });

  it('should restore an archived agency and return 200', async () => {
    const res = await request(app)
      .post(`${BASE}/${archivedId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (!archiveEnabled) {
      expect(res.status).toBe(404);
      return;
    }

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', archivedId);

    const fetchRes = await request(app)
      .get(`${BASE}/${archivedId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`);

    expect(fetchRes.status).toBe(200);
  });
});

describe(`GET ${BASE} (archive scope)`, () => {
  let activeId = '';
  let archivedId = '';

  beforeAll(async () => {
    activeId = await createScopedAgency(`ArchiveScopeActive-${Date.now()}`);
    archivedId = await createScopedAgency(`ArchiveScopeArchived-${Date.now()}`);

    const deleteRes = await request(app)
      .delete(`${BASE}/${archivedId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(204);
  });

  it('should include archived rows when includeArchived=true', async () => {
    const res = await request(app)
      .get(`${BASE}?includeArchived=true`)
      .set('Authorization', `Bearer ${dispatcherToken}`);

    const agencyIds = res.body.map((agency: { id: string }) => agency.id);

    expect(res.status).toBe(200);

    if (!archiveEnabled) {
      expect(agencyIds).toContain(activeId);
      expect(agencyIds).not.toContain(archivedId);
      return;
    }

    expect(agencyIds).toEqual(expect.arrayContaining([activeId, archivedId]));
  });

  it('should return only archived rows when archivedOnly=true', async () => {
    const res = await request(app)
      .get(`${BASE}?archivedOnly=true`)
      .set('Authorization', `Bearer ${dispatcherToken}`);

    const agencyIds = res.body.map((agency: { id: string }) => agency.id);

    expect(res.status).toBe(200);

    if (!archiveEnabled) {
      expect(agencyIds).toContain(activeId);
      expect(agencyIds).not.toContain(archivedId);
      return;
    }

    expect(agencyIds).toContain(archivedId);
    expect(agencyIds).not.toContain(activeId);
  });
});
