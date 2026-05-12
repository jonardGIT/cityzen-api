import request from 'supertest';

import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';
import { isArchiveEnabled } from '../utils/archive.js';

const REGIONS_BASE = `${API_V1}/regions`;
const PROVINCES_BASE = `${API_V1}/provinces`;
const CITIES_BASE = `${API_V1}/cities-municipalities`;
const BARANGAYS_BASE = `${API_V1}/barangays`;
const TEST_CODE_PREFIX = `geo-crud-${Date.now()}`;
const archiveEnabled = isArchiveEnabled();

let adminToken = '';
let dispatcherToken = '';
let citizenToken = '';
let seededRegionId = '';
let seededProvinceId = '';
let seededCityId = '';
let seededBarangayId = '';

async function seedGeographyFixtures() {
  const region = await prisma.region.create({
    data: {
      code: `${TEST_CODE_PREFIX}-region-seed`,
      name: 'Seed Region',
      designation: 'Test Region',
    },
  });

  const province = await prisma.province.create({
    data: {
      code: `${TEST_CODE_PREFIX}-province-seed`,
      name: 'Seed Province',
      regionId: region.id,
    },
    include: { region: true },
  });

  const city = await prisma.cityMunicipality.create({
    data: {
      code: `${TEST_CODE_PREFIX}-city-seed`,
      name: 'Seed City',
      type: 'CITY',
      provinceId: province.id,
    },
    include: { province: true },
  });

  const barangay = await prisma.barangay.create({
    data: {
      code: `${TEST_CODE_PREFIX}-barangay-seed`,
      name: 'Seed Barangay',
      cityMunicipalityId: city.id,
    },
    include: { cityMunicipality: true },
  });

  return { region, province, city, barangay };
}

beforeAll(async () => {
  adminToken = await getAdminToken();
  dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
  citizenToken = await getTokenForRole('analyst@xypes.local');

  const fixtures = await seedGeographyFixtures();
  seededRegionId = fixtures.region.id;
  seededProvinceId = fixtures.province.id;
  seededCityId = fixtures.city.id;
  seededBarangayId = fixtures.barangay.id;
});

afterAll(async () => {
  await prisma.barangay.deleteMany({ where: { code: { startsWith: TEST_CODE_PREFIX } } });
  await prisma.cityMunicipality.deleteMany({ where: { code: { startsWith: TEST_CODE_PREFIX } } });
  await prisma.province.deleteMany({ where: { code: { startsWith: TEST_CODE_PREFIX } } });
  await prisma.region.deleteMany({ where: { code: { startsWith: TEST_CODE_PREFIX } } });
});

describe('Geography read endpoints', () => {
  it(`lists regions for GEO_READ_ROLES on ${REGIONS_BASE}`, async () => {
    const response = await request(app)
      .get(REGIONS_BASE)
      .set('Authorization', `Bearer ${dispatcherToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: seededRegionId, code: `${TEST_CODE_PREFIX}-region-seed` }),
      ]),
    );
  });

  it(`reads a province by id on ${PROVINCES_BASE}/:id`, async () => {
    const response = await request(app)
      .get(`${PROVINCES_BASE}/${seededProvinceId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: seededProvinceId,
      code: `${TEST_CODE_PREFIX}-province-seed`,
      regionId: seededRegionId,
      region: expect.objectContaining({ id: seededRegionId }),
    });
  });

  it(`reads a city with nested province include on ${CITIES_BASE}/:id`, async () => {
    const response = await request(app)
      .get(`${CITIES_BASE}/${seededCityId}?include=province.region`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: seededCityId,
      province: expect.objectContaining({
        id: seededProvinceId,
        region: expect.objectContaining({ id: seededRegionId }),
      }),
    });
  });

  it(`reads a barangay with nested city include on ${BARANGAYS_BASE}/:id`, async () => {
    const response = await request(app)
      .get(`${BARANGAYS_BASE}/${seededBarangayId}?include=cityMunicipality.province.region`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: seededBarangayId,
      cityMunicipality: expect.objectContaining({
        id: seededCityId,
        province: expect.objectContaining({ id: seededProvinceId }),
      }),
    });
  });

  it('returns 401 for unauthenticated geography reads', async () => {
    const response = await request(app).get(REGIONS_BASE);

    expect(response.status).toBe(401);
  });

  it('returns 403 for non-privileged geography reads', async () => {
    const response = await request(app)
      .get(REGIONS_BASE)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(response.status).toBe(403);
  });
});

describe('Geography write endpoints', () => {
  it(`creates, updates, deletes, and restores a region on ${REGIONS_BASE}`, async () => {
    const regionCode = `${TEST_CODE_PREFIX}-region-crud-${Date.now()}`;
    const createResponse = await request(app)
      .post(REGIONS_BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: regionCode,
        name: 'CRUD Region',
        designation: 'Region CRUD',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      code: regionCode,
      name: 'CRUD Region',
      designation: 'Region CRUD',
    });

    const regionId = createResponse.body.id as string;

    const updateResponse = await request(app)
      .patch(`${REGIONS_BASE}/${regionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: regionCode, name: 'CRUD Region Updated', designation: 'Region CRUD' });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      id: regionId,
      name: 'CRUD Region Updated',
    });

    const deleteResponse = await request(app)
      .delete(`${REGIONS_BASE}/${regionId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteResponse.status).toBe(204);

    if (archiveEnabled) {
      const restoreResponse = await request(app)
        .post(`${REGIONS_BASE}/${regionId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(restoreResponse.status).toBe(200);
      expect(restoreResponse.body).toMatchObject({
        id: regionId,
        archivedAt: null,
      });
    }
  });

  it('returns 409 when deleting a region that still has an active province', async () => {
    const regionCode = `${TEST_CODE_PREFIX}-region-guard-${Date.now()}`;
    const provinceCode = `${TEST_CODE_PREFIX}-province-guard-${Date.now()}`;
    const createRegionResponse = await request(app)
      .post(REGIONS_BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: regionCode,
        name: 'Guard Region',
        designation: 'Guard Region',
      });

    expect(createRegionResponse.status).toBe(201);

    const regionId = createRegionResponse.body.id as string;

    const createProvinceResponse = await request(app)
      .post(PROVINCES_BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: provinceCode,
        name: 'Guard Province',
        regionId,
      });

    expect(createProvinceResponse.status).toBe(201);

    const deleteResponse = await request(app)
      .delete(`${REGIONS_BASE}/${regionId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteResponse.status).toBe(409);
    expect(deleteResponse.body).toMatchObject({
      message: 'Conflict: region still has active provinces',
    });
  });

  it(`covers direct city and barangay CRUD plus restore safety on ${CITIES_BASE} and ${BARANGAYS_BASE}`, async () => {
    const cityCode = `${TEST_CODE_PREFIX}-city-crud-${Date.now()}`;
    const barangayCode = `${TEST_CODE_PREFIX}-barangay-crud-${Date.now()}`;
    const createCityResponse = await request(app)
      .post(CITIES_BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: cityCode,
        name: 'CRUD City',
        type: 'CITY',
        provinceId: seededProvinceId,
      });

    expect(createCityResponse.status).toBe(201);
    const cityId = createCityResponse.body.id as string;

    const updateCityResponse = await request(app)
      .patch(`${CITIES_BASE}/${cityId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: cityCode,
        name: 'CRUD City Updated',
        type: 'CITY',
        provinceId: seededProvinceId,
      });

    expect(updateCityResponse.status).toBe(200);
    expect(updateCityResponse.body).toMatchObject({ id: cityId, name: 'CRUD City Updated' });

    const createBarangayResponse = await request(app)
      .post(BARANGAYS_BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: barangayCode,
        name: 'CRUD Barangay',
        cityMunicipalityId: cityId,
      });

    expect(createBarangayResponse.status).toBe(201);
    const barangayId = createBarangayResponse.body.id as string;

    const updateBarangayResponse = await request(app)
      .patch(`${BARANGAYS_BASE}/${barangayId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: barangayCode, name: 'CRUD Barangay Updated', cityMunicipalityId: cityId });

    expect(updateBarangayResponse.status).toBe(200);
    expect(updateBarangayResponse.body).toMatchObject({
      id: barangayId,
      name: 'CRUD Barangay Updated',
    });

    const deleteBarangayResponse = await request(app)
      .delete(`${BARANGAYS_BASE}/${barangayId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteBarangayResponse.status).toBe(204);

    if (!archiveEnabled) {
      return;
    }

    const deleteCityResponse = await request(app)
      .delete(`${CITIES_BASE}/${cityId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteCityResponse.status).toBe(204);

    const restoreBarangayWhileCityArchivedResponse = await request(app)
      .post(`${BARANGAYS_BASE}/${barangayId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(restoreBarangayWhileCityArchivedResponse.status).toBe(409);
    expect(restoreBarangayWhileCityArchivedResponse.body).toMatchObject({
      message: 'Conflict: barangay cannot be restored while its city/municipality is archived',
    });

    const restoreCityResponse = await request(app)
      .post(`${CITIES_BASE}/${cityId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(restoreCityResponse.status).toBe(200);
    expect(restoreCityResponse.body).toMatchObject({ id: cityId, archivedAt: null });

    const restoreBarangayResponse = await request(app)
      .post(`${BARANGAYS_BASE}/${barangayId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(restoreBarangayResponse.status).toBe(200);
    expect(restoreBarangayResponse.body).toMatchObject({ id: barangayId, archivedAt: null });
  });
});
