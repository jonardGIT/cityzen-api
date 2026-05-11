import type { Request, Response } from 'express';
import {
  CAGAYAN_PROVINCE_CODE,
  MOBILE_CAGAYAN_LOCALITIES_MISCONFIGURATION_MESSAGE,
  getActiveCagayanGeographyMeta,
  getActiveCagayanLocalityById,
  getActiveCagayanProvince,
  listActiveCagayanBarangays,
  listActiveCagayanLocalities,
} from '../services/cagayanMobileGeographyService.js';

export async function getCagayanGeographyMeta(_req: Request, res: Response): Promise<void> {
  const geographyMeta = await getActiveCagayanGeographyMeta();

  if (!geographyMeta) {
    res.status(503).json({
      message: MOBILE_CAGAYAN_LOCALITIES_MISCONFIGURATION_MESSAGE,
    });
    return;
  }

  res.json({
    scope: {
      pilotScope: 'tuguegarao-first',
      provinceCode: CAGAYAN_PROVINCE_CODE,
    },
    geographyVersion: geographyMeta.geographyVersion,
    lastUpdatedAt: geographyMeta.lastUpdatedAt,
  });
}

export async function getCagayanLocalities(_req: Request, res: Response): Promise<void> {
  const province = await getActiveCagayanProvince();

  if (!province) {
    res.status(503).json({
      message: MOBILE_CAGAYAN_LOCALITIES_MISCONFIGURATION_MESSAGE,
    });
    return;
  }

  const localities = await listActiveCagayanLocalities(province.id);

  res.json({
    province: {
      code: province.code,
      name: province.name,
    },
    localities,
  });
}

export async function getCagayanLocalityBarangays(req: Request, res: Response): Promise<void> {
  const localityId = Array.isArray(req.params.localityId)
    ? req.params.localityId[0]
    : req.params.localityId;

  const locality = await getActiveCagayanLocalityById(localityId);

  if (!locality) {
    res.status(404).json({
      message: 'Active Cagayan locality not found',
    });
    return;
  }

  const barangays = await listActiveCagayanBarangays(locality.id);

  res.json({
    locality,
    barangays,
  });
}
