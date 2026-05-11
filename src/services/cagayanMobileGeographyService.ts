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

export type CagayanGeographyMetaReference = {
  provinceCode: string;
  geographyVersion: string;
  lastUpdatedAt: string;
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

async function findActiveCagayanProvinceRecord(): Promise<{
  id: string;
  code: string;
  name: string;
  updatedAt: Date;
} | null> {
  return prisma.province.findFirst({
    where: withActiveRecords({
      code: CAGAYAN_PROVINCE_CODE,
    }),
    select: {
      id: true,
      code: true,
      name: true,
      updatedAt: true,
    },
  });
}

export async function getActiveCagayanProvince(): Promise<CagayanProvinceReference | null> {
  const province = await findActiveCagayanProvinceRecord();

  if (!province) {
    return null;
  }

  return {
    id: province.id,
    code: province.code,
    name: province.name,
  };
}

export async function getActiveCagayanGeographyMeta(): Promise<CagayanGeographyMetaReference | null> {
  const province = await findActiveCagayanProvinceRecord();

  if (!province) {
    return null;
  }

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

  return {
    provinceCode: province.code,
    geographyVersion: `${province.code}:${lastUpdatedAtIso}`,
    lastUpdatedAt: lastUpdatedAtIso,
  };
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
