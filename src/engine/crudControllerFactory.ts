import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import {
  buildPaginatedResponse,
  getListQuery,
  getPaginationQuery,
  getParamId,
} from '../utils/request.js';
import {
  isArchiveEnabled,
  withActiveRecords,
  withArchivedRecords,
  withArchiveScope,
} from '../utils/archive.js';
import type {
  AllowedIncludeConfig,
  AllowedIncludes,
  ContentTypeConfig,
  CrudHandlers,
  FieldConfig,
  PrismaInclude,
} from './types.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getModel(modelName: string) {
  return (prisma as Record<string, any>)[modelName];
}

function getValidatedParamId(req: Request, res: Response, displayName: string): string | null {
  const id = getParamId(req, res);
  if (id === null) return null;

  if (!UUID_REGEX.test(id)) {
    res.status(400).json({ message: `Invalid ${displayName.toLowerCase()} id` });
    return null;
  }

  return id;
}

function extractFieldData(
  body: Record<string, unknown>,
  fields: FieldConfig[],
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const field of fields) {
    const raw = body[field.name];
    if (raw === undefined) continue;

    let value: unknown = raw;
    if (field.trim && typeof value === 'string') {
      value = value.trim();
    }

    if (field.nullable) {
      data[field.name] = value || null;
    } else {
      data[field.name] = value;
    }
  }

  return data;
}

function listAllowedIncludes(whitelist: AllowedIncludes): string {
  return Object.keys(whitelist).sort().join(', ');
}

function isAllowedIncludeConfig(value: true | AllowedIncludeConfig): value is AllowedIncludeConfig {
  return value !== true;
}

function createIncludeEntry(config: true | AllowedIncludeConfig): true | Record<string, unknown> {
  if (!isAllowedIncludeConfig(config)) {
    return true;
  }

  return config.fragment ? { ...config.fragment } : {};
}

function buildIncludeFromPaths(
  requestedPaths: string[],
  whitelist: AllowedIncludes,
): { include: PrismaInclude; invalid: string[] } {
  const include: PrismaInclude = {};
  const invalid: string[] = [];

  for (const path of requestedPaths) {
    const segments = path
      .split('.')
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (segments.length === 0) {
      continue;
    }

    let currentWhitelist: AllowedIncludes = whitelist;
    let currentInclude: PrismaInclude = include;
    let failed = false;

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const pathSoFar = segments.slice(0, index + 1).join('.');
      const allowed = currentWhitelist[segment];

      if (!allowed) {
        invalid.push(pathSoFar);
        failed = true;
        break;
      }

      const isLeaf = index === segments.length - 1;
      if (isLeaf) {
        const existing = currentInclude[segment];
        if (!existing) {
          currentInclude[segment] = createIncludeEntry(allowed);
        }
        continue;
      }

      if (!isAllowedIncludeConfig(allowed) || !allowed.children) {
        invalid.push(pathSoFar);
        failed = true;
        break;
      }

      const existing = currentInclude[segment];
      if (!existing || existing === true) {
        const entry = createIncludeEntry(allowed);
        currentInclude[segment] = entry === true ? { include: {} } : { ...entry, include: {} };
      } else if (!('include' in existing)) {
        currentInclude[segment] = { ...existing, include: {} };
      }

      const nestedEntry = currentInclude[segment] as Record<string, unknown>;
      if (!nestedEntry.include || typeof nestedEntry.include !== 'object') {
        nestedEntry.include = {};
      }

      currentInclude = nestedEntry.include as PrismaInclude;
      currentWhitelist = allowed.children;
    }

    if (failed) {
      continue;
    }
  }

  return { include, invalid };
}

export function createCrudController(config: ContentTypeConfig): CrudHandlers {
  const model = getModel(config.modelName);
  const defaultInclude = config.include ? { include: config.include } : {};

  function resolveInclude(req: Request, res: Response): { include?: PrismaInclude } | null {
    const param = req.query.include;

    if (!param || typeof param !== 'string') {
      return defaultInclude;
    }

    if (!config.allowedIncludes) {
      return defaultInclude;
    }

    const requested = param
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (requested.length === 0) {
      return defaultInclude;
    }

    const { include, invalid } = buildIncludeFromPaths(requested, config.allowedIncludes);
    if (invalid.length > 0) {
      res.status(400).json({
        message: `Invalid include: ${invalid.join(', ')}. Allowed top-level relations: ${listAllowedIncludes(config.allowedIncludes)}`,
      });
      return null;
    }

    return { include };
  }

  async function getAll(req: Request, res: Response): Promise<void> {
    const includeOption = resolveInclude(req, res);
    if (includeOption === null) return;

    const pagination = getPaginationQuery(req);
    const listQuery = getListQuery(req, res, config.listQueryConfig);
    if (!listQuery) return;

    const scopedWhere = withArchiveScope(listQuery.where, listQuery.archiveScope);

    if (pagination.enabled) {
      const [records, total] = await Promise.all([
        model.findMany({
          ...includeOption,
          where: scopedWhere,
          orderBy: listQuery.orderBy,
          skip: pagination.skip,
          take: pagination.take,
        }),
        model.count({ where: scopedWhere }),
      ]);
      res.json(buildPaginatedResponse(records, total, pagination));
      return;
    }

    const records = await model.findMany({
      ...includeOption,
      where: scopedWhere,
      orderBy: listQuery.orderBy,
    });
    res.json(records);
  }

  async function getById(req: Request, res: Response): Promise<void> {
    const includeOption = resolveInclude(req, res);
    if (includeOption === null) return;

    const id = getValidatedParamId(req, res, config.displayName);
    if (id === null) return;

    const record = await model.findFirst({
      where: withActiveRecords({ id }),
      ...includeOption,
    });

    if (!record) {
      res.status(404).json({ message: `${config.displayName} not found` });
      return;
    }

    res.json(record);
  }

  async function create(req: Request, res: Response): Promise<void> {
    const body = req.body as Record<string, unknown>;

    const missingRequired = config.fields
      .filter((f) => f.requiredOnCreate)
      .filter((f) => !body[f.name])
      .map((f) => f.name);

    if (missingRequired.length > 0) {
      res.status(422).json({
        message: `${missingRequired.join(', ')} ${missingRequired.length === 1 ? 'is' : 'are'} required`,
      });
      return;
    }

    if (config.foreignKeys) {
      for (const fk of config.foreignKeys) {
        const fkValue = body[fk.field];
        if (fkValue === undefined) continue;

        if (typeof fkValue !== 'string' || !UUID_REGEX.test(fkValue)) {
          res.status(400).json({ message: `${fk.field} must be a valid UUID` });
          return;
        }

        const target = await getModel(fk.targetModel).findFirst({
          where: withActiveRecords({ id: fkValue }),
        });
        if (!target) {
          res.status(422).json({ message: fk.message });
          return;
        }
      }
    }

    const data = extractFieldData(body, config.fields);
    const record = await model.create({
      data,
      ...defaultInclude,
    });
    res.status(201).json(record);
  }

  async function update(req: Request, res: Response): Promise<void> {
    const id = getValidatedParamId(req, res, config.displayName);
    if (id === null) return;

    const body = req.body as Record<string, unknown>;

    const existing = await model.findFirst({
      where: withActiveRecords({ id }),
    });

    if (!existing) {
      res.status(404).json({ message: `${config.displayName} not found` });
      return;
    }

    if (config.foreignKeys) {
      for (const fk of config.foreignKeys) {
        const fkValue = body[fk.field];
        if (fkValue === undefined) continue;

        const target = await getModel(fk.targetModel).findFirst({
          where: withActiveRecords({ id: fkValue }),
        });
        if (!target) {
          res.status(422).json({ message: fk.message });
          return;
        }
      }
    }

    const data = extractFieldData(body, config.fields);
    const record = await model.update({
      where: { id },
      data,
      ...defaultInclude,
    });
    res.json(record);
  }

  async function remove(req: Request, res: Response): Promise<void> {
    const id = getValidatedParamId(req, res, config.displayName);
    if (id === null) return;

    const existing = await model.findFirst({
      where: withActiveRecords({ id }),
    });

    if (!existing) {
      res.status(404).json({ message: `${config.displayName} not found` });
      return;
    }

    if (config.deleteGuards) {
      for (const guard of config.deleteGuards) {
        const count = await getModel(guard.model).count({
          where: withActiveRecords({ [guard.foreignKey]: id }),
        });
        if (count > 0) {
          res.status(409).json({ message: guard.message });
          return;
        }
      }
    }

    if (isArchiveEnabled()) {
      await model.update({ where: { id }, data: { archivedAt: new Date() } });
    } else {
      await model.delete({ where: { id } });
    }
    res.status(204).send();
  }

  async function restore(req: Request, res: Response): Promise<void> {
    const id = getValidatedParamId(req, res, config.displayName);
    if (id === null) return;

    if (!isArchiveEnabled()) {
      res.status(409).json({ message: 'Archive mode is disabled; restore is unavailable' });
      return;
    }

    const existing = await model.findFirst({
      where: withArchivedRecords({ id }),
      ...defaultInclude,
    });

    if (!existing) {
      res.status(404).json({ message: `Archived ${config.displayName.toLowerCase()} not found` });
      return;
    }

    if (config.restoreGuards) {
      for (const guard of config.restoreGuards) {
        const parentId = (existing as Record<string, unknown>)[guard.foreignKeyOnRecord];
        const parent = await getModel(guard.targetModel).findFirst({
          where: withActiveRecords({ id: parentId }),
        });
        if (!parent) {
          res.status(409).json({ message: guard.message });
          return;
        }
      }
    }

    const record = await model.update({
      where: { id },
      data: { archivedAt: null },
      ...defaultInclude,
    });
    res.json(record);
  }

  return { getAll, getById, create, update, remove, restore };
}
