import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';

interface HttpError extends Error {
  statusCode?: number;
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2021' || err.code === 'P2022') {
      const missingTarget =
        typeof err.meta?.column === 'string'
          ? err.meta.column
          : typeof err.meta?.table === 'string'
            ? err.meta.table
            : 'a required database object';

      res.status(503).json({
        message: `Database schema is out of date: ${missingTarget} is missing. Apply the pending Prisma SQL migrations before retrying this request.`,
      });
      return;
    }

    if (err.code === 'P2003') {
      res.status(409).json({
        message: 'Conflict: resource is still referenced by other records',
      });
      return;
    }

    if (err.code === 'P2002') {
      res.status(409).json({
        message: 'Conflict: resource violates a unique constraint',
      });
      return;
    }
  }

  const statusCode = (err as HttpError).statusCode ?? 500;
  const message = statusCode >= 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    message,
  });
};
