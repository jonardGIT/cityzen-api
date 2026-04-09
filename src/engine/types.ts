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

export interface ContentTypeConfig {
  modelName: string;
  displayName: string;
  listQueryConfig: ListQueryConfig;
  fields: FieldConfig[];
  include?: Record<string, boolean>;
  foreignKeys?: ForeignKeyValidation[];
  deleteGuards?: DeleteGuard[];
  restoreGuards?: RestoreGuard[];
}

export interface CrudHandlers {
  getAll: (req: Request, res: Response) => Promise<void>;
  getById: (req: Request, res: Response) => Promise<void>;
  create: (req: Request, res: Response) => Promise<void>;
  update: (req: Request, res: Response) => Promise<void>;
  remove: (req: Request, res: Response) => Promise<void>;
  restore: (req: Request, res: Response) => Promise<void>;
}
