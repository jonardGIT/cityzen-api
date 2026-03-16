import type { ErrorRequestHandler } from 'express';

interface HttpError extends Error {
  statusCode?: number;
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const statusCode = (err as HttpError).statusCode ?? 500;
  const message = statusCode >= 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    message,
  });
};
