import prisma from '../lib/prisma.js';
import { withActiveRecords } from '../utils/archive.js';

type LocalityResolutionInput = {
  barangay?: string | null;
  cityName?: string | null;
  provinceName?: string | null;
  regionName?: string | null;
  barangayId?: string | null;
  cityMunicipalityId?: string | null;
  provinceId?: string | null;
  regionId?: string | null;
};

type LocalityResolutionResult = {
  barangayId: string | null;
  cityMunicipalityId: string | null;
  provinceId: string | null;
  regionId: string | null;
};

type RegionRecord = {
  id: string;
  name: string;
};

type ProvinceRecord = {
  id: string;
  name: string;
  regionId: string;
  region: RegionRecord;
};

type CityMunicipalityRecord = {
  id: string;
  name: string;
  provinceId: string;
  province: ProvinceRecord;
};

type BarangayRecord = {
  id: string;
  name: string;
  cityMunicipalityId: string;
  cityMunicipality: CityMunicipalityRecord;
};

export class IncidentLocalityResolutionError extends Error {}

function normalizeLocalityName(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function findUniqueNormalizedMatch<T extends { name: string }>(
  records: T[],
  expectedName: string | null | undefined,
): T | null {
  const normalizedExpected = normalizeLocalityName(expectedName);
  if (!normalizedExpected) {
    return null;
  }

  const matches = records.filter(
    (record) => normalizeLocalityName(record.name) === normalizedExpected,
  );

  return matches.length === 1 ? matches[0] : null;
}

function assertSnapshotMatch(
  field: 'regionId' | 'provinceId' | 'cityMunicipalityId' | 'barangayId',
  recordName: string,
  snapshotName: string | null | undefined,
): void {
  if (!snapshotName) {
    return;
  }

  if (normalizeLocalityName(recordName) !== normalizeLocalityName(snapshotName)) {
    throw new IncidentLocalityResolutionError(
      `${field} does not reference an active locality matching the incident snapshot`,
    );
  }
}

async function findRegionById(regionId: string | null | undefined): Promise<RegionRecord | null> {
  if (!regionId) {
    return null;
  }

  return prisma.region.findFirst({
    where: withActiveRecords({ id: regionId }),
    select: {
      id: true,
      name: true,
    },
  });
}

async function findProvinceById(
  provinceId: string | null | undefined,
): Promise<ProvinceRecord | null> {
  if (!provinceId) {
    return null;
  }

  return prisma.province.findFirst({
    where: withActiveRecords({ id: provinceId }),
    select: {
      id: true,
      name: true,
      regionId: true,
      region: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

async function findCityById(
  cityMunicipalityId: string | null | undefined,
): Promise<CityMunicipalityRecord | null> {
  if (!cityMunicipalityId) {
    return null;
  }

  return prisma.cityMunicipality.findFirst({
    where: withActiveRecords({ id: cityMunicipalityId }),
    select: {
      id: true,
      name: true,
      provinceId: true,
      province: {
        select: {
          id: true,
          name: true,
          regionId: true,
          region: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

async function findBarangayById(
  barangayId: string | null | undefined,
): Promise<BarangayRecord | null> {
  if (!barangayId) {
    return null;
  }

  return prisma.barangay.findFirst({
    where: withActiveRecords({ id: barangayId }),
    select: {
      id: true,
      name: true,
      cityMunicipalityId: true,
      cityMunicipality: {
        select: {
          id: true,
          name: true,
          provinceId: true,
          province: {
            select: {
              id: true,
              name: true,
              regionId: true,
              region: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

async function resolveRegionByName(
  regionName: string | null | undefined,
): Promise<RegionRecord | null> {
  if (!regionName) {
    return null;
  }

  const regions = await prisma.region.findMany({
    where: withActiveRecords({}),
    select: {
      id: true,
      name: true,
    },
  });

  return findUniqueNormalizedMatch(regions, regionName);
}

async function resolveProvinceByName(input: {
  provinceName: string | null | undefined;
  regionId?: string | null;
}): Promise<ProvinceRecord | null> {
  if (!input.provinceName) {
    return null;
  }

  const provinces = await prisma.province.findMany({
    where: withActiveRecords({
      ...(input.regionId ? { regionId: input.regionId } : {}),
    }),
    select: {
      id: true,
      name: true,
      regionId: true,
      region: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return findUniqueNormalizedMatch(provinces, input.provinceName);
}

async function resolveCityByName(input: {
  cityName: string | null | undefined;
  provinceId?: string | null;
}): Promise<CityMunicipalityRecord | null> {
  if (!input.cityName || !input.provinceId) {
    return null;
  }

  const cities = await prisma.cityMunicipality.findMany({
    where: withActiveRecords({ provinceId: input.provinceId }),
    select: {
      id: true,
      name: true,
      provinceId: true,
      province: {
        select: {
          id: true,
          name: true,
          regionId: true,
          region: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return findUniqueNormalizedMatch(cities, input.cityName);
}

async function resolveBarangayByName(input: {
  barangay: string | null | undefined;
  cityMunicipalityId?: string | null;
}): Promise<BarangayRecord | null> {
  if (!input.barangay || !input.cityMunicipalityId) {
    return null;
  }

  const barangays = await prisma.barangay.findMany({
    where: withActiveRecords({ cityMunicipalityId: input.cityMunicipalityId }),
    select: {
      id: true,
      name: true,
      cityMunicipalityId: true,
      cityMunicipality: {
        select: {
          id: true,
          name: true,
          provinceId: true,
          province: {
            select: {
              id: true,
              name: true,
              regionId: true,
              region: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return findUniqueNormalizedMatch(barangays, input.barangay);
}

export async function resolveIncidentLocalityIds(
  input: LocalityResolutionInput,
): Promise<LocalityResolutionResult> {
  const [explicitRegion, explicitProvince, explicitCity, explicitBarangay] = await Promise.all([
    findRegionById(input.regionId),
    findProvinceById(input.provinceId),
    findCityById(input.cityMunicipalityId),
    findBarangayById(input.barangayId),
  ]);

  if (input.regionId && !explicitRegion) {
    throw new IncidentLocalityResolutionError('regionId does not reference an active region');
  }
  if (input.provinceId && !explicitProvince) {
    throw new IncidentLocalityResolutionError('provinceId does not reference an active province');
  }
  if (input.cityMunicipalityId && !explicitCity) {
    throw new IncidentLocalityResolutionError(
      'cityMunicipalityId does not reference an active city or municipality',
    );
  }
  if (input.barangayId && !explicitBarangay) {
    throw new IncidentLocalityResolutionError('barangayId does not reference an active barangay');
  }

  if (explicitProvince && explicitRegion && explicitProvince.regionId !== explicitRegion.id) {
    throw new IncidentLocalityResolutionError('provinceId does not belong to regionId');
  }

  if (explicitCity && explicitProvince && explicitCity.provinceId !== explicitProvince.id) {
    throw new IncidentLocalityResolutionError('cityMunicipalityId does not belong to provinceId');
  }

  if (explicitCity && explicitRegion && explicitCity.province.region.id !== explicitRegion.id) {
    throw new IncidentLocalityResolutionError('cityMunicipalityId does not belong to regionId');
  }

  if (explicitBarangay && explicitCity && explicitBarangay.cityMunicipalityId !== explicitCity.id) {
    throw new IncidentLocalityResolutionError('barangayId does not belong to cityMunicipalityId');
  }

  if (
    explicitBarangay &&
    explicitProvince &&
    explicitBarangay.cityMunicipality.province.id !== explicitProvince.id
  ) {
    throw new IncidentLocalityResolutionError('barangayId does not belong to provinceId');
  }

  if (
    explicitBarangay &&
    explicitRegion &&
    explicitBarangay.cityMunicipality.province.region.id !== explicitRegion.id
  ) {
    throw new IncidentLocalityResolutionError('barangayId does not belong to regionId');
  }

  let region =
    explicitRegion ??
    explicitProvince?.region ??
    explicitCity?.province.region ??
    explicitBarangay?.cityMunicipality.province.region ??
    null;
  let province =
    explicitProvince ??
    explicitCity?.province ??
    explicitBarangay?.cityMunicipality.province ??
    null;
  let city = explicitCity ?? explicitBarangay?.cityMunicipality ?? null;
  let barangay = explicitBarangay ?? null;

  if (!region) {
    region = await resolveRegionByName(input.regionName);
  }

  if (!province) {
    province = await resolveProvinceByName({
      provinceName: input.provinceName,
      regionId: region?.id ?? null,
    });
  }

  if (!city) {
    city = await resolveCityByName({
      cityName: input.cityName,
      provinceId: province?.id ?? null,
    });
  }

  if (!barangay) {
    barangay = await resolveBarangayByName({
      barangay: input.barangay,
      cityMunicipalityId: city?.id ?? null,
    });
  }

  if (region) {
    assertSnapshotMatch('regionId', region.name, input.regionName);
  }

  if (province) {
    assertSnapshotMatch('provinceId', province.name, input.provinceName);
  }

  if (city) {
    assertSnapshotMatch('cityMunicipalityId', city.name, input.cityName);
  }

  if (barangay) {
    assertSnapshotMatch('barangayId', barangay.name, input.barangay);
  }

  return {
    regionId: region?.id ?? null,
    provinceId: province?.id ?? null,
    cityMunicipalityId: city?.id ?? null,
    barangayId: barangay?.id ?? null,
  };
}
