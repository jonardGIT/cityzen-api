import request from 'supertest';

import app, { API_V1 } from '../app.js';
import prisma from '../lib/prisma.js';
import { getTokenForRole } from './helpers/auth.js';

const CITIES_BASE = `${API_V1}/cities-municipalities`;
const BARANGAYS_BASE = `${API_V1}/barangays`;

let provincialAdminToken = '';
let cityAdminToken = '';
let isabelaProvinceId = '';
let cagayanProvinceId = '';
let ilaganCityId = '';
let tuguegaraoCityId = '';

async function ensureGeographyFixtures() {
  const region = await prisma.region.upsert({
    where: { code: '020000000' },
    update: { name: 'Cagayan Valley', designation: 'Region II', archivedAt: null },
    create: { code: '020000000', name: 'Cagayan Valley', designation: 'Region II' },
    select: { id: true },
  });

  const [isabelaProvince, cagayanProvince] = await Promise.all([
    prisma.province.upsert({
      where: { code: '023100000' },
      update: { name: 'Isabela', regionId: region.id, archivedAt: null },
      create: { code: '023100000', name: 'Isabela', regionId: region.id },
      select: { id: true },
    }),
    prisma.province.upsert({
      where: { code: '021500000' },
      update: { name: 'Cagayan', regionId: region.id, archivedAt: null },
      create: { code: '021500000', name: 'Cagayan', regionId: region.id },
      select: { id: true },
    }),
  ]);

  const [ilaganCity, tuguegaraoCity] = await Promise.all([
    prisma.cityMunicipality.upsert({
      where: { code: '023101000' },
      update: {
        name: 'Ilagan City',
        type: 'CITY',
        provinceId: isabelaProvince.id,
        archivedAt: null,
      },
      create: {
        code: '023101000',
        name: 'Ilagan City',
        type: 'CITY',
        provinceId: isabelaProvince.id,
      },
      select: { id: true },
    }),
    prisma.cityMunicipality.upsert({
      where: { code: '021529000' },
      update: {
        name: 'Tuguegarao City',
        type: 'CITY',
        provinceId: cagayanProvince.id,
        archivedAt: null,
      },
      create: {
        code: '021529000',
        name: 'Tuguegarao City',
        type: 'CITY',
        provinceId: cagayanProvince.id,
      },
      select: { id: true },
    }),
  ]);

  await Promise.all([
    prisma.user.updateMany({
      where: { email: 'provincial.admin@xypes.local' },
      data: { jurisdictionType: 'province', jurisdictionId: isabelaProvince.id },
    }),
    prisma.user.updateMany({
      where: { email: 'ops.lead@xypes.local' },
      data: { jurisdictionType: 'city', jurisdictionId: ilaganCity.id },
    }),
  ]);

  return { isabelaProvince, cagayanProvince, ilaganCity, tuguegaraoCity };
}

beforeAll(async () => {
  const fixtures = await ensureGeographyFixtures();

  provincialAdminToken = await getTokenForRole('provincial.admin@xypes.local');
  cityAdminToken = await getTokenForRole('ops.lead@xypes.local');

  isabelaProvinceId = fixtures.isabelaProvince.id;
  cagayanProvinceId = fixtures.cagayanProvince.id;
  ilaganCityId = fixtures.ilaganCity.id;
  tuguegaraoCityId = fixtures.tuguegaraoCity.id;
});

describe('Geography role gates', () => {
  it('allows PROVINCIAL_ADMIN to create a city inside the bound province', async () => {
    const now = Date.now();
    const res = await request(app)
      .post(CITIES_BASE)
      .set('Authorization', `Bearer ${provincialAdminToken}`)
      .send({
        code: `test-city-${now}`,
        name: `Scoped City ${now}`,
        type: 'CITY',
        provinceId: isabelaProvinceId,
      });

    expect(res.status).toBe(201);
    expect(res.body.provinceId).toBe(isabelaProvinceId);
  });

  it('blocks PROVINCIAL_ADMIN from creating a city outside the bound province', async () => {
    const now = Date.now();
    const res = await request(app)
      .post(CITIES_BASE)
      .set('Authorization', `Bearer ${provincialAdminToken}`)
      .send({
        code: `test-city-outside-${now}`,
        name: `Outside City ${now}`,
        type: 'CITY',
        provinceId: cagayanProvinceId,
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('outside your allowed scope');
  });

  it('blocks CITY_ADMIN from creating cities', async () => {
    const now = Date.now();
    const res = await request(app)
      .post(CITIES_BASE)
      .set('Authorization', `Bearer ${cityAdminToken}`)
      .send({
        code: `test-city-city-admin-${now}`,
        name: `Forbidden City ${now}`,
        type: 'CITY',
        provinceId: isabelaProvinceId,
      });

    expect(res.status).toBe(403);
  });

  it('allows CITY_ADMIN to create a barangay inside the bound city', async () => {
    const now = Date.now();
    const res = await request(app)
      .post(BARANGAYS_BASE)
      .set('Authorization', `Bearer ${cityAdminToken}`)
      .send({
        code: `test-brgy-${now}`,
        name: `Scoped Barangay ${now}`,
        cityMunicipalityId: ilaganCityId,
      });

    expect(res.status).toBe(201);
    expect(res.body.cityMunicipalityId).toBe(ilaganCityId);
  });

  it('blocks CITY_ADMIN from creating a barangay outside the bound city', async () => {
    const now = Date.now();
    const res = await request(app)
      .post(BARANGAYS_BASE)
      .set('Authorization', `Bearer ${cityAdminToken}`)
      .send({
        code: `test-brgy-outside-${now}`,
        name: `Outside Barangay ${now}`,
        cityMunicipalityId: tuguegaraoCityId,
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('outside your allowed scope');
  });
});
