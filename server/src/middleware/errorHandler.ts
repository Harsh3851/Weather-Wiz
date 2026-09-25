import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import type { ApiErrorBody } from '@weatherwiz/shared';
import { AppError, notFound } from '../lib/errors';
import { formatZodError } from '../lib/validate';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(notFound(`Route ${req.method} ${req.path} not found`));
};

export function createErrorHandler(opts: { exposeInternal: boolean }): ErrorRequestHandler {
  return (err, req, res, _next) => {
    let status = 500;
    let body: ApiErrorBody['error'] = {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
    };

    if (err instanceof AppError) {
      status = err.status;
      body = { code: err.code, message: err.message, details: err.details };
    } else if (err instanceof ZodError) {
      status = 400;
      body = { code: 'VALIDATION_ERROR', message: 'Invalid request', details: formatZodError(err) };
    } else if (err instanceof mongoose.Error.ValidationError) {
      status = 400;
      body = { code: 'VALIDATION_ERROR', message: err.message };
    } else if (
      typeof err === 'object' &&
      err !== null &&
      'type' in err &&
      (err as { type?: string }).type === 'entity.parse.failed'
    ) {
      status = 400;
      body = { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON' };
    } else if (
      typeof err === 'object' &&
      err !== null &&
      'type' in err &&
      (err as { type?: string }).type === 'entity.too.large'
    ) {
      status = 413;
      body = { code: 'VALIDATION_ERROR', message: 'Request body is too large' };
    } else if (opts.exposeInternal && err instanceof Error) {
      body.message = err.message;
    }

    if (status >= 500) req.log?.error({ err }, 'request failed');
    else req.log?.debug({ code: body.code }, 'request rejected');

    if (body.details === undefined) delete body.details;
    res.status(status).json({ error: { ...body, requestId: String(req.id ?? '') } });
  };
}
