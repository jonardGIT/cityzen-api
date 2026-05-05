import request from 'supertest';
import prisma from '../lib/prisma.js';
import app, { API_V1 } from '../app.js';
import { getAdminToken, getTokenForRole } from './helpers/auth.js';
import { isArchiveEnabled } from '../utils/archive.js';
import { MFA_REQUIRED_ROLES } from '../types/auth.js';

const CAPABILITIES = `${API_V1}/users/capabilities`;
const USERS = `${API_V1}/users`;
const ADMIN_MFA_COMPLIANCE = `${API_V1}/admin/users/mfa-compliance`;
const archiveEnabled = isArchiveEnabled();

let adminToken = '';
let citizenReporterToken = '';
let cityAdminToken = '';
let contentEditorToken = '';
let provincialAdminToken = '';
let regionalDirectorToken = '';

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

  const city = await prisma.cityMunicipality.upsert({
    where: { code: '023101000' },
    update: { name: 'Ilagan City', type: 'CITY', provinceId: province.id, archivedAt: null },
    create: { code: '023101000', name: 'Ilagan City', type: 'CITY', provinceId: province.id },
  });

  await prisma.barangay.upsert({
    where: { code: '023101000-001' },
    update: {
      name: 'Centro',
      cityMunicipalityId: city.id,
      archivedAt: null,
    },
    create: {
      code: '023101000-001',
      name: 'Centro',
      cityMunicipalityId: city.id,
    },
  });

  return { region, province, city };
}

async function ensureOutsideProvinceMunicipalityScope() {
  const region = await prisma.region.upsert({
    where: { code: '020000000' },
    update: { name: 'Cagayan Valley', designation: 'Region II', archivedAt: null },
    create: { code: '020000000', name: 'Cagayan Valley', designation: 'Region II' },
  });

  const province = await prisma.province.upsert({
    where: { code: '021500000' },
    update: { name: 'Cagayan', regionId: region.id, archivedAt: null },
    create: { code: '021500000', name: 'Cagayan', regionId: region.id },
  });

  const city = await prisma.cityMunicipality.upsert({
    where: { code: '021529000' },
    update: { name: 'Tuguegarao City', type: 'CITY', provinceId: province.id, archivedAt: null },
    create: { code: '021529000', name: 'Tuguegarao City', type: 'CITY', provinceId: province.id },
  });

  await prisma.barangay.upsert({
    where: { code: '021527000-001' },
    update: {
      name: 'Centro',
      cityMunicipalityId: city.id,
      archivedAt: null,
    },
    create: {
      code: '021527000-001',
      name: 'Centro',
      cityMunicipalityId: city.id,
    },
  });

  return { region, province, city };
}

async function ensureSecondIsabelaCityScope() {
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

  const city = await prisma.cityMunicipality.upsert({
    where: { code: '023108000' },
    update: { name: 'Cauayan City', type: 'CITY', provinceId: province.id, archivedAt: null },
    create: { code: '023108000', name: 'Cauayan City', type: 'CITY', provinceId: province.id },
  });

  await prisma.barangay.upsert({
    where: { code: '023108000-001' },
    update: {
      name: 'Centro',
      cityMunicipalityId: city.id,
      archivedAt: null,
    },
    create: {
      code: '023108000-001',
      name: 'Centro',
      cityMunicipalityId: city.id,
    },
  });

  return { region, province, city };
}

async function ensureOutsideRegionMunicipalityScope() {
  const region = await prisma.region.upsert({
    where: { code: '030000000' },
    update: { name: 'Central Luzon', designation: 'Region III', archivedAt: null },
    create: { code: '030000000', name: 'Central Luzon', designation: 'Region III' },
  });

  const province = await prisma.province.upsert({
    where: { code: '031400000' },
    update: { name: 'Bulacan', regionId: region.id, archivedAt: null },
    create: { code: '031400000', name: 'Bulacan', regionId: region.id },
  });

  const city = await prisma.cityMunicipality.upsert({
    where: { code: '031410000' },
    update: { name: 'Malolos City', type: 'CITY', provinceId: province.id, archivedAt: null },
    create: { code: '031410000', name: 'Malolos City', type: 'CITY', provinceId: province.id },
  });

  await prisma.barangay.upsert({
    where: { code: '031410000-001' },
    update: {
      name: 'Centro',
      cityMunicipalityId: city.id,
      archivedAt: null,
    },
    create: {
      code: '031410000-001',
      name: 'Centro',
      cityMunicipalityId: city.id,
    },
  });

  return { region, province, city };
}

beforeAll(async () => {
  adminToken = await getAdminToken();

  await prisma.user.upsert({
    where: { email: 'regional.director@xypes.local' },
    update: {
      name: 'Regional Director',
      passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
      role: 'REGIONAL_DIRECTOR',
    },
    create: {
      name: 'Regional Director',
      email: 'regional.director@xypes.local',
      passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
      role: 'REGIONAL_DIRECTOR',
    },
  });

  [
    citizenReporterToken,
    cityAdminToken,
    contentEditorToken,
    provincialAdminToken,
    regionalDirectorToken,
  ] = await Promise.all([
    getTokenForRole('analyst@xypes.local'),
    getTokenForRole('ops.lead@xypes.local'),
    getTokenForRole('content.editor@xypes.local'),
    getTokenForRole('provincial.admin@xypes.local'),
    getTokenForRole('regional.director@xypes.local'),
  ]);
});

describe(`GET ${CAPABILITIES}`, () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await request(app).get(CAPABILITIES);
    expect(res.status).toBe(401);
  });

  it('should return 200 with own capability metadata for CITIZEN_REPORTER', async () => {
    const res = await request(app)
      .get(CAPABILITIES)
      .set('Authorization', `Bearer ${citizenReporterToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      role: 'CITIZEN_REPORTER',
      label: 'Citizen Reporter',
      scope: 'own',
      canUpdateUser: false,
      canDeleteUser: false,
    });
    expect(res.body.permissions).toEqual(
      expect.arrayContaining([
        'citizen:link:self',
        'incident:create:self',
        'incident:read:self',
        'incident:update:self',
        'media:upload:self',
      ]),
    );
  });

  it('should return 200 with capability metadata for NATIONAL_ADMIN', async () => {
    const res = await request(app).get(CAPABILITIES).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      role: 'NATIONAL_ADMIN',
      label: 'National Admin',
      scope: 'national',
      canUpdateUser: true,
      canDeleteUser: true,
    });
    expect(res.body.permissions).toEqual(
      expect.arrayContaining([
        'user:manage:global',
        'geo:manage:global',
        'role:manage:global',
        'settings:manage:global',
        'incident:manage:global',
        'assignment:create:global',
        'mobile_content:create:global',
      ]),
    );
  });

  it('should return boolean values (not null or string)', async () => {
    const res = await request(app).get(CAPABILITIES).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.canUpdateUser).toBe('boolean');
    expect(typeof res.body.canDeleteUser).toBe('boolean');
  });

  it('should return 200 with city-scoped capability metadata for DISPATCHER', async () => {
    const dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
    const res = await request(app)
      .get(CAPABILITIES)
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      role: 'DISPATCHER',
      label: 'Dispatcher',
      scope: 'city',
      canUpdateUser: false,
      canDeleteUser: false,
    });
    expect(res.body.permissions).toEqual(
      expect.arrayContaining([
        'incident:read:city',
        'incident:assign:city',
        'incident:update:priority:city',
      ]),
    );
  });

  it('should return narrow mobile-content capability metadata for CITY_CONTENT_EDITOR', async () => {
    const res = await request(app)
      .get(CAPABILITIES)
      .set('Authorization', `Bearer ${contentEditorToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      role: 'CITY_CONTENT_EDITOR',
      label: 'City Content Editor',
      scope: 'city',
      canUpdateUser: false,
      canDeleteUser: false,
    });
    expect(res.body.permissions).toEqual(
      expect.arrayContaining([
        'mobile_content:create:city',
        'mobile_content:read:city',
        'mobile_content:update:city',
        'mobile_content:publish:city',
        'mobile_content:archive:city',
      ]),
    );
  });

  it('should return scoped lifecycle capability metadata for CITY_ADMIN', async () => {
    const res = await request(app)
      .get(CAPABILITIES)
      .set('Authorization', `Bearer ${cityAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      role: 'CITY_ADMIN',
      label: 'City/Municipal Admin',
      scope: 'city',
      canUpdateUser: true,
      canDeleteUser: false,
    });
    expect(res.body.permissions).toEqual(
      expect.arrayContaining([
        'user:create:city',
        'user:read:city',
        'user:update:city',
        'user:reset_password:city',
        'geo:manage:city',
        'assignment:create:city',
        'mobile_content:create:city',
      ]),
    );
  });

  it('should return scoped lifecycle capability metadata for PROVINCIAL_ADMIN', async () => {
    const res = await request(app)
      .get(CAPABILITIES)
      .set('Authorization', `Bearer ${provincialAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      role: 'PROVINCIAL_ADMIN',
      label: 'Provincial Admin',
      scope: 'province',
      canUpdateUser: true,
      canDeleteUser: false,
    });
    expect(res.body.permissions).toEqual(
      expect.arrayContaining([
        'user:manage:province',
        'geo:manage:province',
        'incident:read:province',
        'agency:manage:province',
        'assignment:create:province',
        'mobile_content:create:province',
      ]),
    );
  });

  it('should return scoped lifecycle capability metadata for REGIONAL_DIRECTOR', async () => {
    const res = await request(app)
      .get(CAPABILITIES)
      .set('Authorization', `Bearer ${regionalDirectorToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      role: 'REGIONAL_DIRECTOR',
      label: 'Regional Director',
      scope: 'region',
      canUpdateUser: true,
      canDeleteUser: false,
    });
    expect(res.body.permissions).toEqual(
      expect.arrayContaining([
        'user:manage:region',
        'geo:manage:region',
        'incident:read:region',
        'agency:manage:region',
        'assignment:create:region',
        'mobile_content:create:region',
      ]),
    );
  });
});

describe(`POST ${USERS}`, () => {
  it('should create a user with canonical name fields only', async () => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const email = `split.name.user.${unique}@xypes.local`;

    const res = await request(app)
      .post(USERS)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Mira',
        middleName: `Dela ${unique}`,
        lastName: `Santos ${unique}`,
        suffix: 'Sr.',
        email,
        password: 'Password123!',
        role: 'CITIZEN_REPORTER',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      firstName: 'Mira',
      middleName: `Dela ${unique}`,
      lastName: `Santos ${unique}`,
      suffix: 'Sr.',
      email,
      role: 'CITIZEN_REPORTER',
    });
    expect(res.body).toHaveProperty('name', expect.any(String));
  });

  it('should accept legacy name on create', async () => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;

    const res = await request(app)
      .post(USERS)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Legacy Create ${unique}`,
        email: `invalid.split.user.${unique}@xypes.local`,
        password: 'Password123!',
        role: 'CITIZEN_REPORTER',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: `Legacy Create ${unique}`,
      email: `invalid.split.user.${unique}@xypes.local`,
      role: 'CITIZEN_REPORTER',
    });
  });

  it('should reject municipality jurisdiction input for NATIONAL_ADMIN user creation', async () => {
    const { city } = await ensureRoxasMunicipalityScope();
    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const email = `roxas.municipal.admin.${unique}@xypes.local`;

    const res = await request(app)
      .post(USERS)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Roxas Municipal Admin ${unique}`,
        email,
        password: 'Password123!',
        role: 'CITY_ADMIN',
        jurisdictionType: 'municipality',
        jurisdictionId: city.id,
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should allow CITY_ADMIN to create CITY_CONTENT_EDITOR users', async () => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const email = `city.content.editor.${unique}@xypes.local`;

    const res = await request(app)
      .post(USERS)
      .set('Authorization', `Bearer ${cityAdminToken}`)
      .send({
        name: `City Content Editor ${unique}`,
        email,
        password: 'Password123!',
        role: 'CITY_CONTENT_EDITOR',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      email,
      role: 'CITY_CONTENT_EDITOR',
    });
  });

  it('should inherit the municipal jurisdiction when CITY_ADMIN creates local staff', async () => {
    const { city } = await ensureRoxasMunicipalityScope();
    await prisma.user.update({
      where: { email: 'ops.lead@xypes.local' },
      data: {
        jurisdictionType: 'city',
        jurisdictionId: city.id,
      },
    });

    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const email = `roxas.dispatcher.${unique}@xypes.local`;

    const res = await request(app)
      .post(USERS)
      .set('Authorization', `Bearer ${cityAdminToken}`)
      .send({
        name: `Roxas Dispatcher ${unique}`,
        email,
        password: 'Password123!',
        role: 'DISPATCHER',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      email,
      role: 'DISPATCHER',
      jurisdictionType: 'city',
      jurisdictionId: city.id,
    });
  });

  it('should return 403 for CITY_CONTENT_EDITOR when creating users', async () => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;

    const res = await request(app)
      .post(USERS)
      .set('Authorization', `Bearer ${contentEditorToken}`)
      .send({
        name: `Blocked Editor ${unique}`,
        email: `blocked.editor.${unique}@xypes.local`,
        password: 'Password123!',
        role: 'CITIZEN_REPORTER',
      });

    expect(res.status).toBe(403);
  });

  it('should allow REGIONAL_DIRECTOR to create in-region users and reject out-of-region assignments', async () => {
    const { region, city: roxasCity } = await ensureRoxasMunicipalityScope();
    const { city: outsideRegionCity } = await ensureOutsideRegionMunicipalityScope();

    await prisma.user.update({
      where: { email: 'regional.director@xypes.local' },
      data: {
        jurisdictionType: 'region',
        jurisdictionId: region.id,
      },
    });

    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const inRegionEmail = `region.created.dispatcher.${unique}@xypes.local`;
    const outOfRegionEmail = `region.blocked.dispatcher.${unique}@xypes.local`;

    const allowedRes = await request(app)
      .post(USERS)
      .set('Authorization', `Bearer ${regionalDirectorToken}`)
      .send({
        name: `Region Created Dispatcher ${unique}`,
        email: inRegionEmail,
        password: 'Password123!',
        role: 'DISPATCHER',
        jurisdictionType: 'city',
        jurisdictionId: roxasCity.id,
      });

    expect(allowedRes.status).toBe(201);
    expect(allowedRes.body).toMatchObject({
      email: inRegionEmail,
      role: 'DISPATCHER',
      jurisdictionType: 'city',
      jurisdictionId: roxasCity.id,
    });

    const blockedRes = await request(app)
      .post(USERS)
      .set('Authorization', `Bearer ${regionalDirectorToken}`)
      .send({
        name: `Region Blocked Dispatcher ${unique}`,
        email: outOfRegionEmail,
        password: 'Password123!',
        role: 'DISPATCHER',
        jurisdictionType: 'city',
        jurisdictionId: outsideRegionCity.id,
      });

    expect(blockedRes.status).toBe(403);
  });

  it('should allow PROVINCIAL_ADMIN to create in-province users and reject out-of-province assignments', async () => {
    const { province, city: roxasCity } = await ensureRoxasMunicipalityScope();
    const { city: outsideProvinceCity } = await ensureOutsideProvinceMunicipalityScope();

    await prisma.user.update({
      where: { email: 'provincial.admin@xypes.local' },
      data: {
        jurisdictionType: 'province',
        jurisdictionId: province.id,
      },
    });

    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const inProvinceEmail = `province.created.dispatcher.${unique}@xypes.local`;
    const outOfProvinceEmail = `province.blocked.dispatcher.${unique}@xypes.local`;

    const allowedRes = await request(app)
      .post(USERS)
      .set('Authorization', `Bearer ${provincialAdminToken}`)
      .send({
        name: `Province Created Dispatcher ${unique}`,
        email: inProvinceEmail,
        password: 'Password123!',
        role: 'DISPATCHER',
        jurisdictionType: 'city',
        jurisdictionId: roxasCity.id,
      });

    expect(allowedRes.status).toBe(201);
    expect(allowedRes.body).toMatchObject({
      email: inProvinceEmail,
      role: 'DISPATCHER',
      jurisdictionType: 'city',
      jurisdictionId: roxasCity.id,
    });

    const blockedRes = await request(app)
      .post(USERS)
      .set('Authorization', `Bearer ${provincialAdminToken}`)
      .send({
        name: `Province Blocked Dispatcher ${unique}`,
        email: outOfProvinceEmail,
        password: 'Password123!',
        role: 'DISPATCHER',
        jurisdictionType: 'city',
        jurisdictionId: outsideProvinceCity.id,
      });

    expect(blockedRes.status).toBe(403);
  });

  it('should reject creating a city-scoped user without jurisdiction when no inherited scope applies', async () => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;

    const res = await request(app)
      .post(USERS)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Unscoped City Admin ${unique}`,
        email: `unscoped.city.admin.${unique}@xypes.local`,
        password: 'Password123!',
        role: 'CITY_ADMIN',
      });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty(
      'message',
      'jurisdictionType and jurisdictionId are required for region-, province-, and city-scoped roles',
    );
  });
});

describe(`PATCH ${USERS}/:id`, () => {
  it('should update a user with canonical name fields only', async () => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const createdUser = await prisma.user.create({
      data: {
        name: `Legacy User ${unique}`,
        firstName: 'Legacy',
        lastName: `User ${unique}`,
        email: `legacy.split.update.${unique}@xypes.local`,
        passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
        role: 'CITIZEN_REPORTER',
      },
    });

    const res = await request(app)
      .patch(`${USERS}/${createdUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Updated',
        middleName: `Middle ${unique}`,
        lastName: `Citizen ${unique}`,
        suffix: 'IV',
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: createdUser.id,
      firstName: 'Updated',
      middleName: `Middle ${unique}`,
      lastName: `Citizen ${unique}`,
      suffix: 'IV',
    });
    expect(res.body).toHaveProperty('name', expect.any(String));
  });

  it('should accept legacy name on update', async () => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const createdUser = await prisma.user.create({
      data: {
        name: `Needs Split Validation ${unique}`,
        firstName: 'Needs',
        lastName: `Validation ${unique}`,
        email: `needs.split.validation.${unique}@xypes.local`,
        passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
        role: 'CITIZEN_REPORTER',
      },
    });

    const res = await request(app)
      .patch(`${USERS}/${createdUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Legacy Update Attempt' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdUser.id);
    expect(res.body).toHaveProperty('name', 'Legacy Update Attempt');
  });

  it('should allow REGIONAL_DIRECTOR to retarget in-region users and reject out-of-region retargeting', async () => {
    const { region, city: roxasCity } = await ensureRoxasMunicipalityScope();
    const { city: tuguegaraoCity } = await ensureOutsideProvinceMunicipalityScope();
    const { city: outsideRegionCity } = await ensureOutsideRegionMunicipalityScope();

    await prisma.user.update({
      where: { email: 'regional.director@xypes.local' },
      data: {
        jurisdictionType: 'region',
        jurisdictionId: region.id,
      },
    });

    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const regionalUser = await prisma.user.create({
      data: {
        name: `Region Retarget User ${unique}`,
        email: `region.retarget.${unique}@xypes.local`,
        passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
        role: 'DISPATCHER',
        jurisdictionType: 'city',
        jurisdictionId: roxasCity.id,
      },
      select: { id: true },
    });

    const allowedRes = await request(app)
      .patch(`${USERS}/${regionalUser.id}`)
      .set('Authorization', `Bearer ${regionalDirectorToken}`)
      .send({
        role: 'CITY_CONTENT_EDITOR',
        jurisdictionType: 'city',
        jurisdictionId: tuguegaraoCity.id,
      });

    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body).toMatchObject({
      id: regionalUser.id,
      role: 'CITY_CONTENT_EDITOR',
      jurisdictionType: 'city',
      jurisdictionId: tuguegaraoCity.id,
    });

    const blockedRes = await request(app)
      .patch(`${USERS}/${regionalUser.id}`)
      .set('Authorization', `Bearer ${regionalDirectorToken}`)
      .send({
        jurisdictionType: 'city',
        jurisdictionId: outsideRegionCity.id,
      });

    expect(blockedRes.status).toBe(403);
  });

  it('should allow PROVINCIAL_ADMIN to retarget in-province users and reject out-of-province retargeting', async () => {
    const { province, city: roxasCity } = await ensureRoxasMunicipalityScope();
    const { city: cauayanCity } = await ensureSecondIsabelaCityScope();
    const { city: outsideProvinceCity } = await ensureOutsideProvinceMunicipalityScope();

    await prisma.user.update({
      where: { email: 'provincial.admin@xypes.local' },
      data: {
        jurisdictionType: 'province',
        jurisdictionId: province.id,
      },
    });

    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const provincialUser = await prisma.user.create({
      data: {
        name: `Province Retarget User ${unique}`,
        email: `province.retarget.${unique}@xypes.local`,
        passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
        role: 'DISPATCHER',
        jurisdictionType: 'city',
        jurisdictionId: roxasCity.id,
      },
      select: { id: true },
    });

    const allowedRes = await request(app)
      .patch(`${USERS}/${provincialUser.id}`)
      .set('Authorization', `Bearer ${provincialAdminToken}`)
      .send({
        role: 'CITY_CONTENT_EDITOR',
        jurisdictionType: 'city',
        jurisdictionId: cauayanCity.id,
      });

    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body).toMatchObject({
      id: provincialUser.id,
      role: 'CITY_CONTENT_EDITOR',
      jurisdictionType: 'city',
      jurisdictionId: cauayanCity.id,
    });

    const blockedRes = await request(app)
      .patch(`${USERS}/${provincialUser.id}`)
      .set('Authorization', `Bearer ${provincialAdminToken}`)
      .send({
        jurisdictionType: 'city',
        jurisdictionId: outsideProvinceCity.id,
      });

    expect(blockedRes.status).toBe(403);
  });

  it('should allow CITY_ADMIN to update local municipal users and reject cross-municipality retargeting', async () => {
    const { city: roxasCity } = await ensureRoxasMunicipalityScope();
    const { city: cauayanCity } = await ensureSecondIsabelaCityScope();

    await prisma.user.update({
      where: { email: 'ops.lead@xypes.local' },
      data: {
        jurisdictionType: 'city',
        jurisdictionId: roxasCity.id,
      },
    });

    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const municipalUser = await prisma.user.create({
      data: {
        name: `Municipal Retarget User ${unique}`,
        email: `municipal.retarget.${unique}@xypes.local`,
        passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
        role: 'DISPATCHER',
        jurisdictionType: 'city',
        jurisdictionId: roxasCity.id,
      },
      select: { id: true },
    });

    const allowedRes = await request(app)
      .patch(`${USERS}/${municipalUser.id}`)
      .set('Authorization', `Bearer ${cityAdminToken}`)
      .send({
        role: 'CITY_CONTENT_EDITOR',
        jurisdictionType: 'city',
        jurisdictionId: roxasCity.id,
      });

    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body).toMatchObject({
      id: municipalUser.id,
      role: 'CITY_CONTENT_EDITOR',
      jurisdictionType: 'city',
      jurisdictionId: roxasCity.id,
    });

    const blockedRes = await request(app)
      .patch(`${USERS}/${municipalUser.id}`)
      .set('Authorization', `Bearer ${cityAdminToken}`)
      .send({
        jurisdictionType: 'city',
        jurisdictionId: cauayanCity.id,
      });

    expect(blockedRes.status).toBe(403);
  });

  it('should reject retargeting an unscoped user into a city-scoped role without jurisdiction', async () => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const unscopedUser = await prisma.user.create({
      data: {
        name: `Unscoped Retarget User ${unique}`,
        email: `unscoped.retarget.${unique}@xypes.local`,
        passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
        role: 'CITIZEN_REPORTER',
      },
      select: { id: true },
    });

    const res = await request(app)
      .patch(`${USERS}/${unscopedUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'CITY_CONTENT_EDITOR',
      });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty(
      'message',
      'jurisdictionType and jurisdictionId are required for region-, province-, and city-scoped roles',
    );
  });
});

describe(`GET ${USERS}`, () => {
  it('should return array when pagination params are not provided', async () => {
    const res = await request(app).get(USERS).set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should return paginated response when page and pageSize are provided', async () => {
    const res = await request(app)
      .get(`${USERS}?page=1&pageSize=2`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination).toMatchObject({
      page: 1,
      pageSize: 2,
    });
    expect(typeof res.body.pagination.total).toBe('number');
    expect(typeof res.body.pagination.totalPages).toBe('number');
    expect(typeof res.body.pagination.hasNextPage).toBe('boolean');
    expect(typeof res.body.pagination.hasPrevPage).toBe('boolean');
    expect(res.body.data.length).toBeLessThanOrEqual(2);
  });

  it('should return 422 for disallowed sort fields', async () => {
    const res = await request(app)
      .get(`${USERS}?sortBy=passwordHash`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      message: 'Invalid list query parameters',
      errors: [
        expect.objectContaining({
          field: 'sortBy',
          message: 'passwordHash is not sortable for users',
        }),
      ],
    });
  });

  it('should support updatedAt sorting and range filters', async () => {
    const updatedFrom = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .get(
        `${USERS}?page=1&pageSize=5&sortBy=updatedAt&sortOrder=desc&updatedFrom=${encodeURIComponent(updatedFrom)}`,
      )
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    for (const user of res.body.data) {
      expect(new Date(user.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(updatedFrom).getTime(),
      );
    }

    if (res.body.data.length >= 2) {
      const first = new Date(res.body.data[0].updatedAt).getTime();
      const second = new Date(res.body.data[1].updatedAt).getTime();
      expect(first).toBeGreaterThanOrEqual(second);
    }
  });

  it('should return only scoped Roxas municipality users for CITY_ADMIN', async () => {
    const { city } = await ensureRoxasMunicipalityScope();
    await prisma.user.update({
      where: { email: 'ops.lead@xypes.local' },
      data: {
        jurisdictionType: 'city',
        jurisdictionId: city.id,
      },
    });

    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const localEmail = `roxas.citizen-reporter.${unique}@xypes.local`;
    const outsideEmail = `outside.citizen-reporter.${unique}@xypes.local`;

    await prisma.user.create({
      data: {
        name: `Roxas Local ${unique}`,
        email: localEmail,
        passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
        role: 'DISPATCHER',
        jurisdictionType: 'city',
        jurisdictionId: city.id,
      },
    });

    await prisma.user
      .create({
        data: {
          name: `Outside Local ${unique}`,
          email: outsideEmail,
          passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
          role: 'DISPATCHER',
          jurisdictionType: 'city',
          jurisdictionId: '5871fc20-607a-4c3d-ab43-2da5afd4fda3',
        },
      })
      .catch(async () => {
        const alternateCity = await prisma.cityMunicipality.create({
          data: {
            code: `TMP-${unique}`,
            name: `Outside City ${unique}`,
            type: 'CITY',
            provinceId: (await ensureRoxasMunicipalityScope()).province.id,
          },
        });
        await prisma.user.create({
          data: {
            name: `Outside Local ${unique}`,
            email: outsideEmail,
            passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
            role: 'DISPATCHER',
            jurisdictionType: 'city',
            jurisdictionId: alternateCity.id,
          },
        });
      });

    const res = await request(app).get(USERS).set('Authorization', `Bearer ${cityAdminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((user: { email: string }) => user.email === 'ops.lead@xypes.local')).toBe(
      true,
    );
    expect(res.body.some((user: { email: string }) => user.email === localEmail)).toBe(true);
    expect(res.body.some((user: { email: string }) => user.email === outsideEmail)).toBe(false);
  });

  it('should allow CITY_ADMIN to filter scoped users by role and jurisdiction fields', async () => {
    const { city } = await ensureRoxasMunicipalityScope();
    await prisma.user.update({
      where: { email: 'ops.lead@xypes.local' },
      data: {
        jurisdictionType: 'city',
        jurisdictionId: city.id,
      },
    });

    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const dispatcherEmail = `roxas.filtered.dispatcher.${unique}@xypes.local`;
    const editorEmail = `roxas.filtered.editor.${unique}@xypes.local`;

    await prisma.user.createMany({
      data: [
        {
          name: `Filtered Dispatcher ${unique}`,
          email: dispatcherEmail,
          passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
          role: 'DISPATCHER',
          jurisdictionType: 'city',
          jurisdictionId: city.id,
        },
        {
          name: `Filtered Editor ${unique}`,
          email: editorEmail,
          passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
          role: 'CITY_CONTENT_EDITOR',
          jurisdictionType: 'city',
          jurisdictionId: city.id,
        },
      ],
    });

    const filters = encodeURIComponent(
      JSON.stringify([
        { field: 'role', operator: 'equals', value: 'DISPATCHER' },
        { field: 'jurisdictionType', operator: 'equals', value: 'city' },
        { field: 'jurisdictionId', operator: 'equals', value: city.id },
      ]),
    );

    const res = await request(app)
      .get(`${USERS}?filters=${filters}`)
      .set('Authorization', `Bearer ${cityAdminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.some((user: { email: string }) => user.email === dispatcherEmail)).toBe(true);
    expect(res.body.some((user: { email: string }) => user.email === editorEmail)).toBe(false);
    expect(
      res.body.every(
        (user: { role: string; jurisdictionType: string | null; jurisdictionId: string | null }) =>
          user.role === 'DISPATCHER' &&
          user.jurisdictionType === 'city' &&
          user.jurisdictionId === city.id,
      ),
    ).toBe(true);
  });

  it('should allow PROVINCIAL_ADMIN to list manageable Roxas users and exclude out-of-province users', async () => {
    const { province, city } = await ensureRoxasMunicipalityScope();
    const { city: outsideCity } = await ensureOutsideProvinceMunicipalityScope();

    await prisma.user.update({
      where: { email: 'provincial.admin@xypes.local' },
      data: {
        jurisdictionType: 'province',
        jurisdictionId: province.id,
      },
    });

    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const inProvinceCityAdminEmail = `roxas.city.admin.${unique}@xypes.local`;
    const inProvinceDispatcherEmail = `roxas.province.dispatcher.${unique}@xypes.local`;
    const outOfProvinceDispatcherEmail = `tuguegarao.dispatcher.${unique}@xypes.local`;

    await prisma.user.createMany({
      data: [
        {
          name: `Roxas City Admin ${unique}`,
          email: inProvinceCityAdminEmail,
          passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
          role: 'CITY_ADMIN',
          jurisdictionType: 'city',
          jurisdictionId: city.id,
        },
        {
          name: `Roxas Dispatcher ${unique}`,
          email: inProvinceDispatcherEmail,
          passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
          role: 'DISPATCHER',
          jurisdictionType: 'city',
          jurisdictionId: city.id,
        },
        {
          name: `Tuguegarao Dispatcher ${unique}`,
          email: outOfProvinceDispatcherEmail,
          passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
          role: 'DISPATCHER',
          jurisdictionType: 'city',
          jurisdictionId: outsideCity.id,
        },
      ],
    });

    const res = await request(app)
      .get(USERS)
      .set('Authorization', `Bearer ${provincialAdminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(
      res.body.some((user: { email: string }) => user.email === 'provincial.admin@xypes.local'),
    ).toBe(true);
    expect(
      res.body.some(
        (user: { email: string; role: string }) =>
          user.email === inProvinceCityAdminEmail && user.role === 'CITY_ADMIN',
      ),
    ).toBe(true);
    expect(
      res.body.some(
        (user: { email: string; role: string }) =>
          user.email === inProvinceDispatcherEmail && user.role === 'DISPATCHER',
      ),
    ).toBe(true);
    expect(
      res.body.some((user: { email: string }) => user.email === outOfProvinceDispatcherEmail),
    ).toBe(false);
  });

  it('should allow REGIONAL_DIRECTOR to list manageable Region II users across provinces and exclude out-of-region users', async () => {
    const { region, city: roxasCity } = await ensureRoxasMunicipalityScope();
    const { city: tuguegaraoCity } = await ensureOutsideProvinceMunicipalityScope();
    const { city: outsideRegionCity } = await ensureOutsideRegionMunicipalityScope();

    await prisma.user.update({
      where: { email: 'regional.director@xypes.local' },
      data: {
        jurisdictionType: 'region',
        jurisdictionId: region.id,
      },
    });

    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const roxasCityAdminEmail = `region.roxas.city.admin.${unique}@xypes.local`;
    const tuguegaraoDispatcherEmail = `region.tuguegarao.dispatcher.${unique}@xypes.local`;
    const outsideRegionDispatcherEmail = `region.malolos.dispatcher.${unique}@xypes.local`;

    await prisma.user.createMany({
      data: [
        {
          name: `Region Roxas City Admin ${unique}`,
          email: roxasCityAdminEmail,
          passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
          role: 'CITY_ADMIN',
          jurisdictionType: 'city',
          jurisdictionId: roxasCity.id,
        },
        {
          name: `Region Tuguegarao Dispatcher ${unique}`,
          email: tuguegaraoDispatcherEmail,
          passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
          role: 'DISPATCHER',
          jurisdictionType: 'city',
          jurisdictionId: tuguegaraoCity.id,
        },
        {
          name: `Region Malolos Dispatcher ${unique}`,
          email: outsideRegionDispatcherEmail,
          passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
          role: 'DISPATCHER',
          jurisdictionType: 'city',
          jurisdictionId: outsideRegionCity.id,
        },
      ],
    });

    const res = await request(app)
      .get(USERS)
      .set('Authorization', `Bearer ${regionalDirectorToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(
      res.body.some((user: { email: string }) => user.email === 'regional.director@xypes.local'),
    ).toBe(true);
    expect(
      res.body.some(
        (user: { email: string; role: string }) =>
          user.email === roxasCityAdminEmail && user.role === 'CITY_ADMIN',
      ),
    ).toBe(true);
    expect(
      res.body.some(
        (user: { email: string; role: string }) =>
          user.email === tuguegaraoDispatcherEmail && user.role === 'DISPATCHER',
      ),
    ).toBe(true);
    expect(
      res.body.some((user: { email: string }) => user.email === outsideRegionDispatcherEmail),
    ).toBe(false);
  });
});

describe(`GET ${USERS}/:id`, () => {
  it('should return 200 for NATIONAL_ADMIN when requesting a known existing user', async () => {
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@xypes.local' },
      select: { id: true },
    });

    expect(adminUser).not.toBeNull();

    const res = await request(app)
      .get(`${USERS}/${adminUser!.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', adminUser!.id);
    expect(res.body).toHaveProperty('email', 'admin@xypes.local');
  });

  it('should return a scoped municipal user for CITY_ADMIN and reject out-of-scope detail reads', async () => {
    const { city } = await ensureRoxasMunicipalityScope();
    await prisma.user.update({
      where: { email: 'ops.lead@xypes.local' },
      data: {
        jurisdictionType: 'city',
        jurisdictionId: city.id,
      },
    });

    const localUser = await prisma.user.create({
      data: {
        name: `Scoped User ${Date.now()}`,
        email: `scoped.user.${Date.now()}@xypes.local`,
        passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
        role: 'DISPATCHER',
        jurisdictionType: 'city',
        jurisdictionId: city.id,
      },
      select: { id: true, email: true },
    });

    const localRes = await request(app)
      .get(`${USERS}/${localUser.id}`)
      .set('Authorization', `Bearer ${cityAdminToken}`);

    expect(localRes.status).toBe(200);
    expect(localRes.body).toMatchObject({
      id: localUser.id,
      email: localUser.email,
      jurisdictionType: 'city',
      jurisdictionId: city.id,
    });

    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@xypes.local' },
      select: { id: true },
    });

    expect(adminUser).not.toBeNull();

    const blockedRes = await request(app)
      .get(`${USERS}/${adminUser!.id}`)
      .set('Authorization', `Bearer ${cityAdminToken}`);

    expect(blockedRes.status).toBe(403);
  });

  it('should allow PROVINCIAL_ADMIN to read in-province city users and reject out-of-province detail reads', async () => {
    const { province, city } = await ensureRoxasMunicipalityScope();
    const { city: outsideCity } = await ensureOutsideProvinceMunicipalityScope();

    await prisma.user.update({
      where: { email: 'provincial.admin@xypes.local' },
      data: {
        jurisdictionType: 'province',
        jurisdictionId: province.id,
      },
    });

    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const inProvinceCityAdmin = await prisma.user.create({
      data: {
        name: `Province Scoped City Admin ${unique}`,
        email: `province.city.admin.${unique}@xypes.local`,
        passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
        role: 'CITY_ADMIN',
        jurisdictionType: 'city',
        jurisdictionId: city.id,
      },
      select: { id: true, email: true },
    });

    const outOfProvinceDispatcher = await prisma.user.create({
      data: {
        name: `Outside Province Dispatcher ${unique}`,
        email: `outside.province.dispatcher.${unique}@xypes.local`,
        passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
        role: 'DISPATCHER',
        jurisdictionType: 'city',
        jurisdictionId: outsideCity.id,
      },
      select: { id: true },
    });

    const localRes = await request(app)
      .get(`${USERS}/${inProvinceCityAdmin.id}`)
      .set('Authorization', `Bearer ${provincialAdminToken}`);

    expect(localRes.status).toBe(200);
    expect(localRes.body).toMatchObject({
      id: inProvinceCityAdmin.id,
      email: inProvinceCityAdmin.email,
      role: 'CITY_ADMIN',
      jurisdictionType: 'city',
      jurisdictionId: city.id,
    });

    const blockedRes = await request(app)
      .get(`${USERS}/${outOfProvinceDispatcher.id}`)
      .set('Authorization', `Bearer ${provincialAdminToken}`);

    expect(blockedRes.status).toBe(403);
  });

  it('should allow REGIONAL_DIRECTOR to read in-region users and reject out-of-region detail reads', async () => {
    const { region, city: roxasCity } = await ensureRoxasMunicipalityScope();
    const { city: outsideRegionCity } = await ensureOutsideRegionMunicipalityScope();

    await prisma.user.update({
      where: { email: 'regional.director@xypes.local' },
      data: {
        jurisdictionType: 'region',
        jurisdictionId: region.id,
      },
    });

    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const inRegionCityAdmin = await prisma.user.create({
      data: {
        name: `Region Scoped City Admin ${unique}`,
        email: `region.city.admin.${unique}@xypes.local`,
        passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
        role: 'CITY_ADMIN',
        jurisdictionType: 'city',
        jurisdictionId: roxasCity.id,
      },
      select: { id: true, email: true },
    });

    const outOfRegionDispatcher = await prisma.user.create({
      data: {
        name: `Outside Region Dispatcher ${unique}`,
        email: `outside.region.dispatcher.${unique}@xypes.local`,
        passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
        role: 'DISPATCHER',
        jurisdictionType: 'city',
        jurisdictionId: outsideRegionCity.id,
      },
      select: { id: true },
    });

    const localRes = await request(app)
      .get(`${USERS}/${inRegionCityAdmin.id}`)
      .set('Authorization', `Bearer ${regionalDirectorToken}`);

    expect(localRes.status).toBe(200);
    expect(localRes.body).toMatchObject({
      id: inRegionCityAdmin.id,
      email: inRegionCityAdmin.email,
      role: 'CITY_ADMIN',
      jurisdictionType: 'city',
      jurisdictionId: roxasCity.id,
    });

    const blockedRes = await request(app)
      .get(`${USERS}/${outOfRegionDispatcher.id}`)
      .set('Authorization', `Bearer ${regionalDirectorToken}`);

    expect(blockedRes.status).toBe(403);
  });
});

describe(`GET ${ADMIN_MFA_COMPLIANCE}`, () => {
  it('should return an MFA compliance report for privileged users', async () => {
    const res = await request(app)
      .get(ADMIN_MFA_COMPLIANCE)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('summary');
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.summary).toHaveProperty('totalPrivilegedUsers');
    expect(res.body.summary).toHaveProperty('compliantUsers');
    expect(res.body.summary).toHaveProperty('nonCompliantUsers');

    for (const user of res.body.data) {
      expect(MFA_REQUIRED_ROLES).toContain(user.role);
      expect(user).toHaveProperty('requiresMfa', true);
      expect(typeof user.compliant).toBe('boolean');
    }
  });

  it('should return 403 for non-admin roles', async () => {
    const dispatcherToken = await getTokenForRole('dispatcher@xypes.local');
    const res = await request(app)
      .get(ADMIN_MFA_COMPLIANCE)
      .set('Authorization', `Bearer ${dispatcherToken}`);

    expect(res.status).toBe(403);
  });
});

describe(`POST ${USERS}/:id/restore`, () => {
  let departmentManagerToken = '';

  beforeAll(async () => {
    departmentManagerToken = await getTokenForRole('ops.lead@xypes.local');
  });

  async function createArchivedUser(role: string) {
    const unique = Date.now();
    const createRes = await request(app)
      .post(USERS)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Restorable User ${unique}`,
        email: `restorable.${unique}@xypes.local`,
        password: 'Password123!',
        role,
      });

    expect(createRes.status).toBe(201);
    const archivedUserId = createRes.body.id as string;

    const deleteRes = await request(app)
      .delete(`${USERS}/${archivedUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(204);
    return archivedUserId;
  }

  it('should restore an archived user and make it visible again', async () => {
    const archivedUserId = await createArchivedUser('CITIZEN_REPORTER');

    const restoreRes = await request(app)
      .post(`${USERS}/${archivedUserId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (!archiveEnabled) {
      expect(restoreRes.status).toBe(404);
      return;
    }

    expect(restoreRes.status).toBe(200);

    expect(restoreRes.body).toHaveProperty('id', archivedUserId);

    const fetchRes = await request(app)
      .get(`${USERS}/${archivedUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body).toHaveProperty('id', archivedUserId);
  });

  it('should enforce role hierarchy when restoring archived users', async () => {
    const unique = Date.now();

    const archivedPrivilegedUser = await prisma.user.create({
      data: {
        name: `Archived National Admin ${unique}`,
        email: `archived.system.admin.${unique}@xypes.local`,
        passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
        role: 'NATIONAL_ADMIN',
        archivedAt: new Date(),
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaEnabledAt: null,
      },
      select: { id: true },
    });

    const restoreRes = await request(app)
      .post(`${USERS}/${archivedPrivilegedUser.id}/restore`)
      .set('Authorization', `Bearer ${departmentManagerToken}`);

    if (!archiveEnabled) {
      expect(restoreRes.status).toBe(404);
      return;
    }

    expect(restoreRes.status).toBe(403);
  });

  it('should allow PROVINCIAL_ADMIN to delete and restore in-province users but reject out-of-province lifecycle actions', async () => {
    const { province, city: roxasCity } = await ensureRoxasMunicipalityScope();
    const { city: outsideProvinceCity } = await ensureOutsideProvinceMunicipalityScope();

    await prisma.user.update({
      where: { email: 'provincial.admin@xypes.local' },
      data: {
        jurisdictionType: 'province',
        jurisdictionId: province.id,
      },
    });

    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const inProvinceUser = await prisma.user.create({
      data: {
        name: `Province Lifecycle User ${unique}`,
        email: `province.lifecycle.${unique}@xypes.local`,
        passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
        role: 'DISPATCHER',
        jurisdictionType: 'city',
        jurisdictionId: roxasCity.id,
      },
      select: { id: true },
    });

    const outOfProvinceUser = await prisma.user.create({
      data: {
        name: `Province Outside User ${unique}`,
        email: `province.outside.${unique}@xypes.local`,
        passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
        role: 'DISPATCHER',
        jurisdictionType: 'city',
        jurisdictionId: outsideProvinceCity.id,
      },
      select: { id: true },
    });

    const allowedDeleteRes = await request(app)
      .delete(`${USERS}/${inProvinceUser.id}`)
      .set('Authorization', `Bearer ${provincialAdminToken}`);

    expect(allowedDeleteRes.status).toBe(204);

    const blockedDeleteRes = await request(app)
      .delete(`${USERS}/${outOfProvinceUser.id}`)
      .set('Authorization', `Bearer ${provincialAdminToken}`);

    expect(blockedDeleteRes.status).toBe(403);

    const allowedRestoreRes = await request(app)
      .post(`${USERS}/${inProvinceUser.id}/restore`)
      .set('Authorization', `Bearer ${provincialAdminToken}`);

    if (!archiveEnabled) {
      expect(allowedRestoreRes.status).toBe(404);
      return;
    }

    expect(allowedRestoreRes.status).toBe(200);
    expect(allowedRestoreRes.body).toMatchObject({
      id: inProvinceUser.id,
      jurisdictionType: 'city',
      jurisdictionId: roxasCity.id,
    });

    const adminDeleteRes = await request(app)
      .delete(`${USERS}/${outOfProvinceUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminDeleteRes.status).toBe(204);

    const blockedRestoreRes = await request(app)
      .post(`${USERS}/${outOfProvinceUser.id}/restore`)
      .set('Authorization', `Bearer ${provincialAdminToken}`);

    expect(blockedRestoreRes.status).toBe(403);
  });

  it('should allow REGIONAL_DIRECTOR to delete and restore in-region users but reject out-of-region lifecycle actions', async () => {
    const { region, city: roxasCity } = await ensureRoxasMunicipalityScope();
    const { city: outsideRegionCity } = await ensureOutsideRegionMunicipalityScope();

    await prisma.user.update({
      where: { email: 'regional.director@xypes.local' },
      data: {
        jurisdictionType: 'region',
        jurisdictionId: region.id,
      },
    });

    const unique = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const inRegionUser = await prisma.user.create({
      data: {
        name: `Region Lifecycle User ${unique}`,
        email: `region.lifecycle.${unique}@xypes.local`,
        passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
        role: 'DISPATCHER',
        jurisdictionType: 'city',
        jurisdictionId: roxasCity.id,
      },
      select: { id: true },
    });

    const outOfRegionUser = await prisma.user.create({
      data: {
        name: `Region Outside User ${unique}`,
        email: `region.outside.${unique}@xypes.local`,
        passwordHash: '$2b$10$KhfHQsXw9ehRSmQbqqh0ve3K2yR0F0KJy0Tp8FVXiLU3swp3gzmWK',
        role: 'DISPATCHER',
        jurisdictionType: 'city',
        jurisdictionId: outsideRegionCity.id,
      },
      select: { id: true },
    });

    const allowedDeleteRes = await request(app)
      .delete(`${USERS}/${inRegionUser.id}`)
      .set('Authorization', `Bearer ${regionalDirectorToken}`);

    expect(allowedDeleteRes.status).toBe(204);

    const blockedDeleteRes = await request(app)
      .delete(`${USERS}/${outOfRegionUser.id}`)
      .set('Authorization', `Bearer ${regionalDirectorToken}`);

    expect(blockedDeleteRes.status).toBe(403);

    const allowedRestoreRes = await request(app)
      .post(`${USERS}/${inRegionUser.id}/restore`)
      .set('Authorization', `Bearer ${regionalDirectorToken}`);

    if (!archiveEnabled) {
      expect(allowedRestoreRes.status).toBe(404);
      return;
    }

    expect(allowedRestoreRes.status).toBe(200);
    expect(allowedRestoreRes.body).toMatchObject({
      id: inRegionUser.id,
      jurisdictionType: 'city',
      jurisdictionId: roxasCity.id,
    });

    const adminDeleteRes = await request(app)
      .delete(`${USERS}/${outOfRegionUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminDeleteRes.status).toBe(204);

    const blockedRestoreRes = await request(app)
      .post(`${USERS}/${outOfRegionUser.id}/restore`)
      .set('Authorization', `Bearer ${regionalDirectorToken}`);

    expect(blockedRestoreRes.status).toBe(403);
  });
});
