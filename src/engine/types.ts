import type { Request, Response } from 'express';
import type { ListQueryConfig } from '../utils/request.js';

export interface FieldConfig {
  name: string;
  requiredOnCreate?: boolean;
  requiredOnUpdate?: boolean;
  nullable?: boolean;
  trim?: boolean;
  maxLength?: number;
}

export interface ForeignKeyValidation {
  field: string;
  targetModel: string;
  message: string;
}

export interface DeleteGuard {
  model: string;
  foreignKey: string;
  message: string;
}

export interface RestoreGuard {
  foreignKeyOnRecord: string;
  targetModel: string;
  message: string;
}

export interface PrismaInclude {
  [key: string]: true | Record<string, unknown>;
}

export interface AllowedIncludeConfig {
  fragment?: Record<string, unknown>;
  children?: AllowedIncludes;
}

export interface AllowedIncludes {
  [key: string]: true | AllowedIncludeConfig;
}

export interface CrudHookResult {
  data?: Record<string, unknown>;
}

export interface CrudControllerHooks {
  buildScopeWhere?: (req: Request, res: Response) => Promise<Record<string, unknown> | null>;
  beforeCreate?: (
    req: Request,
    res: Response,
    body: Record<string, unknown>,
  ) => Promise<CrudHookResult | null>;
  beforeUpdate?: (
    req: Request,
    res: Response,
    body: Record<string, unknown>,
    existing: Record<string, unknown>,
  ) => Promise<CrudHookResult | null>;
}

export interface ContentTypeConfig {
  modelName: string;
  displayName: string;
  listQueryConfig: ListQueryConfig;
  fields: FieldConfig[];
  include?: PrismaInclude;
  allowedIncludes?: AllowedIncludes;
  foreignKeys?: ForeignKeyValidation[];
  deleteGuards?: DeleteGuard[];
  restoreGuards?: RestoreGuard[];
  hooks?: CrudControllerHooks;
}

export interface CrudHandlers {
  getAll: (req: Request, res: Response) => Promise<void>;
  getById: (req: Request, res: Response) => Promise<void>;
  create: (req: Request, res: Response) => Promise<void>;
  update: (req: Request, res: Response) => Promise<void>;
  remove: (req: Request, res: Response) => Promise<void>;
  restore: (req: Request, res: Response) => Promise<void>;
}
