import prisma from '../lib/prisma.js';
import { withActiveRecords } from '../utils/archive.js';

export const CAGAYAN_PROVINCE_CODE = '021500000';
export const MOBILE_CAGAYAN_LOCALITIES_MISCONFIGURATION_MESSAGE =
  'Mobile Cagayan locality reference is unavailable: active Cagayan province geography is not configured on the server.';
export const MOBILE_PROFILE_LOCALITY_MISCONFIGURATION_MESSAGE =
  'Mobile profile locality selection is unavailable: active Cagayan province geography is not configured on the server.';

export type CagayanProvinceReference = {
  id: string;
  code: string;
  name: string;
};

export type CagayanLocalityReference = {
  id: string;
  code: string;
  name: string;
  type: string;
};

export type CagayanBarangayReference = {
  id: string;
  code: string;
  name: string;
};

export async function getActiveCagayanProvince(): Promise<CagayanProvinceReference | null> {
  return prisma.province.findFirst({
    where: withActiveRecords({
      code: CAGAYAN_PROVINCE_CODE,
    }),
    select: {
      id: true,
      code: true,
      name: true,
    },
  });
}

export async function listActiveCagayanLocalities(
  provinceId: string,
): Promise<CagayanLocalityReference[]> {
  return prisma.cityMunicipality.findMany({
    where: withActiveRecords({
      provinceId,
      province: withActiveRecords({
        code: CAGAYAN_PROVINCE_CODE,
      }),
    }),
    orderBy: {
      name: 'asc',
    },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
    },
  });
}

export async function getActiveCagayanLocalityById(
  localityId: string,
): Promise<CagayanLocalityReference | null> {
  return prisma.cityMunicipality.findFirst({
    where: withActiveRecords({
      id: localityId,
      province: withActiveRecords({
        code: CAGAYAN_PROVINCE_CODE,
      }),
    }),
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
    },
  });
}

export async function listActiveCagayanBarangays(
  localityId: string,
): Promise<CagayanBarangayReference[]> {
  return prisma.barangay.findMany({
    where: withActiveRecords({
      cityMunicipalityId: localityId,
      cityMunicipality: withActiveRecords({
        province: withActiveRecords({
          code: CAGAYAN_PROVINCE_CODE,
        }),
      }),
    }),
    orderBy: {
      name: 'asc',
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });
}

export async function getActiveCagayanBarangayById(
  localityId: string,
  barangayId: string,
): Promise<CagayanBarangayReference | null> {
  return prisma.barangay.findFirst({
    where: withActiveRecords({
      id: barangayId,
      cityMunicipalityId: localityId,
      cityMunicipality: withActiveRecords({
        province: withActiveRecords({
          code: CAGAYAN_PROVINCE_CODE,
        }),
      }),
    }),
    select: {
      id: true,
      code: true,
      name: true,
    },
  });
}
