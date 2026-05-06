import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { body } from 'express-validator';
import prisma from '../lib/prisma.js';
import { createCrudController } from '../engine/crudControllerFactory.js';
import { citizensListQueryConfig } from '../utils/listQueryConfig.js';
import type { ContentTypeConfig } from '../engine/types.js';
import type { Citizen } from '../types/models.js';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import { withActiveRecords } from '../utils/archive.js';
import {
  AMBIGUOUS_LINKED_CITIZEN_MESSAGE,
  CONFLICTING_LINKED_CITIZEN_MESSAGE,
  MANUAL_LINK_REQUIRED_LINKED_CITIZEN_MESSAGE,
  assignCitizenToUser,
  resolveLinkedCitizenForAuthUser,
} from '../services/userCitizenLinkService.js';
import {
  PrivacyNoticeAcceptanceError,
  resolvePrivacyNoticeAcceptance,
} from '../utils/privacyNotice.js';
import {
  buildCanonicalNameCreateData,
  buildCanonicalNameUpdateData,
  formatCanonicalDisplayName,
  hasAnyCanonicalNameField,
  resolveStoredDisplayName,
} from '../utils/nameFields.js';
import {
  buildCanonicalNameCreateValidators,
  buildCanonicalNameUpdateValidators,
} from '../validators/nameFields.js';
import {
  MOBILE_PROFILE_LOCALITY_MISCONFIGURATION_MESSAGE,
  getActiveCagayanBarangayById,
  getActiveCagayanLocalityById,
  getActiveCagayanProvince,
} from '../services/cagayanMobileGeographyService.js';

type CitizenLocationReference = {
  id: string;
  code: string;
  name: string;
  type?: string;
};

type CitizenProfileSerializedRecord = Record<string, unknown> & {
  name?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  suffix?: string | null;
  cityMunicipalityRef?: CitizenLocationReference | null;
  barangayRef?: CitizenLocationReference | null;
};

type MobileCitizenProfileLocationInput = {
  addressLine1?: string;
  addressLine2?: string | null;
  cityMunicipalityId?: string | null;
  barangayId?: string | null;
};

const mobileCitizenProfileInclude: Prisma.CitizenInclude = {
  cityMunicipalityRef: {
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
    },
  },
  barangayRef: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
} as const;

function serializeCitizenRecord(record: CitizenProfileSerializedRecord): Record<string, unknown> {
  const { cityMunicipalityRef, barangayRef, ...rest } = record;

  return {
    ...rest,
    name: resolveStoredDisplayName(record),
    locality: cityMunicipalityRef
      ? {
          id: cityMunicipalityRef.id,
          code: cityMunicipalityRef.code,
          name: cityMunicipalityRef.name,
          type: cityMunicipalityRef.type,
        }
      : null,
    barangay: barangayRef
      ? {
          id: barangayRef.id,
          code: barangayRef.code,
          name: barangayRef.name,
        }
      : null,
  };
}

async function resolveMobileCitizenProfileLocationData(
  body: Record<string, unknown>,
  existingCitizen?: {
    cityMunicipalityId?: string | null;
  },
): Promise<
  | { status: 'ok'; data: MobileCitizenProfileLocationInput }
  | { status: 'error'; code: number; message: string }
> {
  const hasCityMunicipalityId = Object.prototype.hasOwnProperty.call(body, 'cityMunicipalityId');
  const hasBarangayId = Object.prototype.hasOwnProperty.call(body, 'barangayId');
  const hasAddressLine1 = Object.prototype.hasOwnProperty.call(body, 'addressLine1');
  const hasAddressLine2 = Object.prototype.hasOwnProperty.call(body, 'addressLine2');

  if (!hasCityMunicipalityId && !hasBarangayId && !hasAddressLine1 && !hasAddressLine2) {
    return { status: 'ok', data: {} };
  }

  const province = await getActiveCagayanProvince();

  if (!province) {
    return {
      status: 'error',
      code: 503,
      message: MOBILE_PROFILE_LOCALITY_MISCONFIGURATION_MESSAGE,
    };
  }

  const data: MobileCitizenProfileLocationInput = {};
  const cityMunicipalityId = hasCityMunicipalityId
    ? ((body.cityMunicipalityId as string | null | undefined) ?? null)
    : undefined;
  const barangayId = hasBarangayId
    ? ((body.barangayId as string | null | undefined) ?? null)
    : undefined;

  if (hasAddressLine1) {
    data.addressLine1 = body.addressLine1 as string;
  }

  if (hasAddressLine2) {
    data.addressLine2 = (body.addressLine2 as string | null | undefined) ?? null;
  }

  if (hasBarangayId && !hasCityMunicipalityId) {
    return {
      status: 'error',
      code: 422,
      message: 'cityMunicipalityId is required when barangayId is provided',
    };
  }

  if (hasCityMunicipalityId) {
    data.cityMunicipalityId = cityMunicipalityId ?? null;

    if (cityMunicipalityId) {
      const locality = await getActiveCagayanLocalityById(cityMunicipalityId);

      if (!locality) {
        return {
          status: 'error',
          code: 404,
          message: 'Active Cagayan locality not found',
        };
      }
    }

    if (cityMunicipalityId === null) {
      data.barangayId = null;
      return { status: 'ok', data };
    }
  }

  if (hasBarangayId) {
    if (barangayId === null) {
      data.barangayId = null;
    } else {
      const resolvedCityMunicipalityId = cityMunicipalityId as string;
      const resolvedBarangayId = barangayId as string;
      const barangay = await getActiveCagayanBarangayById(
        resolvedCityMunicipalityId,
        resolvedBarangayId,
      );

      if (!barangay) {
        return {
          status: 'error',
          code: 404,
          message: 'Active Cagayan barangay not found for the selected locality',
        };
      }

      data.barangayId = barangay.id;
    }
  } else if (
    hasCityMunicipalityId &&
    cityMunicipalityId !== undefined &&
    cityMunicipalityId !== (existingCitizen?.cityMunicipalityId ?? null)
  ) {
    data.barangayId = null;
  }

  return { status: 'ok', data };
}

const config: ContentTypeConfig = {
  modelName: 'citizen',
  displayName: 'Citizen',
  listQueryConfig: citizensListQueryConfig,
  fields: [
    { name: 'firstName' },
    { name: 'middleName' },
    { name: 'lastName' },
    { name: 'suffix' },
    { name: 'contactInfo', requiredOnCreate: true },
    { name: 'preferredChannel', requiredOnCreate: true },
  ],
  allowedIncludes: {
    incidents: {
      fragment: { where: withActiveRecords() },
      children: {
        status: true,
        category: true,
        severity: true,
        mediaFiles: true,
      },
    },
  },
  deleteGuards: [
    {
      model: 'citizenIncident',
      foreignKey: 'citizenId',
      message: 'Conflict: citizen still has active incidents',
    },
  ],
  hooks: {
    async beforeCreate(_req, res, body) {
      const nameData = buildCanonicalNameCreateData(body);

      if (!nameData) {
        res.status(422).json({ message: 'name or firstName and lastName are required' });
        return null;
      }

      const canonicalNameData = nameData;
      const canonicalDisplayName = nameData.name;

      return {
        data: {
          ...canonicalNameData,
          name: canonicalDisplayName,
        },
      };
    },
    async beforeUpdate(_req, res, body, existing) {
      const nameData = buildCanonicalNameUpdateData(body);
      const hasSplitNameFields = ['firstName', 'middleName', 'lastName', 'suffix'].some((field) =>
        Object.prototype.hasOwnProperty.call(body, field),
      );

      if (!hasAnyCanonicalNameField(body)) {
        return { data: nameData };
      }

      if (!hasSplitNameFields) {
        return { data: nameData };
      }

      const nextNameState = {
        firstName:
          nameData.firstName ?? (existing.firstName as string | null | undefined) ?? undefined,
        middleName: nameData.middleName ?? (existing.middleName as string | null | undefined),
        lastName:
          nameData.lastName ?? (existing.lastName as string | null | undefined) ?? undefined,
        suffix: nameData.suffix ?? (existing.suffix as string | null | undefined),
      };
      const displayName = formatCanonicalDisplayName(nextNameState);

      if (!displayName) {
        res
          .status(422)
          .json({ message: 'firstName and lastName are required for canonical name updates' });
        return null;
      }

      const canonicalDisplayName = displayName;

      return {
        data: {
          ...nameData,
          name: canonicalDisplayName,
        },
      };
    },
    serializeResponse(record) {
      return serializeCitizenRecord(record);
    },
  },
};

const handlers = createCrudController(config);
export const validators = {
  create: [
    ...buildCanonicalNameCreateValidators(),
    body('contactInfo')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('contactInfo is required')
      .custom((value) => !value.includes('\0'))
      .withMessage('contactInfo must not contain null bytes'),
    body('preferredChannel')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('preferredChannel is required')
      .custom((value) => !value.includes('\0'))
      .withMessage('preferredChannel must not contain null bytes'),
  ],
  update: [
    body().custom((value) => {
      const hasUpdatableField = [
        'name',
        'firstName',
        'middleName',
        'lastName',
        'suffix',
        'contactInfo',
        'preferredChannel',
      ].some((field) => value?.[field] !== undefined);

      if (!hasUpdatableField) {
        throw new Error(
          'at least one of name, firstName, middleName, lastName, suffix, contactInfo, or preferredChannel is required',
        );
      }

      return true;
    }),
    ...buildCanonicalNameUpdateValidators(),
    body('contactInfo')
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage('contactInfo must be a non-empty string')
      .custom((value) => typeof value !== 'string' || !value.includes('\0'))
      .withMessage('contactInfo must not contain null bytes'),
    body('preferredChannel')
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage('preferredChannel must be a non-empty string')
      .custom((value) => typeof value !== 'string' || !value.includes('\0'))
      .withMessage('preferredChannel must not contain null bytes'),
  ],
};

export const getCitizens = handlers.getAll;
export const getCitizenById = handlers.getById;
export const createCitizen = handlers.create;
export const updateCitizen = handlers.update;
export const deleteCitizen = handlers.remove;
export const restoreCitizen = handlers.restore;

export async function getMyCitizenProfile(req: Request, res: Response): Promise<void> {
  const { authUser } = req as AuthenticatedRequest;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const resolution = await resolveLinkedCitizenForAuthUser({
    id: authUser.id,
    email: authUser.email,
  });

  if (resolution.status === 'ambiguous') {
    res.status(409).json({ message: AMBIGUOUS_LINKED_CITIZEN_MESSAGE });
    return;
  }

  if (resolution.status === 'conflict') {
    res.status(409).json({ message: CONFLICTING_LINKED_CITIZEN_MESSAGE });
    return;
  }

  if (resolution.status === 'manual-link-required') {
    res.status(409).json({ message: MANUAL_LINK_REQUIRED_LINKED_CITIZEN_MESSAGE });
    return;
  }

  if (resolution.status === 'missing') {
    res.status(404).json({ message: 'Citizen profile not found for authenticated user' });
    return;
  }

  const citizen = await prisma.citizen.findFirst({
    where: withActiveRecords({ id: resolution.citizenId }),
    include: mobileCitizenProfileInclude,
  });

  if (!citizen) {
    res.status(404).json({ message: 'Citizen profile not found for authenticated user' });
    return;
  }

  res.json(serializeCitizenRecord(citizen as CitizenProfileSerializedRecord));
}

export async function linkMyCitizenProfile(req: Request, res: Response): Promise<void> {
  const { authUser } = req as AuthenticatedRequest;
  if (!authUser) {
    res.status(401).json({ message: 'Unauthorized: missing authentication context' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const { preferredChannel } = body as Partial<Citizen>;
  const nameData = buildCanonicalNameUpdateData(body);
  const hasLocationOrAddressField = [
    'addressLine1',
    'addressLine2',
    'cityMunicipalityId',
    'barangayId',
  ].some((field) => Object.prototype.hasOwnProperty.call(body, field));

  if (!hasAnyCanonicalNameField(body) && !preferredChannel && !hasLocationOrAddressField) {
    res.status(422).json({
      message:
        'at least one of name, firstName, middleName, lastName, suffix, preferredChannel, addressLine1, addressLine2, cityMunicipalityId, or barangayId is required',
    });
    return;
  }

  const resolution = await resolveLinkedCitizenForAuthUser({
    id: authUser.id,
    email: authUser.email,
  });

  if (resolution.status === 'ambiguous') {
    res.status(409).json({ message: AMBIGUOUS_LINKED_CITIZEN_MESSAGE });
    return;
  }

  if (resolution.status === 'conflict') {
    res.status(409).json({ message: CONFLICTING_LINKED_CITIZEN_MESSAGE });
    return;
  }

  if (resolution.status === 'manual-link-required') {
    res.status(409).json({ message: MANUAL_LINK_REQUIRED_LINKED_CITIZEN_MESSAGE });
    return;
  }

  const existingCitizenId = resolution.status === 'linked' ? resolution.citizenId : null;

  if (!existingCitizenId) {
    const createNameData = buildCanonicalNameCreateData(body);

    if (!createNameData || !preferredChannel) {
      res.status(422).json({
        message:
          'name or firstName and lastName, and preferredChannel are required when creating a new linked citizen profile',
      });
      return;
    }

    const locationData = await resolveMobileCitizenProfileLocationData(body);

    if (locationData.status === 'error') {
      res.status(locationData.code).json({ message: locationData.message });
      return;
    }

    const userPrivacyState = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        privacyNoticeAcceptedAt: true,
        privacyNoticeVersion: true,
      },
    });

    let privacyNoticeAcceptance =
      userPrivacyState?.privacyNoticeAcceptedAt && userPrivacyState.privacyNoticeVersion
        ? {
            acceptedAt: userPrivacyState.privacyNoticeAcceptedAt,
            version: userPrivacyState.privacyNoticeVersion,
          }
        : null;

    if (!privacyNoticeAcceptance) {
      try {
        privacyNoticeAcceptance = resolvePrivacyNoticeAcceptance(
          req.body as Record<string, unknown>,
        );
      } catch (error) {
        if (error instanceof PrivacyNoticeAcceptanceError) {
          res.status(422).json({ message: error.message });
          return;
        }

        throw error;
      }
    }

    const citizen = await prisma.$transaction(async (transaction) => {
      if (privacyNoticeAcceptance && !userPrivacyState?.privacyNoticeAcceptedAt) {
        await transaction.user.update({
          where: { id: authUser.id },
          data: {
            privacyNoticeAcceptedAt: privacyNoticeAcceptance.acceptedAt,
            privacyNoticeVersion: privacyNoticeAcceptance.version,
          },
        });
      }

      const createdCitizen = await transaction.citizen.create({
        data: {
          name: createNameData.name,
          firstName: createNameData.firstName,
          middleName: createNameData.middleName,
          lastName: createNameData.lastName,
          suffix: createNameData.suffix,
          ...locationData.data,
          preferredChannel,
          contactInfo: authUser.email,
          privacyNoticeAcceptedAt: privacyNoticeAcceptance?.acceptedAt ?? null,
          privacyNoticeVersion: privacyNoticeAcceptance?.version ?? null,
        },
        include: mobileCitizenProfileInclude,
      });

      await assignCitizenToUser(authUser.id, createdCitizen.id, transaction);

      return createdCitizen;
    });

    res.status(201).json(serializeCitizenRecord(citizen as CitizenProfileSerializedRecord));
    return;
  }

  const existingCitizen = await prisma.citizen.findFirst({
    where: withActiveRecords({ id: existingCitizenId }),
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      suffix: true,
      cityMunicipalityId: true,
    },
  });

  if (!existingCitizen) {
    res.status(404).json({ message: 'Citizen profile not found for authenticated user' });
    return;
  }

  const hasSplitNameFields = ['firstName', 'middleName', 'lastName', 'suffix'].some((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );
  const displayName = hasSplitNameFields
    ? formatCanonicalDisplayName({
        firstName: nameData.firstName ?? existingCitizen.firstName ?? undefined,
        middleName: nameData.middleName ?? existingCitizen.middleName,
        lastName: nameData.lastName ?? existingCitizen.lastName ?? undefined,
        suffix: nameData.suffix ?? existingCitizen.suffix,
      })
    : null;

  if (hasSplitNameFields && !displayName) {
    res
      .status(422)
      .json({ message: 'firstName and lastName are required for canonical name updates' });
    return;
  }

  const locationData = await resolveMobileCitizenProfileLocationData(body, {
    cityMunicipalityId: existingCitizen.cityMunicipalityId,
  });

  if (locationData.status === 'error') {
    res.status(locationData.code).json({ message: locationData.message });
    return;
  }

  const citizen = await prisma.citizen.update({
    where: { id: existingCitizenId },
    data: {
      ...nameData,
      ...(displayName ? { name: displayName } : {}),
      ...locationData.data,
      preferredChannel,
    },
    include: mobileCitizenProfileInclude,
  });

  res.json(serializeCitizenRecord(citizen as CitizenProfileSerializedRecord));
}
