import type { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { createCrudController } from '../engine/crudControllerFactory.js';
import type { ContentTypeConfig } from '../engine/types.js';
import prisma from '../lib/prisma.js';
import { withActiveRecords } from '../utils/archive.js';
import { mobileAppContentListQueryConfig } from '../utils/listQueryConfig.js';
import {
  createMobileAppContentValidator,
  updateMobileAppContentValidator,
} from '../validators/bodyValidators.js';

const config: ContentTypeConfig = {
  modelName: 'mobileAppContent',
  displayName: 'Mobile app content',
  listQueryConfig: mobileAppContentListQueryConfig,
  fields: [
    { name: 'slug', requiredOnCreate: true, trim: true, maxLength: 120 },
    { name: 'title', requiredOnCreate: true, trim: true, maxLength: 200 },
    { name: 'summary', nullable: true },
    { name: 'body', requiredOnCreate: true },
    { name: 'contentType', trim: true, maxLength: 80 },
    { name: 'placement', trim: true, maxLength: 80 },
    { name: 'audience', nullable: true },
    { name: 'imageUrl', nullable: true },
    { name: 'ctaLabel', nullable: true },
    { name: 'ctaUrl', nullable: true },
    { name: 'sortOrder' },
    { name: 'isPublished' },
    { name: 'publishedAt', nullable: true },
    { name: 'startsAt', nullable: true },
    { name: 'endsAt', nullable: true },
    { name: 'metadata', nullable: true },
  ],
};

const handlers = createCrudController(config);

function getSingleQueryValue(value: unknown, field: string, res: Response): string | null {
  if (value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    res.status(400).json({ message: `${field} must be a string` });
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function buildPublishedMobileContentWhere(
  placement: string | null,
): Prisma.MobileAppContentWhereInput {
  const now = new Date();

  return {
    ...withActiveRecords(),
    isPublished: true,
    audience: null,
    ...(placement ? { placement } : {}),
    AND: [
      {
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      },
      {
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      {
        OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
      },
    ],
  };
}

export const mobileAppContentValidators = {
  create: createMobileAppContentValidator,
  update: updateMobileAppContentValidator,
};

export const getMobileAppContents = handlers.getAll;
export const getMobileAppContentById = handlers.getById;
export const createMobileAppContent = handlers.create;
export const updateMobileAppContent = handlers.update;
export const deleteMobileAppContent = handlers.remove;
export const restoreMobileAppContent = handlers.restore;

export async function getPublishedMobileAppContent(req: Request, res: Response): Promise<void> {
  const placement = getSingleQueryValue(req.query.placement, 'placement', res);
  if (res.headersSent) {
    return;
  }

  const records = await prisma.mobileAppContent.findMany({
    where: buildPublishedMobileContentWhere(placement),
    orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      body: true,
      contentType: true,
      placement: true,
      audience: true,
      imageUrl: true,
      ctaLabel: true,
      ctaUrl: true,
      sortOrder: true,
      publishedAt: true,
      startsAt: true,
      endsAt: true,
      metadata: true,
      updatedAt: true,
    },
  });

  res.json(records);
}
