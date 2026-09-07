import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import { AppError } from '../errors/AppError';
import { handleZodError } from '../errors/handleZodError';
import { handlePrismaError } from '../errors/handlePrismaError';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let message = 'Something went wrong';
  let errors: unknown[] = [];

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof ZodError) {
    const formatted = handleZodError(err);
    statusCode = formatted.statusCode;
    message = formatted.message;
    errors = formatted.errors;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const formatted = handlePrismaError(err);
    statusCode = formatted.statusCode;
    message = formatted.message;
    errors = formatted.errors;
  } else if (err instanceof Error) {
    message = err.message || message;
    errors = [{ path: '', message: err.message }];
  }

  // Stack traces go to server-side logs only -- never to the client, in any environment.
  // eslint-disable-next-line no-console
  console.error(err);

  res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};
