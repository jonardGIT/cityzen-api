import request from 'supertest';
import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';

jest.setTimeout(120000);

const BASE = `${API_V1}/incident-escalations`;
const INCIDENTS_BASE = `${API_V1}/incidents`;
const AUDIT_WAIT_ATTEMPTS = 40;
const AUDIT_WAIT_INTERVAL_MS = 25;

let adminToken = '';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForEscalationAuditLog(input: {
  action: 'create' | 'update' | 'delete' | 'restore';
  targetId?: string;
  outcome?: 'success' | 'failure';
  statusCode?: number;
  path?: string;
}) {
  for (let attempt = 0; attempt < AUDIT_WAIT_ATTEMPTS; attempt += 1) {
    const auditWhere = {
      resource: 'incident-escalations',
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

  throw new Error(`Expected incident escalation audit log for ${input.action}${targetSuffix}`);
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

async function ensureAlternateActiveProvince() {
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

  return { province };
}

async function ensureScopedUserToken(input: {
  email: string;
  name: string;
  role: 'DISPATCHER';
  jurisdictionType: 'city';
  jurisdictionId: string;
}): Promise<string> {
  const templateUser = await prisma.user.findUnique({
    where: { email: 'dispatcher@xypes.local' },
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
    .send({ name: `Escalation Category ${Date.now()}-${Math.random()}` });

  expect(res.status).toBe(201);
  return res.body.id as string;
}

async function createSeverity(token: string): Promise<string> {
  const res = await request(app)
    .post(`${API_V1}/severities`)
    .set('Authorization', `Bearer ${token}`)
    .send({ level: `Escalation Severity ${Date.now()}-${Math.random()}` });

  expect(res.status).toBe(201);
  return res.body.id as string;
}

async function createEscalatableIncident(label: string): Promise<{ incidentId: string }> {
  const reporterToken = await registerAndLinkCitizenReporter(label);
  const [categoryId, severityId] = await Promise.all([
    createCategory(adminToken),
    createSeverity(adminToken),
  ]);

  const reportRes = await request(app)
    .post(`${INCIDENTS_BASE}/report`)
    .set('Authorization', `Bearer ${reporterToken}`)
    .send({
      description: `Escalation incident ${label}`,
      categoryId,
      severityId,
      ...buildTuguegaraoLocationSnapshot(),
    });

  expect(reportRes.status).toBe(201);

  return { incidentId: reportRes.body.id as string };
}

async function createEscalation(input: { token: string; incidentId: string; reason?: string }) {
  return request(app)
    .post(BASE)
    .set('Authorization', `Bearer ${input.token}`)
    .send({
      incidentId: input.incidentId,
      reason: input.reason ?? `Escalation reason ${Date.now()}`,
    });
}

beforeAll(async () => {
  adminToken = await getAdminToken();
});

describe(`POST ${BASE}`, () => {
  it('city-scoped dispatcher can create an escalation and server-owned fields are enforced in the persisted response', async () => {
    const { city } = await ensureTuguegaraoCityScope();
    const dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
    const { incidentId } = await createEscalatableIncident('create-server-owned');

    const res = await createEscalation({
      token: dispatcherToken,
      incidentId,
      reason: 'Escalate to province for coordinated response',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      incidentId,
      reason: 'Escalate to province for coordinated response',
      sourceCityMunicipalityId: city.id,
      status: 'pending',
      targetProvinceId: city.provinceId,
      fromLevel: 'city',
      toLevel: 'province',
      incident: {
        id: incidentId,
        cityMunicipalityId: city.id,
      },
      sourceCityMunicipality: {
        id: city.id,
      },
      targetProvince: {
        id: city.provinceId,
      },
    });

    const dispatcherUser = await prisma.user.findUnique({
      where: { email: 'dispatcher@xypes.local' },
      select: { id: true },
    });

    expect(dispatcherUser?.id).toBeTruthy();
    expect(res.body.escalatedById).toBe(dispatcherUser!.id);

    const persisted = await prisma.incidentEscalation.findUnique({
      where: { id: res.body.id as string },
      include: { incident: true, sourceCityMunicipality: true, targetProvince: true },
    });

    expect(persisted).toMatchObject({
      incidentId,
      reason: 'Escalate to province for coordinated response',
      sourceCityMunicipalityId: city.id,
      status: 'pending',
      targetProvinceId: city.provinceId,
      fromLevel: 'city',
      toLevel: 'province',
      escalatedById: dispatcherUser!.id,
      incident: {
        id: incidentId,
        cityMunicipalityId: city.id,
      },
      sourceCityMunicipality: {
        id: city.id,
      },
      targetProvince: {
        id: city.provinceId,
      },
    });
  });

  it('rejects client-supplied server-owned fields like status/fromLevel/toLevel/escalatedById with validation failure', async () => {
    await ensureTuguegaraoCityScope();
    const dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
    const { incidentId } = await createEscalatableIncident('create-validation');

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({
        incidentId,
        reason: 'Attempt to spoof server fields',
        status: 'accepted',
        fromLevel: 'region',
        toLevel: 'region',
        escalatedById: '11111111-1111-4111-8111-111111111111',
      });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ message: 'Validation failed' });
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: '',
          message: expect.stringContaining(
            'Unexpected fields: status, fromLevel, toLevel, escalatedById',
          ),
        }),
      ]),
    );
  });

  it('rejects a duplicate pending city-to-province escalation for the same incident', async () => {
    await ensureTuguegaraoCityScope();
    const dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
    const { incidentId } = await createEscalatableIncident('duplicate-pending');

    const firstCreateRes = await createEscalation({
      token: dispatcherToken,
      incidentId,
      reason: 'Initial escalation to province',
    });

    expect(firstCreateRes.status).toBe(201);

    const duplicateRes = await createEscalation({
      token: dispatcherToken,
      incidentId,
      reason: 'Second escalation should be rejected while pending',
    });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body).toMatchObject({
      message: 'A pending city-to-province escalation already exists for this incident',
    });

    const duplicateCreateAudit = await waitForEscalationAuditLog({
      action: 'create',
      outcome: 'failure',
      statusCode: 409,
      path: '/',
    });

    expect(duplicateCreateAudit).toMatchObject({
      resource: 'incident-escalations',
      action: 'create',
      outcome: 'failure',
      statusCode: 409,
    });

    const persisted = await prisma.incidentEscalation.findMany({
      where: {
        incidentId,
        status: 'pending',
        fromLevel: 'city',
        toLevel: 'province',
      },
      orderBy: { createdAt: 'asc' },
    });

    expect(persisted).toHaveLength(1);
    expect(persisted[0]?.id).toBe(firstCreateRes.body.id as string);
  });

  it('returns 409 when the incident province does not match its bound active city relation province', async () => {
    const { city } = await ensureTuguegaraoCityScope();
    const { province: alternateProvince } = await ensureAlternateActiveProvince();
    const dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
    const { incidentId } = await createEscalatableIncident('malformed-incident-locality');

    await prisma.citizenIncident.update({
      where: { id: incidentId },
      data: { provinceId: alternateProvince.id },
    });

    const res = await createEscalation({
      token: dispatcherToken,
      incidentId,
      reason: 'Escalation should fail for malformed incident locality',
    });

    expect(res.status).toBe(409);

    const persistedEscalations = await prisma.incidentEscalation.findMany({
      where: { incidentId },
    });

    expect(persistedEscalations).toHaveLength(0);

    const persistedIncident = await prisma.citizenIncident.findUniqueOrThrow({
      where: { id: incidentId },
      select: {
        cityMunicipalityId: true,
        provinceId: true,
        cityMunicipalityRef: { select: { provinceId: true } },
      },
    });

    expect(persistedIncident.cityMunicipalityId).toBe(city.id);
    expect(persistedIncident.provinceId).toBe(alternateProvince.id);
    expect(persistedIncident.cityMunicipalityRef?.provinceId).toBe(city.provinceId);
  });

  it('serializes concurrent creates for the same incident so only one pending escalation is inserted', async () => {
    await ensureTuguegaraoCityScope();
    const dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
    const { incidentId } = await createEscalatableIncident('duplicate-pending-concurrent');

    const [firstRes, secondRes] = await Promise.all([
      createEscalation({
        token: dispatcherToken,
        incidentId,
        reason: 'Concurrent escalation attempt A',
      }),
      createEscalation({
        token: dispatcherToken,
        incidentId,
        reason: 'Concurrent escalation attempt B',
      }),
    ]);

    const statuses = [firstRes.status, secondRes.status].sort((left, right) => left - right);
    expect(statuses).toEqual([201, 409]);

    const conflictRes = [firstRes, secondRes].find((res) => res.status === 409);
    const successRes = [firstRes, secondRes].find((res) => res.status === 201);

    expect(successRes).toBeDefined();
    expect(conflictRes).toBeDefined();
    expect(conflictRes?.body).toMatchObject({
      message: 'A pending city-to-province escalation already exists for this incident',
    });

    const persisted = await prisma.incidentEscalation.findMany({
      where: {
        incidentId,
        status: 'pending',
        fromLevel: 'city',
        toLevel: 'province',
      },
      orderBy: { createdAt: 'asc' },
    });

    expect(persisted).toHaveLength(1);
    expect(persisted[0]?.id).toBe(successRes?.body.id as string);
  });
});

describe(`GET ${BASE}`, () => {
  it('does not expose in-scope escalation rows outside the supported city-to-province workflow', async () => {
    const { city } = await ensureTuguegaraoCityScope();
    const dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
    const { incidentId } = await createEscalatableIncident('read-supported-workflow-only');

    const malformedEscalation = await prisma.incidentEscalation.create({
      data: {
        incidentId,
        sourceCityMunicipalityId: city.id,
        targetProvinceId: city.provinceId,
        reason: 'Malformed in-scope escalation for read filtering',
        status: 'pending',
        fromLevel: 'barangay',
        toLevel: 'province',
        escalatedById: (
          await prisma.user.findUniqueOrThrow({
            where: { email: 'dispatcher@xypes.local' },
            select: { id: true },
          })
        ).id,
      },
    });

    const listRes = await request(app).get(BASE).set('Authorization', `Bearer ${dispatcherToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: malformedEscalation.id })]),
    );

    const detailRes = await request(app)
      .get(`${BASE}/${malformedEscalation.id}`)
      .set('Authorization', `Bearer ${dispatcherToken}`);

    expect(detailRes.status).toBe(404);
    expect(detailRes.body).toMatchObject({ message: 'Incident escalation not found' });

    const persistedIncident = await prisma.citizenIncident.findUniqueOrThrow({
      where: { id: incidentId },
      select: { cityMunicipalityId: true },
    });

    expect(persistedIncident.cityMunicipalityId).toBe(city.id);
  });

  it('out-of-city dispatcher gets empty list and 404 detail for a Tuguegarao escalation', async () => {
    await ensureTuguegaraoCityScope();
    const { city: partnerCity } = await ensurePartnerCityScope();
    const tuguegaraoDispatcherToken = await getTokenForRole('dispatcher@xypes.local');
    const outOfCityDispatcherToken = await ensureScopedUserToken({
      email: 'incident-escalation.out-of-city.dispatcher@xypes.local',
      name: 'Incident Escalation Out-of-City Dispatcher',
      role: 'DISPATCHER',
      jurisdictionType: 'city',
      jurisdictionId: partnerCity.id,
    });
    const { incidentId } = await createEscalatableIncident('out-of-city-read');

    const createRes = await createEscalation({
      token: tuguegaraoDispatcherToken,
      incidentId,
      reason: 'Escalation for out-of-city denial checks',
    });

    expect(createRes.status).toBe(201);

    const listRes = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${outOfCityDispatcherToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body).toEqual([]);

    const detailRes = await request(app)
      .get(`${BASE}/${createRes.body.id as string}`)
      .set('Authorization', `Bearer ${outOfCityDispatcherToken}`);

    expect(detailRes.status).toBe(404);
    expect(detailRes.body).toMatchObject({ message: 'Incident escalation not found' });
  });

  it("fails closed when a dispatcher's bound city row is archived", async () => {
    const { city } = await ensureTuguegaraoCityScope();
    const dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
    const { incidentId } = await createEscalatableIncident('archived-city-scope');

    const createRes = await createEscalation({
      token: dispatcherToken,
      incidentId,
      reason: 'Escalation for archived city scope denial',
    });

    expect(createRes.status).toBe(201);

    await prisma.cityMunicipality.update({
      where: { id: city.id },
      data: { archivedAt: new Date() },
    });

    try {
      const listRes = await request(app)
        .get(BASE)
        .set('Authorization', `Bearer ${dispatcherToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body).toEqual([]);

      const detailRes = await request(app)
        .get(`${BASE}/${createRes.body.id as string}`)
        .set('Authorization', `Bearer ${dispatcherToken}`);

      expect(detailRes.status).toBe(404);
      expect(detailRes.body).toMatchObject({ message: 'Incident escalation not found' });
    } finally {
      await prisma.cityMunicipality.update({
        where: { id: city.id },
        data: { archivedAt: null },
      });
    }
  });

  it("fails closed when a province admin's bound province row is archived", async () => {
    const { province } = await ensureTuguegaraoCityScope();
    const dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
    const provincialToken = await getTokenForRole('provincial.admin@xypes.local');
    const { incidentId } = await createEscalatableIncident('archived-province-scope');

    const createRes = await createEscalation({
      token: dispatcherToken,
      incidentId,
      reason: 'Escalation for archived province scope denial',
    });

    expect(createRes.status).toBe(201);

    await prisma.province.update({
      where: { id: province.id },
      data: { archivedAt: new Date() },
    });

    try {
      const listRes = await request(app)
        .get(BASE)
        .set('Authorization', `Bearer ${provincialToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body).toEqual([]);

      const detailRes = await request(app)
        .get(`${BASE}/${createRes.body.id as string}`)
        .set('Authorization', `Bearer ${provincialToken}`);

      expect(detailRes.status).toBe(404);
      expect(detailRes.body).toMatchObject({ message: 'Incident escalation not found' });
    } finally {
      await prisma.province.update({
        where: { id: province.id },
        data: { archivedAt: null },
      });
    }
  });
});

describe(`PATCH ${BASE}/:id`, () => {
  it('records audit log rows for create and province-side patch mutations', async () => {
    const { province } = await ensureTuguegaraoCityScope();
    const dispatcherToken = await getTokenForRole('dispatcher@xypes.local');

    await prisma.user.updateMany({
      where: { email: 'provincial.admin@xypes.local' },
      data: {
        jurisdictionType: 'province',
        jurisdictionId: province.id,
      },
    });

    const provincialToken = await getTokenForRole('provincial.admin@xypes.local');
    const { incidentId } = await createEscalatableIncident('audit-coverage');

    const createRes = await createEscalation({
      token: dispatcherToken,
      incidentId,
      reason: 'Escalation audit create coverage',
    });

    expect(createRes.status).toBe(201);

    const escalationId = createRes.body.id as string;

    const provincePatchRes = await request(app)
      .patch(`${BASE}/${escalationId}`)
      .set('Authorization', `Bearer ${provincialToken}`)
      .send({ status: 'accepted' });

    expect(provincePatchRes.status).toBe(200);

    const [createAuditLog, updateAuditLog] = await Promise.all([
      waitForEscalationAuditLog({ targetId: escalationId, action: 'create' }),
      waitForEscalationAuditLog({ targetId: escalationId, action: 'update' }),
    ]);

    expect(createAuditLog).toMatchObject({
      action: 'create',
      resource: 'incident-escalations',
      outcome: 'success',
      actorEmail: 'dispatcher@xypes.local',
      statusCode: 201,
      targetId: escalationId,
      method: 'POST',
      path: '/',
    });

    expect(updateAuditLog).toMatchObject({
      action: 'update',
      resource: 'incident-escalations',
      outcome: 'success',
      actorEmail: 'provincial.admin@xypes.local',
      statusCode: 200,
      targetId: escalationId,
      method: 'PATCH',
      path: `/${escalationId}`,
    });
  });

  it('province admin can accept a pending escalation, city actor cannot patch it, and delete/restore return 405 immutable-workflow responses', async () => {
    const { province } = await ensureTuguegaraoCityScope();
    const dispatcherToken = await getTokenForRole('dispatcher@xypes.local');

    await prisma.user.updateMany({
      where: { email: 'provincial.admin@xypes.local' },
      data: {
        jurisdictionType: 'province',
        jurisdictionId: province.id,
      },
    });

    const provincialToken = await getTokenForRole('provincial.admin@xypes.local');
    const cityAdminToken = await getTokenForRole('ops.lead@xypes.local');
    const { incidentId } = await createEscalatableIncident('province-accept');

    const createRes = await createEscalation({
      token: dispatcherToken,
      incidentId,
      reason: 'Escalation awaiting province acceptance',
    });

    expect(createRes.status).toBe(201);

    const escalationId = createRes.body.id as string;

    const cityPatchRes = await request(app)
      .patch(`${BASE}/${escalationId}`)
      .set('Authorization', `Bearer ${cityAdminToken}`)
      .send({ status: 'accepted' });

    expect(cityPatchRes.status).toBe(403);

    const deniedPatchAudit = await waitForEscalationAuditLog({
      targetId: escalationId,
      action: 'update',
      outcome: 'failure',
      statusCode: 403,
      path: `/${escalationId}`,
    });

    expect(deniedPatchAudit).toMatchObject({
      resource: 'incident-escalations',
      action: 'update',
      outcome: 'failure',
      statusCode: 403,
      targetId: escalationId,
    });

    const provincePatchRes = await request(app)
      .patch(`${BASE}/${escalationId}`)
      .set('Authorization', `Bearer ${provincialToken}`)
      .send({ status: 'accepted' });

    expect(provincePatchRes.status).toBe(200);
    expect(provincePatchRes.body).toMatchObject({
      id: escalationId,
      status: 'accepted',
      incidentId,
      fromLevel: 'city',
      toLevel: 'province',
    });

    const deleteRes = await request(app)
      .delete(`${BASE}/${escalationId}`)
      .set('Authorization', `Bearer ${provincialToken}`);

    expect(deleteRes.status).toBe(405);
    expect(deleteRes.body).toMatchObject({
      message:
        'Incident escalation records are immutable workflow records and cannot be deleted or restored.',
    });

    const deleteAudit = await waitForEscalationAuditLog({
      targetId: escalationId,
      action: 'delete',
      outcome: 'failure',
      statusCode: 405,
      path: `/${escalationId}`,
    });

    expect(deleteAudit).toMatchObject({
      resource: 'incident-escalations',
      action: 'delete',
      outcome: 'failure',
      statusCode: 405,
      targetId: escalationId,
    });

    const restoreRes = await request(app)
      .post(`${BASE}/${escalationId}/restore`)
      .set('Authorization', `Bearer ${provincialToken}`);

    expect(restoreRes.status).toBe(405);
    expect(restoreRes.body).toMatchObject({
      message:
        'Incident escalation records are immutable workflow records and cannot be deleted or restored.',
    });

    const restoreAudit = await waitForEscalationAuditLog({
      targetId: escalationId,
      action: 'restore',
      outcome: 'failure',
      statusCode: 405,
      path: `/${escalationId}/restore`,
    });

    expect(restoreAudit).toMatchObject({
      resource: 'incident-escalations',
      action: 'restore',
      outcome: 'failure',
      statusCode: 405,
      targetId: escalationId,
    });
  });

  it('rejects locality-changing incident updates once a city-to-province escalation exists', async () => {
    const { city: tuguegaraoCity } = await ensureTuguegaraoCityScope();
    const { city: partnerCity } = await ensurePartnerCityScope();
    const dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
    const { incidentId } = await createEscalatableIncident('reject-locality-drift');

    const createRes = await createEscalation({
      token: dispatcherToken,
      incidentId,
      reason: 'Escalation should anchor locality authority',
    });

    expect(createRes.status).toBe(201);

    const patchRes = await request(app)
      .patch(`${INCIDENTS_BASE}/${incidentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...buildTuguegaraoLocationSnapshot(),
        cityName: partnerCity.name,
        cityMunicipalityId: partnerCity.id,
        barangay: null,
      });

    expect(patchRes.status).toBe(409);
    expect(patchRes.body).toMatchObject({
      message:
        'Incident locality cannot be changed after a city-to-province escalation has been created',
    });

    const persisted = await prisma.citizenIncident.findUnique({
      where: { id: incidentId },
      select: {
        cityMunicipalityId: true,
        provinceId: true,
        regionId: true,
        barangayId: true,
        cityName: true,
        provinceName: true,
        regionName: true,
        barangay: true,
      },
    });

    expect(persisted).toMatchObject({
      cityMunicipalityId: tuguegaraoCity.id,
      cityName: tuguegaraoCity.name,
      provinceName: 'Cagayan',
      regionName: 'Cagayan Valley',
      barangay: 'Centro 10',
    });
    expect(persisted?.provinceId).toEqual(expect.any(String));
    expect(persisted?.regionId).toEqual(expect.any(String));
    expect(persisted?.barangayId).toEqual(expect.any(String));
  });

  it('fails closed and does not mutate a pending escalation row that is not city-to-province workflow', async () => {
    const { province } = await ensureTuguegaraoCityScope();
    const provincialToken = await getTokenForRole('provincial.admin@xypes.local');
    const { incidentId } = await createEscalatableIncident('malformed-workflow');
    const provincialUser = await prisma.user.findUnique({
      where: { email: 'provincial.admin@xypes.local' },
      select: { id: true },
    });

    expect(provincialUser?.id).toBeTruthy();

    const seededEscalation = await prisma.incidentEscalation.create({
      data: {
        incidentId,
        sourceCityMunicipalityId: (
          await prisma.citizenIncident.findUniqueOrThrow({
            where: { id: incidentId },
            select: { cityMunicipalityId: true },
          })
        ).cityMunicipalityId,
        targetProvinceId: province.id,
        reason: 'Malformed workflow row for fail-closed patch coverage',
        fromLevel: 'province',
        toLevel: 'region',
        status: 'pending',
        escalatedById: provincialUser!.id,
      },
      include: { incident: true },
    });

    expect(seededEscalation.incident.provinceId).toBe(province.id);

    const patchRes = await request(app)
      .patch(`${BASE}/${seededEscalation.id}`)
      .set('Authorization', `Bearer ${provincialToken}`)
      .send({ status: 'accepted' });

    expect(patchRes.status).toBe(409);
    expect(patchRes.body).toMatchObject({
      message: 'Only pending city-to-province escalations can be updated',
    });

    const persisted = await prisma.incidentEscalation.findUnique({
      where: { id: seededEscalation.id },
    });

    expect(persisted).toMatchObject({
      id: seededEscalation.id,
      status: 'pending',
      fromLevel: 'province',
      toLevel: 'region',
    });
  });

  it('fails closed when a province admin patches a city-to-province escalation row with a cross-province target', async () => {
    await ensureTuguegaraoCityScope();
    const { province: alternateProvince } = await ensureAlternateActiveProvince();

    await prisma.user.updateMany({
      where: { email: 'provincial.admin@xypes.local' },
      data: {
        jurisdictionType: 'province',
        jurisdictionId: alternateProvince.id,
      },
    });

    const provincialToken = await getTokenForRole('provincial.admin@xypes.local');
    const { incidentId } = await createEscalatableIncident('cross-province-target-patch');
    const provincialUser = await prisma.user.findUnique({
      where: { email: 'provincial.admin@xypes.local' },
      select: { id: true },
    });
    const incident = await prisma.citizenIncident.findUniqueOrThrow({
      where: { id: incidentId },
      select: {
        cityMunicipalityId: true,
        provinceId: true,
      },
    });

    expect(provincialUser?.id).toBeTruthy();
    expect(incident.provinceId).toBeTruthy();
    expect(alternateProvince.id).not.toBe(incident.provinceId);

    const seededEscalation = await prisma.incidentEscalation.create({
      data: {
        incidentId,
        sourceCityMunicipalityId: incident.cityMunicipalityId,
        targetProvinceId: alternateProvince.id,
        reason: 'Cross-province target should fail closed before patch mutation',
        fromLevel: 'city',
        toLevel: 'province',
        status: 'pending',
        escalatedById: provincialUser!.id,
      },
    });

    const patchRes = await request(app)
      .patch(`${BASE}/${seededEscalation.id}`)
      .set('Authorization', `Bearer ${provincialToken}`)
      .send({ status: 'accepted' });

    expect(patchRes.status).toBe(404);
    expect(patchRes.body).toMatchObject({ message: 'Incident escalation not found' });

    const persisted = await prisma.incidentEscalation.findUnique({
      where: { id: seededEscalation.id },
    });

    expect(persisted).toMatchObject({
      id: seededEscalation.id,
      status: 'pending',
      targetProvinceId: alternateProvince.id,
      fromLevel: 'city',
      toLevel: 'province',
    });
  });
});
