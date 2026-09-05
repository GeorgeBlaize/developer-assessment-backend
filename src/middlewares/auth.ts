import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { Role } from '@prisma/client';
import { config } from '@/config';
import { AppError } from '@/errors/AppError';
import { catchAsync } from '@/utils/catchAsync';
import { verifyToken } from '@/utils/jwt';
import { prisma } from '@/db/prisma';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: Role;
        email: string;
      };
    }
  }
}

export const authenticate = (...allowedRoles: Role[]) =>
  catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized. No token provided.');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = verifyToken(token, config.jwt.accessSecret);
    } catch {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired token.');
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user || user.deletedAt) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'This user no longer exists.');
    }

    if (!user.isActive) {
      throw new AppError(httpStatus.FORBIDDEN, 'This account has been deactivated.');
    }

    if (allowedRoles.length && !allowedRoles.includes(user.role)) {
      throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission to perform this action.');
    }

    req.user = { userId: user.id, role: user.role, email: user.email };
    next();
  });
