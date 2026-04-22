import { Router, type RequestHandler } from 'express';
import { param } from 'express-validator';
import type { UserRole } from '../types/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isArchiveEnabled } from '../utils/archive.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { requireJwtAuth, requireRole } from '../middleware/jwtAuth.js';
import { isPostgresUuid } from '../validators/bodyValidators.js';
import type { CrudHandlers } from './types.js';

export interface RouteConfig {
  handlers: CrudHandlers;
  readRoles?: UserRole[];
  writeRoles: UserRole[];
  createValidator: RequestHandler[];
  updateValidator: RequestHandler[];
}

export function createCrudRouter(config: RouteConfig): Router {
  const router = Router();
  const { handlers } = config;
  const idValidator: RequestHandler[] = [
    param('id')
      .custom((value) => isPostgresUuid(value))
      .withMessage('id must be a valid UUID'),
    validateRequest,
  ];

  const readMiddleware: RequestHandler[] = config.readRoles
    ? [requireJwtAuth, requireRole(...config.readRoles)]
    : [requireJwtAuth];

  const writeMiddleware: RequestHandler[] = [requireJwtAuth, requireRole(...config.writeRoles)];

  router.get('/', ...readMiddleware, asyncHandler(handlers.getAll));
  router.get('/:id', ...readMiddleware, ...idValidator, asyncHandler(handlers.getById));
  router.post(
    '/',
    ...writeMiddleware,
    ...config.createValidator,
    validateRequest,
    asyncHandler(handlers.create),
  );
  router.patch(
    '/:id',
    ...writeMiddleware,
    ...idValidator,
    ...config.updateValidator,
    validateRequest,
    asyncHandler(handlers.update),
  );
  router.delete('/:id', ...writeMiddleware, ...idValidator, asyncHandler(handlers.remove));

  if (isArchiveEnabled()) {
    router.post('/:id/restore', ...writeMiddleware, ...idValidator, asyncHandler(handlers.restore));
  }

  return router;
}
