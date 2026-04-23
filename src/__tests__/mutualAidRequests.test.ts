import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';

jest.setTimeout(120000);

const BASE = `${API_V1}/mutual-aid-requests`;
const INCIDENTS_BASE = `${API_V1}/incidents`;
const AUDIT_WAIT_ATTEMPTS = 40;
const AUDIT_WAIT_INTERVAL_MS = 25;

let adminToken = '';

beforeEach(async () => {
  await ensureTuguegaraoCityScope();
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForMutualAidAuditLog(input: {
  action: 'create' | 'update' | 'delete' | 'restore';
  targetId?: string;
  outcome?: 'success' | 'failure';
  statusCode?: number;
  path?: string;
}) {
  for (let attempt = 0; attempt < AUDIT_WAIT_ATTEMPTS; attempt += 1) {
    const auditWhere = {
      resource: 'mutual-aid-requests',
      action: input.action,
      ...(input.targetId ? { targetId: input.targetId } : {}),
      ...(input.outcome ? { outcome: input.outcome } : {}),
      ...(input.statusCode ? { statusCode: input.statusCode } : {}),
      ...(input.path ? { path: input.path } : {}),
    };

    const auditLog = await prisma.auditLog.findFirst({
      where: auditWhere,
      orderBy: { timestamp: 'desc' },
    });

    if (auditLog) {
      return auditLog;
    }

    await sleep(AUDIT_WAIT_INTERVAL_MS);
  }

  const targetSuffix = input.targetId ? ` on ${input.targetId}` : '';

  throw new Error(`Expected mutual aid audit log for ${input.action}${targetSuffix}`);
}

function buildTuguegaraoLocationSnapshot() {
  return {
    latitude: 17.6132,
    longitude: 121.7269,
    addressLine1: '1 Enrile Avenue',
    cityName: 'Tuguegarao City',
    provinceName: 'Cagayan',
    regionName: 'Cagayan Valley',
    barangay: 'Centro 10',
  };
}

async function ensureTuguegaraoCityScope() {
  const region = await prisma.region.upsert({
    where: { code: '020000000' },
    update: { name: 'Cagayan Valley', archivedAt: null },
    create: { code: '020000000', name: 'Cagayan Valley', designation: 'Region II' },
  });

  const province = await prisma.province.upsert({
    where: { code: '021500000' },
    update: { name: 'Cagayan', regionId: region.id, archivedAt: null },
    create: { code: '021500000', name: 'Cagayan', regionId: region.id },
  });

  const city = await prisma.cityMunicipality.upsert({
    where: { code: '021529000' },
    update: {
      name: 'Tuguegarao City',
      type: 'CITY',
      provinceId: province.id,
      archivedAt: null,
    },
    create: {
      code: '021529000',
      name: 'Tuguegarao City',
      type: 'CITY',
      provinceId: province.id,
    },
  });

  await prisma.user.updateMany({
    where: { email: { in: ['ops.lead@xypes.local', 'dispatcher@xypes.local'] } },
    data: {
      jurisdictionType: 'city',
      jurisdictionId: city.id,
    },
  });

  await prisma.user.updateMany({
    where: { email: 'provincial.admin@xypes.local' },
    data: {
      jurisdictionType: 'province',
      jurisdictionId: province.id,
    },
  });

  return { region, province, city };
}

async function ensurePartnerCityScope() {
  const { province } = await ensureTuguegaraoCityScope();

  const city = await prisma.cityMunicipality.upsert({
    where: { code: 'PH-021518' },
    update: {
      name: 'Penablanca',
      type: 'MUNICIPALITY',
      provinceId: province.id,
      archivedAt: null,
    },
    create: {
      code: 'PH-021518',
      name: 'Penablanca',
      type: 'MUNICIPALITY',
      provinceId: province.id,
    },
  });

  return { province, city };
}

async function ensureOutsiderCityScope() {
  const { province } = await ensureTuguegaraoCityScope();

  const city = await prisma.cityMunicipality.upsert({
    where: { code: 'PH-021519' },
    update: {
      name: 'Lal-lo',
      type: 'MUNICIPALITY',
      provinceId: province.id,
      archivedAt: null,
    },
    create: {
      code: 'PH-021519',
      name: 'Lal-lo',
      type: 'MUNICIPALITY',
      provinceId: province.id,
    },
  });

  return { province, city };
}

async function ensureExternalProvinceCityScope() {
  const region = await prisma.region.upsert({
    where: { code: '020000000' },
    update: { name: 'Cagayan Valley', archivedAt: null },
    create: { code: '020000000', name: 'Cagayan Valley', designation: 'Region II' },
  });

  const province = await prisma.province.upsert({
    where: { code: '023100000' },
    update: { name: 'Isabela', regionId: region.id, archivedAt: null },
    create: { code: '023100000', name: 'Isabela', regionId: region.id },
  });

  const city = await prisma.cityMunicipality.upsert({
    where: { code: '023101000' },
    update: {
      name: 'Ilagan City',
      type: 'CITY',
      provinceId: province.id,
      archivedAt: null,
    },
    create: {
      code: '023101000',
      name: 'Ilagan City',
      type: 'CITY',
      provinceId: province.id,
    },
  });

  return { province, city };
}

async function ensureScopedUserToken(input: {
  email: string;
  name: string;
  role: 'CITY_ADMIN' | 'DISPATCHER';
  jurisdictionType: 'city';
  jurisdictionId: string;
}): Promise<string> {
  const templateEmail =
    input.role === 'CITY_ADMIN' ? 'ops.lead@xypes.local' : 'dispatcher@xypes.local';
  const templateUser = await prisma.user.findUnique({
    where: { email: templateEmail },
    select: { passwordHash: true },
  });

  expect(templateUser?.passwordHash).toBeTruthy();

  await prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      role: input.role,
      passwordHash: templateUser!.passwordHash,
      jurisdictionType: input.jurisdictionType,
      jurisdictionId: input.jurisdictionId,
      archivedAt: null,
    },
    create: {
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash: templateUser!.passwordHash,
      jurisdictionType: input.jurisdictionType,
      jurisdictionId: input.jurisdictionId,
    },
  });

  return getTokenForRole(input.email);
}

async function getUserIdByEmail(email: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  expect(user?.id).toBeTruthy();
  return user!.id;
}

async function registerAndLinkCitizenReporter(uniqueLabel: string): Promise<string> {
  const unique = `${uniqueLabel}-${Date.now()}-${Math.random()}`;
  const email = `${unique}@postman.local`;

  const registerRes = await request(app)
    .post(`${API_V1}/auth/register`)
    .send({
      name: `Citizen Reporter ${unique}`,
      email,
      password: 'Password123!',
    });

  expect(registerRes.status).toBe(201);

  const token = registerRes.body.token as string;

  const linkRes = await request(app)
    .post(`${API_V1}/citizens/link-me`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: `Linked Citizen ${unique}`,
      preferredChannel: 'app',
    });

  expect([200, 201]).toContain(linkRes.status);

  return token;
}

async function createCategory(token: string): Promise<string> {
  const res = await request(app)
    .post(`${API_V1}/categories`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: `Mutual Aid Category ${Date.now()}-${Math.random()}` });

  expect(res.status).toBe(201);
  return res.body.id as string;
}

async function createSeverity(token: string): Promise<string> {
  const res = await request(app)
    .post(`${API_V1}/severities`)
    .set('Authorization', `Bearer ${token}`)
    .send({ level: `Mutual Aid Severity ${Date.now()}-${Math.random()}` });

  expect(res.status).toBe(201);
  return res.body.id as string;
}

async function createScopedIncident(label: string): Promise<{ incidentId: string }> {
  const reporterToken = await registerAndLinkCitizenReporter(label);
  const [categoryId, severityId] = await Promise.all([
    createCategory(adminToken),
    createSeverity(adminToken),
  ]);

  const reportRes = await request(app)
    .post(`${INCIDENTS_BASE}/report`)
    .set('Authorization', `Bearer ${reporterToken}`)
    .send({
      description: `Mutual aid incident ${label}`,
      categoryId,
      severityId,
      ...buildTuguegaraoLocationSnapshot(),
    });

  expect(reportRes.status).toBe(201);

  return { incidentId: reportRes.body.id as string };
}

async function createMutualAidRequest(input: {
  token: string;
  incidentId: string;
  targetJurisdictionId: string;
  notes?: string;
}) {
  return request(app)
    .post(BASE)
    .set('Authorization', `Bearer ${input.token}`)
    .send({
      incidentId: input.incidentId,
      targetJurisdictionId: input.targetJurisdictionId,
      ...(input.notes ? { notes: input.notes } : {}),
    });
}

beforeAll(async () => {
  adminToken = await getAdminToken();
});

describe(`POST ${BASE}`, () => {
  it.each([
    { label: 'city admin', email: 'ops.lead@xypes.local' },
    { label: 'dispatcher', email: 'dispatcher@xypes.local' },
  ])(
    'creates a requested workflow for $label with derived actor-owned fields',
    async ({ email }) => {
      const { city: requestingCity } = await ensureTuguegaraoCityScope();
      const { city: targetCity } = await ensurePartnerCityScope();
      const token = await getTokenForRole(email);
      const actorUserId = await getUserIdByEmail(email);
      const { incidentId } = await createScopedIncident(`create-${email}`);

      const res = await createMutualAidRequest({
        token,
        incidentId,
        targetJurisdictionId: targetCity.id,
        notes: 'Need neighboring city support',
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        incidentId,
        requestingJurisdictionId: requestingCity.id,
        requestingJurisdiction: {
          id: requestingCity.id,
          provinceId: requestingCity.provinceId,
        },
        targetJurisdictionId: targetCity.id,
        targetJurisdiction: {
          id: targetCity.id,
          provinceId: targetCity.provinceId,
        },
        requestedById: actorUserId,
        status: 'requested',
        notes: 'Need neighboring city support',
        incident: {
          id: incidentId,
        },
      });

      const persisted = await prisma.mutualAidRequest.findUnique({
        where: { id: res.body.id as string },
        include: { requestingJurisdiction: true, targetJurisdiction: true },
      });

      expect(persisted).toMatchObject({
        incidentId,
        requestingJurisdictionId: requestingCity.id,
        requestingJurisdiction: {
          id: requestingCity.id,
          provinceId: requestingCity.provinceId,
        },
        targetJurisdictionId: targetCity.id,
        targetJurisdiction: {
          id: targetCity.id,
          provinceId: targetCity.provinceId,
        },
        requestedById: actorUserId,
        status: 'requested',
      });
    },
  );

  it('rejects spoofed create fields owned by the server or actor scope', async () => {
    const { city: targetCity } = await ensurePartnerCityScope();
    const token = await getTokenForRole('dispatcher@xypes.local');
    const { incidentId } = await createScopedIncident('spoofed-create');

    const res = await request(app).post(BASE).set('Authorization', `Bearer ${token}`).send({
      incidentId,
      targetJurisdictionId: targetCity.id,
      notes: 'Try to spoof server fields',
      requestedById: '11111111-1111-4111-8111-111111111111',
      requestingJurisdictionId: '22222222-2222-4222-8222-222222222222',
      status: 'approved',
    });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ message: 'Validation failed' });
    expect(res.body.errors[0].message).toContain('Unexpected fields');
  });

  it('returns 409 when a requested workflow already exists for the same incident and target city', async () => {
    const { city: targetCity } = await ensurePartnerCityScope();
    const dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
    const cityAdminToken = await getTokenForRole('ops.lead@xypes.local');
    const { incidentId } = await createScopedIncident('duplicate-requested');

    const firstRes = await createMutualAidRequest({
      token: dispatcherToken,
      incidentId,
      targetJurisdictionId: targetCity.id,
    });

    expect(firstRes.status).toBe(201);

    const duplicateRes = await createMutualAidRequest({
      token: cityAdminToken,
      incidentId,
      targetJurisdictionId: targetCity.id,
    });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body).toMatchObject({
      message: 'A requested mutual aid workflow already exists for this incident and target city',
    });

    const duplicateCreateAudit = await waitForMutualAidAuditLog({
      action: 'create',
      outcome: 'failure',
      statusCode: 409,
      path: '/',
    });

    expect(duplicateCreateAudit).toMatchObject({
      resource: 'mutual-aid-requests',
      action: 'create',
      outcome: 'failure',
      statusCode: 409,
    });
  });

  it('returns 409 when the incident province does not match its bound active city relation province', async () => {
    const { city: targetCity } = await ensurePartnerCityScope();
    const { province: externalProvince } = await ensureExternalProvinceCityScope();
    const dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
    const { incidentId } = await createScopedIncident('malformed-incident-locality');

    await prisma.citizenIncident.update({
      where: { id: incidentId },
      data: { provinceId: externalProvince.id },
    });

    const res = await createMutualAidRequest({
      token: dispatcherToken,
      incidentId,
      targetJurisdictionId: targetCity.id,
      notes: 'Mutual aid should fail for malformed incident locality',
    });

    expect(res.status).toBe(409);

    const persistedRequests = await prisma.mutualAidRequest.findMany({
      where: { incidentId },
    });

    expect(persistedRequests).toHaveLength(0);

    const persistedIncident = await prisma.citizenIncident.findUniqueOrThrow({
      where: { id: incidentId },
      select: {
        cityMunicipalityId: true,
        provinceId: true,
        cityMunicipalityRef: { select: { provinceId: true } },
      },
    });

    expect(persistedIncident.provinceId).toBe(externalProvince.id);
    expect(persistedIncident.cityMunicipalityRef?.provinceId).toBe(targetCity.provinceId);
  });

  it.each(['approved', 'declined'] as const)(
    'returns 409 when the same incident and target city workflow is recreated after %s',
    async (terminalStatus) => {
      const { city: targetCity } = await ensurePartnerCityScope();
      const requesterToken = await getTokenForRole('dispatcher@xypes.local');
      const targetToken = await ensureScopedUserToken({
        email: `replay-${terminalStatus}.target@xypes.local`,
        name: `Replay ${terminalStatus} Target`,
        role: 'DISPATCHER',
        jurisdictionType: 'city',
        jurisdictionId: targetCity.id,
      });
      const { incidentId } = await createScopedIncident(`duplicate-${terminalStatus}`);

      const createRes = await createMutualAidRequest({
        token: requesterToken,
        incidentId,
        targetJurisdictionId: targetCity.id,
      });

      expect(createRes.status).toBe(201);

      const updateRes = await request(app)
        .patch(`${BASE}/${createRes.body.id as string}`)
        .set('Authorization', `Bearer ${targetToken}`)
        .send({ status: terminalStatus });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body).toMatchObject({ status: terminalStatus });

      const replayRes = await createMutualAidRequest({
        token: requesterToken,
        incidentId,
        targetJurisdictionId: targetCity.id,
      });

      expect(replayRes.status).toBe(409);
      expect(replayRes.body).toMatchObject({
        message: 'A requested mutual aid workflow already exists for this incident and target city',
      });
    },
  );
});

describe(`PATCH ${BASE}/:id`, () => {
  it('allows only the target city scope to approve or decline the request', async () => {
    const { city: targetCity } = await ensurePartnerCityScope();
    const requesterToken = await getTokenForRole('dispatcher@xypes.local');
    const targetToken = await ensureScopedUserToken({
      email: 'target.dispatcher@xypes.local',
      name: 'Target Dispatcher',
      role: 'DISPATCHER',
      jurisdictionType: 'city',
      jurisdictionId: targetCity.id,
    });
    const { incidentId } = await createScopedIncident('approve-scope');

    const createRes = await createMutualAidRequest({
      token: requesterToken,
      incidentId,
      targetJurisdictionId: targetCity.id,
    });

    expect(createRes.status).toBe(201);

    const requesterPatchRes = await request(app)
      .patch(`${BASE}/${createRes.body.id as string}`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ status: 'approved' });

    expect(requesterPatchRes.status).toBe(404);
    expect(requesterPatchRes.body).toMatchObject({ message: 'Mutual aid request not found' });

    const deniedPatchAudit = await waitForMutualAidAuditLog({
      targetId: createRes.body.id as string,
      action: 'update',
      outcome: 'failure',
      statusCode: 404,
      path: `/${createRes.body.id as string}`,
    });

    expect(deniedPatchAudit).toMatchObject({
      resource: 'mutual-aid-requests',
      action: 'update',
      outcome: 'failure',
      statusCode: 404,
      targetId: createRes.body.id,
    });

    const targetPatchRes = await request(app)
      .patch(`${BASE}/${createRes.body.id as string}`)
      .set('Authorization', `Bearer ${targetToken}`)
      .send({ status: 'approved' });

    expect(targetPatchRes.status).toBe(200);
    expect(targetPatchRes.body).toMatchObject({
      id: createRes.body.id,
      status: 'approved',
      targetJurisdictionId: targetCity.id,
    });
  });

  it('fails closed when the target city is from another province, even if the malformed workflow points at that city', async () => {
    const { city: requestingCity } = await ensureTuguegaraoCityScope();
    const { city: outsideProvinceCity } = await ensureExternalProvinceCityScope();
    const requesterUserId = await getUserIdByEmail('dispatcher@xypes.local');
    const outsideProvinceToken = await ensureScopedUserToken({
      email: 'cross-province.target@xypes.local',
      name: 'Cross Province Target',
      role: 'DISPATCHER',
      jurisdictionType: 'city',
      jurisdictionId: outsideProvinceCity.id,
    });
    const { incidentId } = await createScopedIncident('cross-province-patch');

    const malformedRequest = await prisma.mutualAidRequest.create({
      data: {
        incidentId,
        requestingJurisdictionId: requestingCity.id,
        targetJurisdictionId: outsideProvinceCity.id,
        requestedById: requesterUserId,
        status: 'requested',
        notes: 'Direct prisma malformed workflow for patch scope validation',
      },
      include: { incident: true },
    });

    const patchRes = await request(app)
      .patch(`${BASE}/${malformedRequest.id}`)
      .set('Authorization', `Bearer ${outsideProvinceToken}`)
      .send({ status: 'approved' });

    expect(patchRes.status).toBe(404);
    expect(patchRes.body).toMatchObject({ message: 'Mutual aid request not found' });
  });
});

describe(`DELETE ${BASE}/:id and POST ${BASE}/:id/restore`, () => {
  it('writes failure audit rows for immutable delete and restore attempts', async () => {
    const { city: targetCity } = await ensurePartnerCityScope();
    const requesterToken = await getTokenForRole('dispatcher@xypes.local');
    const { incidentId } = await createScopedIncident('immutable-audit');

    const createRes = await createMutualAidRequest({
      token: requesterToken,
      incidentId,
      targetJurisdictionId: targetCity.id,
    });

    expect(createRes.status).toBe(201);

    const requestId = createRes.body.id as string;

    const deleteRes = await request(app)
      .delete(`${BASE}/${requestId}`)
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(deleteRes.status).toBe(405);
    expect(deleteRes.body).toMatchObject({
      message:
        'Mutual aid request records are immutable workflow records and cannot be deleted or restored.',
    });

    const deleteAudit = await waitForMutualAidAuditLog({
      targetId: requestId,
      action: 'delete',
      outcome: 'failure',
      statusCode: 405,
      path: `/${requestId}`,
    });

    expect(deleteAudit).toMatchObject({
      resource: 'mutual-aid-requests',
      action: 'delete',
      outcome: 'failure',
      statusCode: 405,
      targetId: requestId,
    });

    const restoreRes = await request(app)
      .post(`${BASE}/${requestId}/restore`)
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(restoreRes.status).toBe(405);
    expect(restoreRes.body).toMatchObject({
      message:
        'Mutual aid request records are immutable workflow records and cannot be deleted or restored.',
    });

    const restoreAudit = await waitForMutualAidAuditLog({
      targetId: requestId,
      action: 'restore',
      outcome: 'failure',
      statusCode: 405,
      path: `/${requestId}/restore`,
    });

    expect(restoreAudit).toMatchObject({
      resource: 'mutual-aid-requests',
      action: 'restore',
      outcome: 'failure',
      statusCode: 405,
      targetId: requestId,
    });
  });
});

describe(`GET ${BASE}`, () => {
  it('does not expose participant data to a nonparticipant city on list or detail reads', async () => {
    const { city: targetCity } = await ensurePartnerCityScope();
    const { city: outsiderCity } = await ensureOutsiderCityScope();
    const requesterToken = await getTokenForRole('dispatcher@xypes.local');
    const outsiderToken = await ensureScopedUserToken({
      email: 'outsider.dispatcher@xypes.local',
      name: 'Outsider Dispatcher',
      role: 'DISPATCHER',
      jurisdictionType: 'city',
      jurisdictionId: outsiderCity.id,
    });
    const { incidentId } = await createScopedIncident('outsider-read');

    const createRes = await createMutualAidRequest({
      token: requesterToken,
      incidentId,
      targetJurisdictionId: targetCity.id,
    });

    expect(createRes.status).toBe(201);

    const listRes = await request(app).get(BASE).set('Authorization', `Bearer ${outsiderToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.some((record: { id: string }) => record.id === createRes.body.id)).toBe(
      false,
    );

    const detailRes = await request(app)
      .get(`${BASE}/${createRes.body.id as string}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(detailRes.status).toBe(404);
    expect(detailRes.body).toMatchObject({ message: 'Mutual aid request not found' });
  });

  it('hides malformed cross-province workflows from city participant reads on list and detail', async () => {
    const { city: requestingCity } = await ensureTuguegaraoCityScope();
    const { city: outsideProvinceCity } = await ensureExternalProvinceCityScope();
    const requesterToken = await getTokenForRole('dispatcher@xypes.local');
    const requesterUserId = await getUserIdByEmail('dispatcher@xypes.local');
    const { incidentId } = await createScopedIncident('city-cross-province-read');

    const malformedRequest = await prisma.mutualAidRequest.create({
      data: {
        incidentId,
        requestingJurisdictionId: requestingCity.id,
        targetJurisdictionId: outsideProvinceCity.id,
        requestedById: requesterUserId,
        status: 'requested',
        notes: 'Direct prisma malformed workflow for city read validation',
      },
      include: { incident: true },
    });

    const listRes = await request(app).get(BASE).set('Authorization', `Bearer ${requesterToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.some((record: { id: string }) => record.id === malformedRequest.id)).toBe(
      false,
    );

    const detailRes = await request(app)
      .get(`${BASE}/${malformedRequest.id}`)
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(detailRes.status).toBe(404);
    expect(detailRes.body).toMatchObject({ message: 'Mutual aid request not found' });
  });

  it('hides malformed cross-province workflows from provincial admin reads unless both participant cities are in-province', async () => {
    const { city: requestingCity } = await ensureTuguegaraoCityScope();
    const { city: outsideProvinceCity } = await ensureExternalProvinceCityScope();
    const provincialToken = await getTokenForRole('provincial.admin@xypes.local');
    const requesterUserId = await getUserIdByEmail('dispatcher@xypes.local');
    const { incidentId } = await createScopedIncident('province-contained-read');

    const malformedRequest = await prisma.mutualAidRequest.create({
      data: {
        incidentId,
        requestingJurisdictionId: requestingCity.id,
        targetJurisdictionId: outsideProvinceCity.id,
        requestedById: requesterUserId,
        status: 'requested',
        notes: 'Direct prisma malformed workflow for scope validation',
      },
      include: { incident: true },
    });

    const listRes = await request(app).get(BASE).set('Authorization', `Bearer ${provincialToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.some((record: { id: string }) => record.id === malformedRequest.id)).toBe(
      false,
    );

    const detailRes = await request(app)
      .get(`${BASE}/${malformedRequest.id}`)
      .set('Authorization', `Bearer ${provincialToken}`);

    expect(detailRes.status).toBe(404);
    expect(detailRes.body).toMatchObject({ message: 'Mutual aid request not found' });
  });
});

describe('audit logging', () => {
  it('writes audit rows with mutual aid metadata for create and target-city patch actions', async () => {
    const { city: targetCity } = await ensurePartnerCityScope();
    const requesterToken = await getTokenForRole('dispatcher@xypes.local');
    const targetToken = await ensureScopedUserToken({
      email: 'audit.target.dispatcher@xypes.local',
      name: 'Audit Target Dispatcher',
      role: 'DISPATCHER',
      jurisdictionType: 'city',
      jurisdictionId: targetCity.id,
    });
    const { incidentId } = await createScopedIncident('audit-rows');

    const createRes = await createMutualAidRequest({
      token: requesterToken,
      incidentId,
      targetJurisdictionId: targetCity.id,
    });

    expect(createRes.status).toBe(201);

    const createAudit = await waitForMutualAidAuditLog({
      targetId: createRes.body.id as string,
      action: 'create',
    });

    expect(createAudit).toMatchObject({
      resource: 'mutual-aid-requests',
      action: 'create',
      outcome: 'success',
      method: 'POST',
      path: '/',
    });
    expect(createAudit.metadata).toEqual(
      expect.objectContaining({
        incidentId,
        requestingJurisdictionId: createRes.body.requestingJurisdictionId,
        targetJurisdictionId: createRes.body.targetJurisdictionId,
        workflowType: 'same-province-city-to-city',
      }),
    );

    const patchRes = await request(app)
      .patch(`${BASE}/${createRes.body.id as string}`)
      .set('Authorization', `Bearer ${targetToken}`)
      .send({ status: 'approved' });

    expect(patchRes.status).toBe(200);

    const patchAudit = await waitForMutualAidAuditLog({
      targetId: createRes.body.id as string,
      action: 'update',
    });

    expect(patchAudit).toMatchObject({
      resource: 'mutual-aid-requests',
      action: 'update',
      outcome: 'success',
      method: 'PATCH',
      path: `/${createRes.body.id as string}`,
    });
    expect(patchAudit.metadata).toEqual(
      expect.objectContaining({
        incidentId,
        requestingJurisdictionId: createRes.body.requestingJurisdictionId,
        targetJurisdictionId: createRes.body.targetJurisdictionId,
        workflowType: 'same-province-city-to-city',
        fromStatus: 'requested',
        toStatus: 'approved',
      }),
    );
  });
});
