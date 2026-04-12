import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';
import {
  buildIncidentLocationSnapshot,
  createCitizen as createCitizenFactory,
  createCategory as createCategoryFactory,
  createSeverity as createSeverityFactory,
  getStatusId as getStatusIdFactory,
} from './helpers/factories.js';
import * as supabaseStorageService from '../services/supabaseStorageService.js';
import { isArchiveEnabled } from '../utils/archive.js';

jest.setTimeout(120000);

const BASE = `${API_V1}/incidents`;
let adminToken = '';
const incidentMediaUploadEnabled = supabaseStorageService.isSupabaseStorageEnabled();
const archiveEnabled = isArchiveEnabled();

const createCitizen = () => createCitizenFactory(adminToken);
const createCategory = () => createCategoryFactory(adminToken);
const createSeverity = () => createSeverityFactory(adminToken);
const getStatusId = (name?: string) => getStatusIdFactory(adminToken, name);

async function registerAndLinkCitizenReporter(uniqueLabel: string): Promise<{
  token: string;
  citizenId: string;
  email: string;
}> {
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

  return {
    token,
    citizenId: linkRes.body.id as string,
    email,
  };
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
    where: { code: 'PH-02' },
    update: { name: 'Cagayan Valley', archivedAt: null },
    create: { code: 'PH-02', name: 'Cagayan Valley' },
  });

  const province = await prisma.province.upsert({
    where: { code: 'PH-0215' },
    update: { name: 'Cagayan', regionId: region.id, archivedAt: null },
    create: { code: 'PH-0215', name: 'Cagayan', regionId: region.id },
  });

  const city = await prisma.cityMunicipality.upsert({
    where: { code: 'PH-021517' },
    update: {
      name: 'Tuguegarao City',
      type: 'CITY',
      provinceId: province.id,
      archivedAt: null,
    },
    create: {
      code: 'PH-021517',
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

  return city;
}

async function ensureScopedUserToken(input: {
  email: string;
  name: string;
  role: 'DISPATCHER';
  jurisdictionType: string;
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

async function createTrustScopedIncident(input: {
  label: string;
  reporterToken: string;
}): Promise<{ incidentId: string; mediaId: string }> {
  const categoryId = await createCategory();
  const severityId = await createSeverity();

  const reportRes = await request(app)
    .post(`${BASE}/report`)
    .set('Authorization', `Bearer ${input.reporterToken}`)
    .send({
      description: `Trust-scope incident ${input.label}`,
      categoryId,
      severityId,
      ...buildTuguegaraoLocationSnapshot(),
    });

  expect(reportRes.status).toBe(201);

  const incidentId = reportRes.body.id as string;

  const media = await prisma.incidentMedia.create({
    data: {
      incidentId,
      mediaUrl: `supabase://incident-media/${input.label}-${Date.now()}.jpg`,
      displayOrder: 0,
    },
  });

  return { incidentId, mediaId: media.id };
}

async function assignResponderToIncident(input: {
  incidentId: string;
  cityMunicipalityId: string;
  email?: string;
}) {
  const responderEmail = input.email ?? 'responder@xypes.local';

  await prisma.responder.updateMany({
    where: { contactInfo: responderEmail },
    data: { archivedAt: new Date() },
  });

  const agency = await prisma.agency.create({
    data: {
      name: `Trust Scope Agency ${Date.now()}`,
      cityMunicipalityId: input.cityMunicipalityId,
    },
  });

  const responder = await prisma.responder.create({
    data: {
      name: 'Trust Scope Responder',
      agencyId: agency.id,
      role: 'Field Responder',
      contactInfo: responderEmail,
    },
  });

  await prisma.assignment.create({
    data: {
      incidentId: input.incidentId,
      responderId: responder.id,
    },
  });

  return responder;
}

beforeAll(async () => {
  adminToken = await getAdminToken();
});

describe(`GET ${BASE}`, () => {
  it('should return 200 with array', async () => {
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe(`GET ${BASE}/:id`, () => {
  let createdId = '';

  beforeAll(async () => {
    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const incidentRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Test incident for GET by id',
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(incidentRes.status).toBe(201);
    createdId = incidentRes.body.id;
  });

  it('should return 200 for valid id', async () => {
    const res = await request(app)
      .get(`${BASE}/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdId);
  });

  it('should return 404 for unknown id', async () => {
    const unknownId = '11111111-1111-4111-8111-111111111111';
    const res = await request(app)
      .get(`${BASE}/${unknownId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

describe(`POST ${BASE}`, () => {
  it('should create and return 201 with valid referenced ids', async () => {
    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Test incident',
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ description: 'Test incident' });
    expect(res.body).toHaveProperty('latitude');
  });

  it('should create and return 201 with incident location snapshot', async () => {
    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Test incident with coordinate snapshot',
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('latitude');
    expect(res.body).toHaveProperty('longitude');
  });

  it('should return 400 when snapshot fields are not provided', async () => {
    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const res = await request(app).post(BASE).set('Authorization', `Bearer ${adminToken}`).send({
      description: 'Missing incident location snapshot',
      statusId,
      citizenId,
      categoryId,
      severityId,
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Missing ids' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 400 for invalid foreign key reference', async () => {
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Bad ref',
        statusId: 'not-a-real-uuid',
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(400);
  });
});

describe(`POST ${BASE}/report trust metadata`, () => {
  it('should return trust metadata additively for citizen reports', async () => {
    const reporter = await registerAndLinkCitizenReporter('trust-report');
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const res = await request(app)
      .post(`${BASE}/report`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({
        description: 'Trust-layer citizen report',
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      description: 'Trust-layer citizen report',
      citizenId: reporter.citizenId,
    });
    expect(res.body).toHaveProperty('latitude');
    expect(res.body).toHaveProperty('publicReference');
    expect(res.body).toHaveProperty('trust.caseToken');
    expect(res.body).toHaveProperty('trust.caseLookupPath');
    expect(res.body).toHaveProperty('trust.caseTokenExpiresAt');
    expect(res.body).toHaveProperty('trust.publicStatusMessage');
    expect(res.body.trust.caseLookupPath).toBe(`/api/v1/cases/${res.body.trust.caseToken}`);
  });

  it('should persist canonical locality ids for Tuguegarao snapshot writes', async () => {
    const { region, province, city } = await ensureTuguegaraoCityScope();
    const reporter = await registerAndLinkCitizenReporter('trust-report-locality');
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const res = await request(app)
      .post(`${BASE}/report`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({
        description: 'Trust-layer canonical locality incident',
        categoryId,
        severityId,
        ...buildTuguegaraoLocationSnapshot(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      regionId: region.id,
      provinceId: province.id,
      cityMunicipalityId: city.id,
    });

    const storedIncident = await prisma.citizenIncident.findUnique({
      where: { id: res.body.id as string },
      select: {
        regionId: true,
        provinceId: true,
        cityMunicipalityId: true,
      },
    });

    expect(storedIncident).toMatchObject({
      regionId: region.id,
      provinceId: province.id,
      cityMunicipalityId: city.id,
    });
  });

  it('should clear canonical barangayId when an admin patch explicitly clears the barangay snapshot', async () => {
    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Admin locality clear regression',
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildTuguegaraoLocationSnapshot(),
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.barangay).toBe('Centro 10');
    expect(createRes.body.barangayId).toEqual(expect.any(String));

    const patchRes = await request(app)
      .patch(`${BASE}/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ barangay: null });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body).toMatchObject({
      barangay: null,
      barangayId: null,
      cityName: 'Tuguegarao City',
      provinceName: 'Cagayan',
      regionName: 'Cagayan Valley',
    });

    const storedIncident = await prisma.citizenIncident.findUnique({
      where: { id: createRes.body.id as string },
      select: {
        barangay: true,
        barangayId: true,
        cityMunicipalityId: true,
        provinceId: true,
        regionId: true,
      },
    });

    expect(storedIncident).toMatchObject({
      barangay: null,
      barangayId: null,
      cityMunicipalityId: createRes.body.cityMunicipalityId,
      provinceId: createRes.body.provinceId,
      regionId: createRes.body.regionId,
    });
  });
});

describe('public case lookup trust layer', () => {
  it('should return a privacy-safe public case view for a valid case token', async () => {
    const reporter = await registerAndLinkCitizenReporter('public-case');
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const reportRes = await request(app)
      .post(`${BASE}/report`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({
        description: 'Public case lookup incident',
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(reportRes.status).toBe(201);

    const caseRes = await request(app).get(`${API_V1}/cases/${reportRes.body.trust.caseToken}`);

    expect(caseRes.status).toBe(200);
    expect(caseRes.body).toMatchObject({
      publicReference: reportRes.body.publicReference,
      barangay: reportRes.body.barangay,
      cityName: reportRes.body.cityName,
      provinceName: reportRes.body.provinceName,
    });
    expect(caseRes.body).toHaveProperty('status');
    expect(caseRes.body).toHaveProperty('publicStatusMessage');
    expect(caseRes.body).toHaveProperty('caseTokenExpiresAt');
    expect(caseRes.body).toHaveProperty('timeline');
    expect(Array.isArray(caseRes.body.timeline)).toBe(true);
    expect(caseRes.body.timeline).toHaveLength(1);
    expect(caseRes.body.timeline[0]).toHaveProperty('status');
    expect(caseRes.body.timeline[0]).toHaveProperty('publicStatusMessage');
    expect(caseRes.body.timeline[0]).not.toHaveProperty('fromStatus');
    expect(caseRes.body.timeline[0]).not.toHaveProperty('changedByUser');
    expect(caseRes.body.timeline[0]).not.toHaveProperty('note');
    expect(caseRes.body).not.toHaveProperty('description');
    expect(caseRes.body).not.toHaveProperty('citizenId');
    expect(caseRes.body).not.toHaveProperty('latitude');
    expect(caseRes.body).not.toHaveProperty('longitude');
    expect(caseRes.body).not.toHaveProperty('addressLine1');
    expect(caseRes.body).not.toHaveProperty('addressLine2');
    expect(caseRes.body).not.toHaveProperty('mediaUrl');
    expect(caseRes.body).not.toHaveProperty('mediaUrls');
  });

  it('should return 400 for an invalid case token format', async () => {
    const res = await request(app).get(`${API_V1}/cases/not-valid`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 404 for an unknown but well-formed case token', async () => {
    const res = await request(app).get(`${API_V1}/cases/UnknownCaseToken1234`);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      message: 'Case not found or token is invalid',
    });
  });
});

describe(`GET ${BASE}/:id/timeline`, () => {
  let cityAdminToken = '';
  let dispatcherToken = '';
  let provincialToken = '';
  let nationalToken = '';
  let auditorToken = '';
  let tuguegaraoCityId = '';

  beforeAll(async () => {
    const cityScope = await ensureTuguegaraoCityScope();
    tuguegaraoCityId = cityScope.city.id;
    cityAdminToken = await getTokenForRole('ops.lead@xypes.local');
    dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
    provincialToken = await getTokenForRole('supervisor@xypes.local');
    nationalToken = await getTokenForRole('admin@xypes.local');
    auditorToken = await getTokenForRole('auditor@xypes.local');
  });

  it('should allow the owning citizen and city-side role, while blocking a non-owner citizen', async () => {
    const owner = await registerAndLinkCitizenReporter('timeline-owner');
    const otherCitizen = await registerAndLinkCitizenReporter('timeline-other');
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const reportRes = await request(app)
      .post(`${BASE}/report`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        description: 'Timeline ownership incident',
        categoryId,
        severityId,
        ...buildTuguegaraoLocationSnapshot(),
      });

    expect(reportRes.status).toBe(201);
    expect(reportRes.body.cityMunicipalityId).toBe(tuguegaraoCityId);

    const ownerTimelineRes = await request(app)
      .get(`${BASE}/${reportRes.body.id}/timeline`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(ownerTimelineRes.status).toBe(200);
    expect(ownerTimelineRes.body).toMatchObject({
      incidentId: reportRes.body.id,
      publicReference: reportRes.body.publicReference,
    });
    expect(ownerTimelineRes.body.timeline).toHaveLength(1);
    expect(ownerTimelineRes.body.timeline[0]).toHaveProperty('status.name', 'Reported');
    expect(ownerTimelineRes.body.timeline[0]).toHaveProperty('publicStatusMessage');
    expect(ownerTimelineRes.body.timeline[0]).not.toHaveProperty('toStatus');
    expect(ownerTimelineRes.body.timeline[0]).not.toHaveProperty('fromStatus');
    expect(ownerTimelineRes.body.timeline[0]).not.toHaveProperty('changedByUser');
    expect(ownerTimelineRes.body.timeline[0]).not.toHaveProperty('note');

    const cityTimelineRes = await request(app)
      .get(`${BASE}/${reportRes.body.id}/timeline`)
      .set('Authorization', `Bearer ${cityAdminToken}`);

    expect(cityTimelineRes.status).toBe(200);
    expect(cityTimelineRes.body.timeline).toHaveLength(1);
    expect(cityTimelineRes.body.timeline[0]).toHaveProperty('toStatus.name', 'Reported');

    const blockedTimelineRes = await request(app)
      .get(`${BASE}/${reportRes.body.id}/timeline`)
      .set('Authorization', `Bearer ${otherCitizen.token}`);

    expect(blockedTimelineRes.status).toBe(404);
  });

  it('should block province, national, and auditor roles from the Phase 1 trust timeline route', async () => {
    const owner = await registerAndLinkCitizenReporter('timeline-role-block');
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const reportRes = await request(app)
      .post(`${BASE}/report`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        description: 'Timeline role block incident',
        categoryId,
        severityId,
        ...buildTuguegaraoLocationSnapshot(),
      });

    expect(reportRes.status).toBe(201);

    const responses = await Promise.all([
      request(app)
        .get(`${BASE}/${reportRes.body.id}/timeline`)
        .set('Authorization', `Bearer ${provincialToken}`),
      request(app)
        .get(`${BASE}/${reportRes.body.id}/timeline`)
        .set('Authorization', `Bearer ${nationalToken}`),
      request(app)
        .get(`${BASE}/${reportRes.body.id}/timeline`)
        .set('Authorization', `Bearer ${auditorToken}`),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(403);
    }
  });

  it('should deny city-scoped timeline access when the incident has no canonical cityMunicipalityId', async () => {
    const owner = await registerAndLinkCitizenReporter('timeline-missing-city-id');
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const reportRes = await request(app)
      .post(`${BASE}/report`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        description: 'Timeline missing canonical city id',
        categoryId,
        severityId,
        ...buildTuguegaraoLocationSnapshot(),
      });

    expect(reportRes.status).toBe(201);

    await prisma.citizenIncident.update({
      where: { id: reportRes.body.id as string },
      data: { cityMunicipalityId: null },
    });

    const cityTimelineRes = await request(app)
      .get(`${BASE}/${reportRes.body.id}/timeline`)
      .set('Authorization', `Bearer ${cityAdminToken}`);

    expect(cityTimelineRes.status).toBe(404);

    const ownerTimelineRes = await request(app)
      .get(`${BASE}/${reportRes.body.id}/timeline`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(ownerTimelineRes.status).toBe(200);
  });

  it('should append timeline history when the incident status is updated', async () => {
    const owner = await registerAndLinkCitizenReporter('timeline-update');
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const reportRes = await request(app)
      .post(`${BASE}/report`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        description: 'Timeline status update incident',
        categoryId,
        severityId,
        ...buildTuguegaraoLocationSnapshot(),
      });

    expect(reportRes.status).toBe(201);
    expect(reportRes.body.cityMunicipalityId).toBe(tuguegaraoCityId);

    const newStatusRes = await request(app)
      .post(`${API_V1}/statuses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Trust Timeline Updated ${Date.now()}` });

    expect(newStatusRes.status).toBe(201);

    const patchRes = await request(app)
      .patch(`${BASE}/${reportRes.body.id}`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({ statusId: newStatusRes.body.id });

    expect(patchRes.status).toBe(200);

    const timelineRes = await request(app)
      .get(`${BASE}/${reportRes.body.id}/timeline`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(timelineRes.status).toBe(200);
    expect(timelineRes.body.timeline).toHaveLength(2);
    expect(timelineRes.body.timeline[0]).toHaveProperty('status.name', 'Reported');
    expect(timelineRes.body.timeline[1]).toHaveProperty('status.id', newStatusRes.body.id);
    expect(timelineRes.body.timeline[1]).toHaveProperty('publicStatusMessage');
    expect(timelineRes.body.timeline[1]).not.toHaveProperty('changedByUser');

    const internalTimelineRes = await request(app)
      .get(`${BASE}/${reportRes.body.id}/timeline`)
      .set('Authorization', `Bearer ${cityAdminToken}`);

    expect(internalTimelineRes.status).toBe(200);
    expect(internalTimelineRes.body.timeline[1]).toHaveProperty('fromStatus.name', 'Reported');
    expect(internalTimelineRes.body.timeline[1]).toHaveProperty(
      'toStatus.id',
      newStatusRes.body.id,
    );
    expect(internalTimelineRes.body.timeline[1]).toHaveProperty(
      'changedByUser.email',
      'dispatcher@xypes.local',
    );
  });

  it('should allow assigned responders and block unassigned responders', async () => {
    const owner = await registerAndLinkCitizenReporter('timeline-responder');
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const reportRes = await request(app)
      .post(`${BASE}/report`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        description: 'Timeline responder incident',
        categoryId,
        severityId,
        ...buildTuguegaraoLocationSnapshot(),
      });

    expect(reportRes.status).toBe(201);

    const responderToken = await getTokenForRole('responder@xypes.local');
    const unassignedTimelineRes = await request(app)
      .get(`${BASE}/${reportRes.body.id}/timeline`)
      .set('Authorization', `Bearer ${responderToken}`);

    expect(unassignedTimelineRes.status).toBe(404);

    const { city } = await ensureTuguegaraoCityScope();
    await prisma.responder.updateMany({
      where: { contactInfo: 'responder@xypes.local' },
      data: { archivedAt: new Date() },
    });

    const agency = await prisma.agency.create({
      data: {
        name: `Timeline Agency ${Date.now()}`,
        cityMunicipalityId: city.id,
      },
    });

    const responder = await prisma.responder.create({
      data: {
        name: 'Assigned Responder',
        agencyId: agency.id,
        role: 'Field Responder',
        contactInfo: 'responder@xypes.local',
      },
    });

    await prisma.assignment.create({
      data: {
        incidentId: reportRes.body.id,
        responderId: responder.id,
      },
    });

    const assignedTimelineRes = await request(app)
      .get(`${BASE}/${reportRes.body.id}/timeline`)
      .set('Authorization', `Bearer ${responderToken}`);

    expect(assignedTimelineRes.status).toBe(200);
    expect(assignedTimelineRes.body.timeline[0]).toHaveProperty('toStatus.name', 'Reported');
  });

  it('should fail closed when multiple active citizen profiles share the same email', async () => {
    const owner = await registerAndLinkCitizenReporter('timeline-duplicate-citizen');
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const reportRes = await request(app)
      .post(`${BASE}/report`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        description: 'Timeline duplicate citizen incident',
        categoryId,
        severityId,
        ...buildTuguegaraoLocationSnapshot(),
      });

    expect(reportRes.status).toBe(201);

    await prisma.citizen.create({
      data: {
        name: 'Duplicate Citizen',
        contactInfo: owner.email,
        preferredChannel: 'app',
      },
    });

    const timelineRes = await request(app)
      .get(`${BASE}/${reportRes.body.id}/timeline`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(timelineRes.status).toBe(409);
    expect(timelineRes.body.message).toMatch(/Multiple active citizen profiles/i);
  });
});

describe('Phase 1 trust-layer incident reads', () => {
  let tuguegaraoCityId = '';
  let outOfCityDispatcherToken = '';
  let responderToken = '';
  let auditorToken = '';

  beforeAll(async () => {
    const cityScope = await ensureTuguegaraoCityScope();
    tuguegaraoCityId = cityScope.city.id;
    responderToken = await getTokenForRole('responder@xypes.local');
    auditorToken = await getTokenForRole('auditor@xypes.local');

    const partnerCity = await ensurePartnerCityScope();
    outOfCityDispatcherToken = await ensureScopedUserToken({
      email: 'phase1.dispatcher@xypes.local',
      name: 'Phase 1 Out-of-City Dispatcher',
      role: 'DISPATCHER',
      jurisdictionType: 'city',
      jurisdictionId: partnerCity.id,
    });
  });

  it('should block an out-of-city dispatcher from list and detail reads', async () => {
    const owner = await registerAndLinkCitizenReporter('phase1-out-of-city');
    const incident = await createTrustScopedIncident({
      label: 'phase1-out-of-city',
      reporterToken: owner.token,
    });

    const listRes = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${outOfCityDispatcherToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.some((entry: { id: string }) => entry.id === incident.incidentId)).toBe(
      false,
    );

    const detailRes = await request(app)
      .get(`${BASE}/${incident.incidentId}`)
      .set('Authorization', `Bearer ${outOfCityDispatcherToken}`);

    expect(detailRes.status).toBe(404);
  });

  it('should block an unassigned responder from list, detail, and media reads', async () => {
    const owner = await registerAndLinkCitizenReporter('phase1-responder-blocked');
    const incident = await createTrustScopedIncident({
      label: 'phase1-responder-blocked',
      reporterToken: owner.token,
    });

    const listRes = await request(app).get(BASE).set('Authorization', `Bearer ${responderToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.some((entry: { id: string }) => entry.id === incident.incidentId)).toBe(
      false,
    );

    const detailRes = await request(app)
      .get(`${BASE}/${incident.incidentId}`)
      .set('Authorization', `Bearer ${responderToken}`);

    expect(detailRes.status).toBe(404);

    const mediaRes = await request(app)
      .get(`${BASE}/${incident.incidentId}/media/${incident.mediaId}`)
      .set('Authorization', `Bearer ${responderToken}`);

    expect(mediaRes.status).toBe(404);
  });

  it('should allow an assigned responder on list, detail, and media reads', async () => {
    const owner = await registerAndLinkCitizenReporter('phase1-responder-allowed');
    const incident = await createTrustScopedIncident({
      label: 'phase1-responder-allowed',
      reporterToken: owner.token,
    });

    await assignResponderToIncident({
      incidentId: incident.incidentId,
      cityMunicipalityId: tuguegaraoCityId,
    });

    const listRes = await request(app).get(BASE).set('Authorization', `Bearer ${responderToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.some((entry: { id: string }) => entry.id === incident.incidentId)).toBe(
      true,
    );

    const detailRes = await request(app)
      .get(`${BASE}/${incident.incidentId}`)
      .set('Authorization', `Bearer ${responderToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body).toHaveProperty('id', incident.incidentId);

    const mediaRes = await request(app)
      .get(`${BASE}/${incident.incidentId}/media/${incident.mediaId}`)
      .set('Authorization', `Bearer ${responderToken}`);

    expect(mediaRes.status).toBe(200);
    expect(mediaRes.body).toMatchObject({
      incidentId: incident.incidentId,
      mediaId: incident.mediaId,
    });
  });

  it('should block unsupported roles from Phase 1 incident read routes', async () => {
    const owner = await registerAndLinkCitizenReporter('phase1-unsupported-role');
    const incident = await createTrustScopedIncident({
      label: 'phase1-unsupported-role',
      reporterToken: owner.token,
    });

    const listRes = await request(app).get(BASE).set('Authorization', `Bearer ${auditorToken}`);
    expect(listRes.status).toBe(403);

    const detailRes = await request(app)
      .get(`${BASE}/${incident.incidentId}`)
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(detailRes.status).toBe(403);
  });
});

describe(`POST ${BASE}/media/upload`, () => {
  const originalStorageEnabled = process.env.SUPABASE_STORAGE_ENABLED;
  const originalStorageAccessMode = process.env.SUPABASE_STORAGE_ACCESS_MODE;

  afterEach(() => {
    if (originalStorageEnabled === undefined) {
      delete process.env.SUPABASE_STORAGE_ENABLED;
    } else {
      process.env.SUPABASE_STORAGE_ENABLED = originalStorageEnabled;
    }

    if (originalStorageAccessMode === undefined) {
      delete process.env.SUPABASE_STORAGE_ACCESS_MODE;
    } else {
      process.env.SUPABASE_STORAGE_ACCESS_MODE = originalStorageAccessMode;
    }

    jest.restoreAllMocks();
  });

  it('should respect the configured incident media upload feature', async () => {
    if (!incidentMediaUploadEnabled) {
      const res = await request(app)
        .post(`${BASE}/media/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fileName: 'incident-photo.jpg',
          contentType: 'image/jpeg',
          dataBase64: Buffer.from('test-image').toString('base64'),
        });

      expect(res.status).toBe(404);
      return;
    }

    jest
      .spyOn(supabaseStorageService, 'uploadIncidentMedia')
      .mockRejectedValueOnce(
        new supabaseStorageService.SupabaseStorageServiceError(
          'SUPABASE_STORAGE_DISABLED',
          'Supabase Storage is disabled for this environment',
          503,
        ),
      );

    const res = await request(app)
      .post(`${BASE}/media/upload`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fileName: 'incident-photo.jpg',
        contentType: 'image/jpeg',
        dataBase64: Buffer.from('test-image').toString('base64'),
      });

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      message: 'Supabase Storage is disabled for this environment',
    });
  });

  it('should return 400 when required upload fields are missing', async () => {
    if (!incidentMediaUploadEnabled) {
      const res = await request(app)
        .post(`${BASE}/media/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fileName: 'incident-photo.jpg' });

      expect(res.status).toBe(404);
      return;
    }

    const res = await request(app)
      .post(`${BASE}/media/upload`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fileName: 'incident-photo.jpg' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should upload incident media and return a reusable mediaUrl', async () => {
    if (!incidentMediaUploadEnabled) {
      const res = await request(app)
        .post(`${BASE}/media/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          files: [
            {
              fileName: 'Test Upload Photo.JPG',
              contentType: 'image/jpeg',
              dataBase64: Buffer.from('test-image').toString('base64'),
            },
          ],
        });

      expect(res.status).toBe(404);
      return;
    }

    const uploadSpy = jest
      .spyOn(supabaseStorageService, 'uploadIncidentMedia')
      .mockResolvedValueOnce({
        bucket: 'incident-media',
        objectPath: 'incidents/2026/04/admin/test-upload-photo.jpg',
        mediaUrl: 'https://example.supabase.co/storage/v1/object/public/incident-media/test.jpg',
        accessUrl: 'https://example.supabase.co/storage/v1/object/public/incident-media/test.jpg',
        contentType: 'image/jpeg',
        fileName: 'test-upload-photo.jpg',
        size: 10,
      })
      .mockResolvedValueOnce({
        bucket: 'incident-media',
        objectPath: 'incidents/2026/04/admin/test-upload-video.mp4',
        mediaUrl: 'https://example.supabase.co/storage/v1/object/public/incident-media/test.mp4',
        accessUrl: 'https://example.supabase.co/storage/v1/object/public/incident-media/test.mp4',
        contentType: 'video/mp4',
        fileName: 'test-upload-video.mp4',
        size: 16,
      });

    const res = await request(app)
      .post(`${BASE}/media/upload`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        files: [
          {
            fileName: 'Test Upload Photo.JPG',
            contentType: 'image/jpeg',
            dataBase64: Buffer.from('test-image').toString('base64'),
          },
          {
            fileName: 'Test Upload Video.MP4',
            contentType: 'video/mp4',
            dataBase64: Buffer.from('test-video-payload').toString('base64'),
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      mediaUrls: [
        'https://example.supabase.co/storage/v1/object/public/incident-media/test.jpg',
        'https://example.supabase.co/storage/v1/object/public/incident-media/test.mp4',
      ],
      accessUrls: [
        'https://example.supabase.co/storage/v1/object/public/incident-media/test.jpg',
        'https://example.supabase.co/storage/v1/object/public/incident-media/test.mp4',
      ],
    });
    expect(res.body.files).toHaveLength(2);
    expect(uploadSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        fileName: 'Test Upload Photo.JPG',
        contentType: 'image/jpeg',
      }),
    );
    expect(uploadSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        fileName: 'Test Upload Video.MP4',
        contentType: 'video/mp4',
      }),
    );
  });

  it('should return managed references plus accessUrls when signed storage mode is enabled', async () => {
    if (!incidentMediaUploadEnabled) {
      const res = await request(app)
        .post(`${BASE}/media/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fileName: 'incident-photo.jpg',
          contentType: 'image/jpeg',
          dataBase64: Buffer.from('test-image').toString('base64'),
        });

      expect(res.status).toBe(404);
      return;
    }

    process.env.SUPABASE_STORAGE_ACCESS_MODE = 'signed';

    jest.spyOn(supabaseStorageService, 'uploadIncidentMedia').mockResolvedValueOnce({
      bucket: 'incident-media',
      objectPath: 'incidents/2026/04/admin/private-photo.jpg',
      mediaUrl: 'supabase://incident-media/incidents/2026/04/admin/private-photo.jpg',
      accessUrl:
        'https://example.supabase.co/storage/v1/object/sign/incident-media/private-photo.jpg?token=signed',
      contentType: 'image/jpeg',
      fileName: 'private-photo.jpg',
      size: 10,
    });

    const res = await request(app)
      .post(`${BASE}/media/upload`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fileName: 'Private Photo.jpg',
        contentType: 'image/jpeg',
        dataBase64: Buffer.from('test-image').toString('base64'),
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      mediaUrls: ['supabase://incident-media/incidents/2026/04/admin/private-photo.jpg'],
      accessUrls: [
        'https://example.supabase.co/storage/v1/object/sign/incident-media/private-photo.jpg?token=signed',
      ],
    });
    expect(res.body.files[0]).toMatchObject({
      mediaUrl: 'supabase://incident-media/incidents/2026/04/admin/private-photo.jpg',
      accessUrl:
        'https://example.supabase.co/storage/v1/object/sign/incident-media/private-photo.jpg?token=signed',
    });
  });
});

describe('incident media persistence', () => {
  const originalStorageAccessMode = process.env.SUPABASE_STORAGE_ACCESS_MODE;

  afterEach(() => {
    if (originalStorageAccessMode === undefined) {
      delete process.env.SUPABASE_STORAGE_ACCESS_MODE;
    } else {
      process.env.SUPABASE_STORAGE_ACCESS_MODE = originalStorageAccessMode;
    }

    jest.restoreAllMocks();
  });

  it('should create an incident with multiple mediaUrls and preserve order', async () => {
    process.env.SUPABASE_STORAGE_ACCESS_MODE = 'public';

    const mediaUrls = [
      'https://example.supabase.co/storage/v1/object/public/incident-media/photo-1.jpg',
      'https://example.supabase.co/storage/v1/object/public/incident-media/video-1.mp4',
    ];
    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Incident with multiple files',
        mediaUrls,
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(201);
    expect(res.body.mediaUrl).toBe(mediaUrls[0]);
    expect(res.body.mediaUrls).toEqual(mediaUrls);

    const fetchRes = await request(app)
      .get(`${BASE}/${res.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.mediaUrls).toEqual(res.body.mediaUrls);
  });

  it('should archive removed media when an incident media list is replaced', async () => {
    process.env.SUPABASE_STORAGE_ACCESS_MODE = 'public';

    const archiveSpy = jest
      .spyOn(supabaseStorageService, 'archiveIncidentMediaUrls')
      .mockResolvedValue([]);
    const originalMediaUrls = [
      'https://example.supabase.co/storage/v1/object/public/incident-media/original-photo.jpg',
      'https://example.supabase.co/storage/v1/object/public/incident-media/original-video.mp4',
    ];

    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Incident media replacement target',
        mediaUrls: originalMediaUrls,
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(createRes.status).toBe(201);

    const patchRes = await request(app)
      .patch(`${BASE}/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        mediaUrls: [
          'https://example.supabase.co/storage/v1/object/public/incident-media/replacement-photo.jpg',
        ],
      });

    expect(patchRes.status).toBe(200);
    expect(archiveSpy).toHaveBeenCalledWith(originalMediaUrls);
  });

  it('should store managed references while returning resolved access URLs', async () => {
    process.env.SUPABASE_STORAGE_ACCESS_MODE = 'signed';

    const archiveSpy = jest
      .spyOn(supabaseStorageService, 'archiveIncidentMediaUrls')
      .mockResolvedValue([]);
    const resolveSpy = jest
      .spyOn(supabaseStorageService, 'resolveIncidentMediaUrls')
      .mockImplementation(async (mediaUrls) =>
        mediaUrls.map((mediaUrl) =>
          mediaUrl.replace('supabase://incident-media/', 'https://signed.example/'),
        ),
      );

    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Incident with managed media reference',
        mediaUrls: ['supabase://incident-media/incidents/private/original-photo.jpg'],
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.mediaUrls).toEqual([
      'https://signed.example/incidents/private/original-photo.jpg',
    ]);

    const patchRes = await request(app)
      .patch(`${BASE}/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        mediaUrls: ['supabase://incident-media/incidents/private/replacement-photo.jpg'],
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.mediaUrls).toEqual([
      'https://signed.example/incidents/private/replacement-photo.jpg',
    ]);
    expect(archiveSpy).toHaveBeenCalledWith([
      'supabase://incident-media/incidents/private/original-photo.jpg',
    ]);
    expect(resolveSpy).toHaveBeenCalled();
  });

  it('should return a just-in-time access URL for a stored incident media file', async () => {
    const resolveSpy = jest
      .spyOn(supabaseStorageService, 'resolveIncidentMediaUrls')
      .mockImplementation(async (mediaUrls) =>
        mediaUrls.map((mediaUrl) =>
          mediaUrl.replace('supabase://incident-media/', 'https://signed.example/'),
        ),
      );

    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Incident media access target',
        mediaUrls: ['supabase://incident-media/incidents/private/access-photo.jpg'],
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(createRes.status).toBe(201);

    const incidentRecord = await prisma.citizenIncident.findUniqueOrThrow({
      where: { id: createRes.body.id },
      include: {
        mediaFiles: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    const mediaId = incidentRecord.mediaFiles[0]?.id;
    expect(mediaId).toBeTruthy();

    const accessRes = await request(app)
      .get(`${BASE}/${createRes.body.id}/media/${mediaId as string}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(accessRes.status).toBe(200);
    expect(accessRes.body).toMatchObject({
      incidentId: createRes.body.id,
      mediaId,
      displayOrder: 0,
      mediaUrl: 'supabase://incident-media/incidents/private/access-photo.jpg',
      accessUrl: 'https://signed.example/incidents/private/access-photo.jpg',
    });
    expect(resolveSpy).toHaveBeenCalledWith([
      'supabase://incident-media/incidents/private/access-photo.jpg',
    ]);
  });

  it('should archive the incident record without archiving storage media when an incident is deleted', async () => {
    const archiveSpy = jest
      .spyOn(supabaseStorageService, 'archiveIncidentMediaUrls')
      .mockResolvedValue([]);

    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Incident delete archive target',
        mediaUrls: [
          'https://example.supabase.co/storage/v1/object/public/incident-media/delete-photo.jpg',
          'https://example.supabase.co/storage/v1/object/public/incident-media/delete-video.mp4',
        ],
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(createRes.status).toBe(201);

    const deleteRes = await request(app)
      .delete(`${BASE}/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(204);

    const fetchRes = await request(app)
      .get(`${BASE}/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(fetchRes.status).toBe(404);

    if (archiveEnabled) {
      expect(archiveSpy).not.toHaveBeenCalled();
      return;
    }

    expect(archiveSpy).toHaveBeenCalledWith([
      'https://example.supabase.co/storage/v1/object/public/incident-media/delete-photo.jpg',
      'https://example.supabase.co/storage/v1/object/public/incident-media/delete-video.mp4',
    ]);
  });

  it('should handle incident restore behavior according to archive mode', async () => {
    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const agencyRes = await request(app)
      .post(`${API_V1}/agencies`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `IncidentRestoreAgency-${Date.now()}` });
    expect(agencyRes.status).toBe(201);

    const responderRes = await request(app)
      .post(`${API_V1}/responders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `IncidentRestoreResponder-${Date.now()}`,
        agencyId: agencyRes.body.id,
        role: 'Field Responder',
        contactInfo: `restore-${Date.now()}@mail.com`,
      });
    expect(responderRes.status).toBe(201);

    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Incident restore target',
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });
    expect(createRes.status).toBe(201);

    const assignmentRes = await request(app)
      .post(`${API_V1}/assignments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        incidentId: createRes.body.id,
        responderId: responderRes.body.id,
      });
    expect(assignmentRes.status).toBe(201);

    const deleteRes = await request(app)
      .delete(`${BASE}/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (!archiveEnabled) {
      expect(deleteRes.status).toBe(409);

      const restoreRes = await request(app)
        .post(`${BASE}/${createRes.body.id}/restore`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(restoreRes.status).toBe(404);
      return;
    }

    expect(deleteRes.status).toBe(204);

    const assignmentAfterDeleteRes = await request(app)
      .get(`${API_V1}/assignments/${assignmentRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(assignmentAfterDeleteRes.status).toBe(404);

    const restoreRes = await request(app)
      .post(`${BASE}/${createRes.body.id}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body).toHaveProperty('id', createRes.body.id);

    const assignmentAfterRestoreRes = await request(app)
      .get(`${API_V1}/assignments/${assignmentRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(assignmentAfterRestoreRes.status).toBe(200);
  });
});

describe('VIEWER incident scoping', () => {
  let viewerToken = '';
  let viewerIncidentId = '';
  let viewerCitizenId = '';
  let viewerCategoryId = '';
  let viewerSeverityId = '';

  beforeAll(async () => {
    const unique = Date.now();
    const email = `viewer.${unique}@postman.local`;

    const registerRes = await request(app)
      .post(`${API_V1}/auth/register`)
      .send({
        name: `Viewer ${unique}`,
        email,
        password: 'Password123!',
      });
    expect(registerRes.status).toBe(201);
    viewerToken = registerRes.body.token;

    const linkRes = await request(app)
      .post(`${API_V1}/citizens/link-me`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        name: `Linked Viewer ${unique}`,
        preferredChannel: 'app',
      });
    expect([200, 201]).toContain(linkRes.status);
    viewerCitizenId = linkRes.body.id;

    viewerCategoryId = await createCategory();
    viewerSeverityId = await createSeverity();

    const reportRes = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Viewer-owned incident',
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
        ...buildIncidentLocationSnapshot(),
      });
    expect(reportRes.status).toBe(201);
    viewerIncidentId = reportRes.body.id;
  });

  it('GET /incidents returns only the authenticated viewer incidents', async () => {
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((incident: { citizenId: string }) => {
      expect(incident.citizenId).toBe(viewerCitizenId);
    });
  });

  it('GET /incidents/:id returns 404 for incidents not owned by the viewer', async () => {
    const ownIncident = await request(app)
      .get(`${BASE}/${viewerIncidentId}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(ownIncident.status).toBe(200);

    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const otherIncidentRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Admin-owned incident for viewer-scope test',
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });
    expect(otherIncidentRes.status).toBe(201);

    const blocked = await request(app)
      .get(`${BASE}/${otherIncidentRes.body.id}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(blocked.status).toBe(404);
  });

  it('GET /incidents/:id/media/:mediaId returns 404 for media on incidents not owned by the viewer', async () => {
    const statusId = await getStatusId();
    const citizenId = await createCitizen();
    const categoryId = await createCategory();
    const severityId = await createSeverity();

    const otherIncidentRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Admin-owned incident media for viewer-scope test',
        mediaUrls: ['supabase://incident-media/incidents/private/viewer-blocked-photo.jpg'],
        statusId,
        citizenId,
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });
    expect(otherIncidentRes.status).toBe(201);

    const incidentRecord = await prisma.citizenIncident.findUniqueOrThrow({
      where: { id: otherIncidentRes.body.id },
      include: {
        mediaFiles: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    const blocked = await request(app)
      .get(
        `${BASE}/${otherIncidentRes.body.id}/media/${incidentRecord.mediaFiles[0]?.id as string}`,
      )
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(blocked.status).toBe(404);
  });

  it('POST /citizens/link-me rejects contactInfo from client payload', async () => {
    const res = await request(app)
      .post(`${API_V1}/citizens/link-me`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        name: 'Attempted Override',
        preferredChannel: 'app',
        contactInfo: 'spoofed@example.com',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('POST /incidents/report rejects client-provided citizenId', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Should fail because citizenId is forbidden',
        citizenId: 'not-a-real-uuid',
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('POST /incidents/report rejects client-provided statusId', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Should fail because statusId is forbidden',
        statusId: 'uuid-status-1',
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('POST /incidents/report rejects client-provided canonical locality ids', async () => {
    const { region, province, city } = await ensureTuguegaraoCityScope();
    const barangayRecord = await prisma.barangay.upsert({
      where: { code: 'PH-021517-010' },
      update: {
        name: 'Centro 10',
        cityMunicipalityId: city.id,
        archivedAt: null,
      },
      create: {
        code: 'PH-021517-010',
        name: 'Centro 10',
        cityMunicipalityId: city.id,
      },
    });

    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Should fail because canonical locality ids are forbidden',
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
        ...buildIncidentLocationSnapshot(),
        regionId: region.id,
        provinceId: province.id,
        cityMunicipalityId: city.id,
        barangayId: barangayRecord.id,
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'regionId' }),
        expect.objectContaining({ field: 'provinceId' }),
        expect.objectContaining({ field: 'cityMunicipalityId' }),
        expect.objectContaining({ field: 'barangayId' }),
      ]),
    );
  });

  it('POST /incidents/report accepts coordinate snapshot payload', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Viewer geo incident',
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('latitude');
  });

  it('POST /incidents/report auto-assigns Reported status', async () => {
    const reportedStatusId = await getStatusId('Reported');
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Auto status test',
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('statusId', reportedStatusId);
  });

  it('POST /incidents/report accepts valid UUID IDs', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Valid UUID id payload',
        categoryId: viewerCategoryId,
        severityId: viewerSeverityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('POST /incidents/report returns 400 for invalid UUID IDs', async () => {
    const res = await request(app)
      .post(`${API_V1}/incidents/report`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        description: 'Bad string id payload',
        categoryId: 'uuid-category-1',
        severityId: 'uuid-severity-1',
        ...buildIncidentLocationSnapshot(),
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });
});
