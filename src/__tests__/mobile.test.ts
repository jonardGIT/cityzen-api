import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';
import * as cagayanMobileGeographyService from '../services/cagayanMobileGeographyService.js';
import { MANUAL_LINK_REQUIRED_LINKED_CITIZEN_MESSAGE } from '../services/userCitizenLinkService.js';
import { withActiveRecords } from '../utils/archive.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';
import {
  buildIncidentLocationSnapshot,
  createCategory,
  createSeverity,
} from './helpers/factories.js';

jest.setTimeout(120000);

const MOBILE_BASE = `${API_V1}/mobile`;
const MOBILE_CONTENT_BASE = `${API_V1}/mobile-content`;

let adminToken = '';
let contentEditorToken = '';

afterEach(() => {
  jest.restoreAllMocks();
});

async function registerCitizenReporter(uniqueLabel: string): Promise<{
  token: string;
  email: string;
}> {
  const unique = `${uniqueLabel}-${Date.now()}-${Math.random()}`;
  const email = `${unique}@postman.local`;

  const response = await request(app)
    .post(`${API_V1}/auth/register`)
    .send({
      name: `Mobile Citizen ${unique}`,
      email,
      password: 'Password123!',
    });

  expect(response.status).toBe(201);

  return {
    token: response.body.token as string,
    email,
  };
}

beforeAll(async () => {
  [adminToken, contentEditorToken] = await Promise.all([
    getAdminToken(),
    getTokenForRole('content.editor@xypes.local'),
  ]);
});

describe(`PATCH ${MOBILE_BASE}/profile and GET ${MOBILE_BASE}/profile`, () => {
  it('creates and returns the authenticated citizen profile using the linked user account', async () => {
    const reporter = await registerCitizenReporter('mobile-profile');

    const initialGet = await request(app)
      .get(`${MOBILE_BASE}/profile`)
      .set('Authorization', `Bearer ${reporter.token}`);

    expect(initialGet.status).toBe(404);

    const patchRes = await request(app)
      .patch(`${MOBILE_BASE}/profile`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({
        name: 'Mobile Profile Owner',
        preferredChannel: 'app',
      });

    expect(patchRes.status).toBe(201);
    expect(patchRes.body).toMatchObject({
      name: 'Mobile Profile Owner',
      preferredChannel: 'app',
      contactInfo: reporter.email,
    });

    const getRes = await request(app)
      .get(`${MOBILE_BASE}/profile`)
      .set('Authorization', `Bearer ${reporter.token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body).toMatchObject({
      id: patchRes.body.id,
      name: 'Mobile Profile Owner',
      preferredChannel: 'app',
      contactInfo: reporter.email,
    });

    const updateRes = await request(app)
      .patch(`${MOBILE_BASE}/profile`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({
        preferredChannel: 'sms',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body).toMatchObject({
      id: patchRes.body.id,
      preferredChannel: 'sms',
    });
  });

  it('requires manual linking when exactly one legacy citizen matches the authenticated account', async () => {
    const reporter = await registerCitizenReporter('mobile-legacy-profile');

    const legacyCitizen = await prisma.citizen.create({
      data: {
        name: 'Mobile Legacy Citizen',
        contactInfo: reporter.email,
        preferredChannel: 'sms',
      },
    });

    const patchRes = await request(app)
      .patch(`${MOBILE_BASE}/profile`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({
        name: 'Should Not Create Mobile Duplicate',
        preferredChannel: 'app',
      });

    expect(patchRes.status).toBe(409);
    expect(patchRes.body).toEqual({
      message: MANUAL_LINK_REQUIRED_LINKED_CITIZEN_MESSAGE,
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: reporter.email },
      select: { citizenId: true },
    });

    expect(user.citizenId).toBeNull();

    const matchedCitizens = await prisma.citizen.findMany({
      where: { contactInfo: reporter.email },
      select: { id: true },
    });

    expect(matchedCitizens).toEqual([{ id: legacyCitizen.id }]);
  });

  it('accepts locality and address updates for an existing linked citizen', async () => {
    const reporter = await registerCitizenReporter('mobile-profile-address');

    const [tuguegaraoCity, centroBarangay] = await Promise.all([
      prisma.cityMunicipality.findUniqueOrThrow({
        where: { code: '021529000' },
        select: { id: true, code: true, name: true, type: true },
      }),
      prisma.barangay.findUniqueOrThrow({
        where: { code: '021529001' },
        select: { id: true, code: true, name: true },
      }),
    ]);

    const createRes = await request(app)
      .patch(`${MOBILE_BASE}/profile`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({
        name: 'Mobile Address Owner',
        preferredChannel: 'app',
      });

    expect(createRes.status).toBe(201);

    const updateRes = await request(app)
      .patch(`${MOBILE_BASE}/profile`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({
        addressLine1: 'Door 4, Rizal Street',
        addressLine2: 'Near plaza',
        cityMunicipalityId: tuguegaraoCity.id,
        barangayId: centroBarangay.id,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body).toMatchObject({
      id: createRes.body.id,
      addressLine1: 'Door 4, Rizal Street',
      addressLine2: 'Near plaza',
      cityMunicipalityId: tuguegaraoCity.id,
      barangayId: centroBarangay.id,
      locality: {
        id: tuguegaraoCity.id,
        code: tuguegaraoCity.code,
        name: tuguegaraoCity.name,
        type: tuguegaraoCity.type,
      },
      barangay: {
        id: centroBarangay.id,
        code: centroBarangay.code,
        name: centroBarangay.name,
      },
    });

    const getRes = await request(app)
      .get(`${MOBILE_BASE}/profile`)
      .set('Authorization', `Bearer ${reporter.token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body).toMatchObject({
      addressLine1: 'Door 4, Rizal Street',
      addressLine2: 'Near plaza',
      cityMunicipalityId: tuguegaraoCity.id,
      barangayId: centroBarangay.id,
    });
  });

  it('rejects barangay-only updates and invalid locality barangay pairings', async () => {
    const reporter = await registerCitizenReporter('mobile-profile-validation');

    const [tuguegaraoCity, ilaganBarangay] = await Promise.all([
      prisma.cityMunicipality.findUniqueOrThrow({
        where: { code: '021529000' },
        select: { id: true },
      }),
      prisma.barangay.findUniqueOrThrow({
        where: { code: '023101001' },
        select: { id: true },
      }),
    ]);

    const createRes = await request(app)
      .patch(`${MOBILE_BASE}/profile`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({
        name: 'Mobile Validation Owner',
        preferredChannel: 'app',
      });

    expect(createRes.status).toBe(201);

    const missingLocalityRes = await request(app)
      .patch(`${MOBILE_BASE}/profile`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({
        barangayId: ilaganBarangay.id,
      });

    expect(missingLocalityRes.status).toBe(422);
    expect(missingLocalityRes.body).toEqual({
      message: 'cityMunicipalityId is required when barangayId is provided',
    });

    const invalidPairingRes = await request(app)
      .patch(`${MOBILE_BASE}/profile`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({
        cityMunicipalityId: tuguegaraoCity.id,
        barangayId: ilaganBarangay.id,
      });

    expect(invalidPairingRes.status).toBe(404);
    expect(invalidPairingRes.body).toEqual({
      message: 'Active Cagayan barangay not found for the selected locality',
    });
  });

  it('accepts address-only updates when Cagayan geography configuration is unavailable', async () => {
    const reporter = await registerCitizenReporter('mobile-profile-address-only');

    const createRes = await request(app)
      .patch(`${MOBILE_BASE}/profile`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({
        name: 'Mobile Address Only Owner',
        preferredChannel: 'app',
      });

    expect(createRes.status).toBe(201);

    const provinceSpy = jest
      .spyOn(cagayanMobileGeographyService, 'getActiveCagayanProvince')
      .mockResolvedValueOnce(null);

    const updateRes = await request(app)
      .patch(`${MOBILE_BASE}/profile`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({
        addressLine1: 'Purok 1, Quiet Street',
        addressLine2: 'Landmark nearby',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body).toMatchObject({
      id: createRes.body.id,
      addressLine1: 'Purok 1, Quiet Street',
      addressLine2: 'Landmark nearby',
    });
    expect(provinceSpy).not.toHaveBeenCalled();
  });
});

describe(`GET ${MOBILE_BASE}/cagayan/localities and GET ${MOBILE_BASE}/cagayan/localities/:localityId/barangays`, () => {
  it('returns public geography metadata for offline-first cache checks while keeping Tuguegarao-first pilot scope metadata', async () => {
    const province = await prisma.province.findUniqueOrThrow({
      where: { code: '021500000' },
      select: { id: true, updatedAt: true },
    });

    const [localitiesAggregate, barangaysAggregate] = await Promise.all([
      prisma.cityMunicipality.aggregate({
        where: withActiveRecords({
          provinceId: province.id,
        }),
        _max: {
          updatedAt: true,
        },
      }),
      prisma.barangay.aggregate({
        where: withActiveRecords({
          cityMunicipality: withActiveRecords({
            provinceId: province.id,
          }),
        }),
        _max: {
          updatedAt: true,
        },
      }),
    ]);

    const lastUpdatedAt = [
      province.updatedAt,
      localitiesAggregate._max.updatedAt,
      barangaysAggregate._max.updatedAt,
    ].reduce<Date>((latest, current) => {
      if (!current || latest >= current) {
        return latest;
      }

      return current;
    }, province.updatedAt);

    const lastUpdatedAtIso = lastUpdatedAt.toISOString();

    const response = await request(app).get(`${MOBILE_BASE}/reference-data/geography/meta`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      scope: {
        pilotScope: 'tuguegarao-first',
        provinceCode: '021500000',
      },
      geographyVersion: `021500000:${lastUpdatedAtIso}`,
      lastUpdatedAt: lastUpdatedAtIso,
    });
  });

  it('returns 503 when public geography metadata is unavailable', async () => {
    jest
      .spyOn(cagayanMobileGeographyService, 'getActiveCagayanGeographyMeta')
      .mockResolvedValueOnce(null);

    const response = await request(app).get(`${MOBILE_BASE}/reference-data/geography/meta`);

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      message:
        'Mobile Cagayan locality reference is unavailable: active Cagayan province geography is not configured on the server.',
    });
  });

  it('returns public active Cagayan localities as province-wide reference data with more than one locality choice', async () => {
    const cagayanProvince = await prisma.province.findUniqueOrThrow({
      where: { code: '021500000' },
      select: { id: true },
    });

    await prisma.cityMunicipality.upsert({
      where: { code: '021518000' },
      update: {
        name: 'Amulung',
        type: 'MUNICIPALITY',
        provinceId: cagayanProvince.id,
        archivedAt: null,
      },
      create: {
        code: '021518000',
        name: 'Amulung',
        type: 'MUNICIPALITY',
        provinceId: cagayanProvince.id,
      },
    });

    const response = await request(app).get(`${MOBILE_BASE}/cagayan/localities`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      province: {
        code: '021500000',
        name: 'Cagayan',
      },
    });

    expect(response.body.localities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: '021518000',
          name: 'Amulung',
          type: 'MUNICIPALITY',
        }),
        expect.objectContaining({
          code: '021529000',
          name: 'Tuguegarao City',
          type: 'CITY',
        }),
      ]),
    );
    expect(response.body.localities).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: '023101000',
          name: 'Ilagan City',
        }),
      ]),
    );

    expect(response.body.localities).toEqual(
      [...response.body.localities].sort((left, right) => left.name.localeCompare(right.name)),
    );
    expect(response.body.localities[0]).toEqual({
      id: expect.any(String),
      code: expect.any(String),
      name: expect.any(String),
      type: expect.any(String),
    });
  });

  it('returns 503 when public Cagayan localities are unavailable', async () => {
    jest
      .spyOn(cagayanMobileGeographyService, 'getActiveCagayanProvince')
      .mockResolvedValueOnce(null);

    const response = await request(app).get(`${MOBILE_BASE}/cagayan/localities`);

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      message:
        'Mobile Cagayan locality reference is unavailable: active Cagayan province geography is not configured on the server.',
    });
  });

  it('returns only barangays for the selected active Cagayan locality', async () => {
    const tuguegaraoCity = await prisma.cityMunicipality.findUniqueOrThrow({
      where: { code: '021529000' },
      select: { id: true, code: true, name: true, type: true },
    });

    const response = await request(app).get(
      `${MOBILE_BASE}/cagayan/localities/${tuguegaraoCity.id}/barangays`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      locality: {
        id: tuguegaraoCity.id,
        code: tuguegaraoCity.code,
        name: tuguegaraoCity.name,
        type: tuguegaraoCity.type,
      },
    });
    expect(response.body.barangays).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: '021529001',
          name: 'Centro 01',
        }),
      ]),
    );
    expect(response.body.barangays).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: '023101001',
          name: 'San Felipe',
        }),
      ]),
    );
    expect(response.body.barangays).toHaveLength(
      new Set(response.body.barangays.map((barangay: { id: string }) => barangay.id)).size,
    );
    expect(response.body.barangays[0]).toEqual({
      id: expect.any(String),
      code: expect.any(String),
      name: expect.any(String),
    });
  });

  it('returns 503 when public Cagayan barangay reference data is unavailable', async () => {
    const tuguegaraoCity = await prisma.cityMunicipality.findUniqueOrThrow({
      where: { code: '021529000' },
      select: { id: true },
    });

    jest
      .spyOn(cagayanMobileGeographyService, 'getActiveCagayanProvince')
      .mockResolvedValueOnce(null);

    const response = await request(app).get(
      `${MOBILE_BASE}/cagayan/localities/${tuguegaraoCity.id}/barangays`,
    );

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      message:
        'Mobile Cagayan locality reference is unavailable: active Cagayan province geography is not configured on the server.',
    });
  });
});

describe(`POST ${MOBILE_BASE}/incidents/report`, () => {
  it('lets a linked citizen reporter create and read back only their own incident views', async () => {
    const reporter = await registerCitizenReporter('mobile-incident-owner');
    const otherReporter = await registerCitizenReporter('mobile-incident-other');
    const categoryId = await createCategory(adminToken);
    const severityId = await createSeverity(adminToken);

    const ownerProfileRes = await request(app)
      .patch(`${MOBILE_BASE}/profile`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({
        name: 'Owner Citizen',
        preferredChannel: 'app',
      });

    const otherProfileRes = await request(app)
      .patch(`${MOBILE_BASE}/profile`)
      .set('Authorization', `Bearer ${otherReporter.token}`)
      .send({
        name: 'Other Citizen',
        preferredChannel: 'app',
      });

    expect(ownerProfileRes.status).toBe(201);
    expect(otherProfileRes.status).toBe(201);

    const reportRes = await request(app)
      .post(`${MOBILE_BASE}/incidents/report`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({
        description: 'Mobile app incident report',
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(reportRes.status).toBe(201);
    expect(reportRes.body).toHaveProperty('id');

    const listRes = await request(app)
      .get(`${MOBILE_BASE}/incidents`)
      .set('Authorization', `Bearer ${reporter.token}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.some((incident: { id: string }) => incident.id === reportRes.body.id)).toBe(
      true,
    );

    const detailRes = await request(app)
      .get(`${MOBILE_BASE}/incidents/${reportRes.body.id}`)
      .set('Authorization', `Bearer ${reporter.token}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body).toHaveProperty('id', reportRes.body.id);

    const timelineRes = await request(app)
      .get(`${MOBILE_BASE}/incidents/${reportRes.body.id}/timeline`)
      .set('Authorization', `Bearer ${reporter.token}`);

    expect(timelineRes.status).toBe(200);
    expect(timelineRes.body.timeline).toHaveLength(1);
    expect(timelineRes.body.timeline[0]).toHaveProperty('status.name', 'Reported');

    const otherDetailRes = await request(app)
      .get(`${MOBILE_BASE}/incidents/${reportRes.body.id}`)
      .set('Authorization', `Bearer ${otherReporter.token}`);

    expect(otherDetailRes.status).toBe(404);
  });

  it('recreates the canonical Reported status when no active baseline status exists', async () => {
    const reporter = await registerCitizenReporter('mobile-incident-reported-status');
    const categoryId = await createCategory(adminToken);
    const severityId = await createSeverity(adminToken);

    const profileRes = await request(app)
      .patch(`${MOBILE_BASE}/profile`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({
        name: 'Reported Status Citizen',
        preferredChannel: 'app',
      });

    expect(profileRes.status).toBe(201);

    await prisma.status.updateMany({
      where: {
        archivedAt: null,
        name: {
          equals: 'Reported',
          mode: 'insensitive',
        },
      },
      data: {
        archivedAt: new Date(),
      },
    });

    const reportRes = await request(app)
      .post(`${MOBILE_BASE}/incidents/report`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({
        description: 'Mobile app incident report without seeded Reported status',
        categoryId,
        severityId,
        ...buildIncidentLocationSnapshot(),
      });

    expect(reportRes.status).toBe(201);
    expect(reportRes.body).toHaveProperty('status.name', 'Reported');

    const activeReportedStatuses = await prisma.status.findMany({
      where: {
        archivedAt: null,
        name: {
          equals: 'Reported',
          mode: 'insensitive',
        },
      },
      select: { id: true, name: true },
    });

    expect(activeReportedStatuses).toEqual([
      {
        id: expect.any(String),
        name: 'Reported',
      },
    ]);
  });
});

describe(`GET ${MOBILE_BASE}/content and CRUD ${MOBILE_CONTENT_BASE}`, () => {
  it('returns only generic published content even when a caller supplies an audience filter', async () => {
    const genericPublishedRes = await request(app)
      .post(MOBILE_CONTENT_BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slug: `mobile-generic-${Date.now()}`,
        title: 'Generic Mobile Banner',
        summary: 'Shown to all mobile readers',
        body: 'Generic mobile content body',
        contentType: 'announcement',
        placement: 'home',
        sortOrder: 1,
        isPublished: true,
        publishedAt: new Date().toISOString(),
      });

    const citizenPublishedRes = await request(app)
      .post(MOBILE_CONTENT_BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slug: `mobile-home-${Date.now()}`,
        title: 'Citizen Mobile Banner',
        summary: 'Shown in the home placement',
        body: 'Important mobile content body',
        contentType: 'announcement',
        placement: 'home',
        audience: 'citizen',
        sortOrder: 2,
        isPublished: true,
        publishedAt: new Date().toISOString(),
        metadata: { highlight: true },
      });

    const draftRes = await request(app)
      .post(MOBILE_CONTENT_BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slug: `mobile-draft-${Date.now()}`,
        title: 'Draft Mobile Banner',
        body: 'This should stay hidden',
        contentType: 'announcement',
        placement: 'home',
        sortOrder: 2,
        isPublished: false,
      });

    expect(genericPublishedRes.status).toBe(201);
    expect(citizenPublishedRes.status).toBe(201);
    expect(draftRes.status).toBe(201);

    const adminListRes = await request(app)
      .get(MOBILE_CONTENT_BASE)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminListRes.status).toBe(200);
    expect(Array.isArray(adminListRes.body)).toBe(true);
    expect(
      adminListRes.body.some((item: { id: string }) => item.id === genericPublishedRes.body.id),
    ).toBe(true);
    expect(
      adminListRes.body.some((item: { id: string }) => item.id === citizenPublishedRes.body.id),
    ).toBe(true);

    const mobileDefaultReaderRes = await request(app).get(`${MOBILE_BASE}/content?placement=home`);

    expect(mobileDefaultReaderRes.status).toBe(200);
    expect(Array.isArray(mobileDefaultReaderRes.body)).toBe(true);
    expect(mobileDefaultReaderRes.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: genericPublishedRes.body.id,
          slug: genericPublishedRes.body.slug,
          title: 'Generic Mobile Banner',
          placement: 'home',
          audience: null,
        }),
      ]),
    );
    expect(
      mobileDefaultReaderRes.body.some(
        (item: { id: string }) => item.id === citizenPublishedRes.body.id,
      ),
    ).toBe(false);

    const mobileReaderRes = await request(app).get(
      `${MOBILE_BASE}/content?placement=home&audience=citizen`,
    );

    expect(mobileReaderRes.status).toBe(200);
    expect(Array.isArray(mobileReaderRes.body)).toBe(true);
    expect(mobileReaderRes.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: genericPublishedRes.body.id,
          slug: genericPublishedRes.body.slug,
          title: 'Generic Mobile Banner',
          placement: 'home',
          audience: null,
        }),
      ]),
    );
    expect(
      mobileReaderRes.body.some((item: { id: string }) => item.id === citizenPublishedRes.body.id),
    ).toBe(false);
    expect(mobileReaderRes.body.some((item: { id: string }) => item.id === draftRes.body.id)).toBe(
      false,
    );
  });

  it('returns seeded-style Tuguegarao content by placement while keeping drafts hidden', async () => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;

    const seededStyleItems = [
      {
        slug: `tuguegarao-home-${unique}`,
        title: 'Water Interruption Advisory For Tuguegarao City',
        summary:
          'Scheduled maintenance may affect evening water availability in selected barangays.',
        body: 'The city government advises households in affected Tuguegarao barangays to store enough water before the scheduled maintenance window.',
        contentType: 'advisory',
        placement: 'home',
        sortOrder: 1,
        isPublished: true,
        publishedAt: new Date().toISOString(),
        metadata: { city: 'Tuguegarao City', featureStyle: 'hero' },
      },
      {
        slug: `tuguegarao-news-${unique}`,
        title: 'Digital Permit Week Opens At City Hall',
        summary: 'Residents can complete guided permit assistance and account setup this week.',
        body: 'MyTuguegarao digital services staff will host a week-long permit assistance drive at City Hall.',
        contentType: 'news',
        placement: 'news',
        sortOrder: 2,
        isPublished: true,
        publishedAt: new Date().toISOString(),
        metadata: { city: 'Tuguegarao City', featureStyle: 'featured' },
      },
      {
        slug: `tuguegarao-alert-${unique}`,
        title: 'Cagayan River Watch Alerts Remain Active',
        summary: 'River monitoring continues as water levels stay above the city watch threshold.',
        body: 'Residents near low-lying areas should watch for official updates and prepare for possible late-night advisories.',
        contentType: 'emergency-alert',
        placement: 'alerts',
        sortOrder: 1,
        isPublished: true,
        publishedAt: new Date().toISOString(),
        metadata: { city: 'Tuguegarao City', featureStyle: 'alert' },
      },
      {
        slug: `tuguegarao-draft-${unique}`,
        title: 'Barangay Cleanup Campaign Preview',
        summary: "Draft copy for next week's community cleanup drive.",
        body: 'Draft community cleanup campaign content pending final approval from the city communications team.',
        contentType: 'campaign',
        placement: 'home',
        sortOrder: 4,
        isPublished: false,
        metadata: { city: 'Tuguegarao City', featureStyle: 'draft' },
      },
    ] as const;

    for (const item of seededStyleItems) {
      const createRes = await request(app)
        .post(MOBILE_CONTENT_BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(item);

      expect(createRes.status).toBe(201);
    }

    const homeRes = await request(app).get(`${MOBILE_BASE}/content?placement=home`);
    const newsRes = await request(app).get(`${MOBILE_BASE}/content?placement=news`);
    const alertsRes = await request(app).get(`${MOBILE_BASE}/content?placement=alerts`);

    expect(homeRes.status).toBe(200);
    expect(newsRes.status).toBe(200);
    expect(alertsRes.status).toBe(200);

    expect(homeRes.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: `tuguegarao-home-${unique}`,
          title: 'Water Interruption Advisory For Tuguegarao City',
          placement: 'home',
        }),
      ]),
    );
    expect(
      homeRes.body.some((item: { slug: string }) => item.slug === `tuguegarao-draft-${unique}`),
    ).toBe(false);

    expect(newsRes.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: `tuguegarao-news-${unique}`,
          title: 'Digital Permit Week Opens At City Hall',
          placement: 'news',
        }),
      ]),
    );
    expect(
      newsRes.body.some((item: { slug: string }) => item.slug === `tuguegarao-home-${unique}`),
    ).toBe(false);

    expect(alertsRes.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: `tuguegarao-alert-${unique}`,
          title: 'Cagayan River Watch Alerts Remain Active',
          placement: 'alerts',
        }),
      ]),
    );
    expect(
      alertsRes.body.some((item: { slug: string }) => item.slug === `tuguegarao-draft-${unique}`),
    ).toBe(false);
  });
});

it('lets CITY_CONTENT_EDITOR publish a draft into the public mobile feed', async () => {
  const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;

  const createRes = await request(app)
    .post(MOBILE_CONTENT_BASE)
    .set('Authorization', `Bearer ${contentEditorToken}`)
    .send({
      slug: `editor-publish-${unique}`,
      title: 'Editor Publish Flow Advisory',
      summary: 'Draft advisory created by the city content editor.',
      body: 'This draft should only appear in the public feed after publication.',
      contentType: 'advisory',
      placement: 'home',
      sortOrder: 3,
      isPublished: false,
      metadata: { city: 'Tuguegarao City', workflow: 'editor-publish-test' },
    });

  expect(createRes.status).toBe(201);

  const draftFeedRes = await request(app).get(`${MOBILE_BASE}/content?placement=home`);

  expect(draftFeedRes.status).toBe(200);
  expect(
    draftFeedRes.body.some((item: { slug: string }) => item.slug === `editor-publish-${unique}`),
  ).toBe(false);

  const publishRes = await request(app)
    .patch(`${MOBILE_CONTENT_BASE}/${createRes.body.id}`)
    .set('Authorization', `Bearer ${contentEditorToken}`)
    .send({
      isPublished: true,
      publishedAt: new Date().toISOString(),
    });

  expect(publishRes.status).toBe(200);
  expect(publishRes.body).toMatchObject({
    id: createRes.body.id,
    isPublished: true,
  });

  const publishedFeedRes = await request(app).get(`${MOBILE_BASE}/content?placement=home`);

  expect(publishedFeedRes.status).toBe(200);
  expect(publishedFeedRes.body).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: createRes.body.id,
        slug: `editor-publish-${unique}`,
        title: 'Editor Publish Flow Advisory',
        placement: 'home',
      }),
    ]),
  );
});
