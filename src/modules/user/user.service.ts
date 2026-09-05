import httpStatus from 'http-status';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { AppError } from '@/errors/AppError';
import { parsePagination, buildMeta, PaginationQuery } from '@/utils/queryBuilder';

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { companyProfile: { include: { plan: true } }, candidateProfile: true },
  });

  if (!user || user.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const { password: _password, ...safeUser } = user;
  return safeUser;
};

interface UpdateMeInput {
  name?: string;
  phone?: string;
  resumeUrl?: string;
  skills?: string[];
  companyName?: string;
  website?: string;
  industry?: string;
}

const updateMe = async (userId: string, role: Role, input: UpdateMeInput) => {
  return prisma.$transaction(async (tx) => {
    if (input.name) {
      await tx.user.update({ where: { id: userId }, data: { name: input.name } });
    }

    if (role === 'CANDIDATE') {
      await tx.candidateProfile.update({
        where: { userId },
        data: {
          phone: input.phone,
          resumeUrl: input.resumeUrl,
          skills: input.skills,
        },
      });
    }

    if (role === 'COMPANY') {
      await tx.companyProfile.update({
        where: { userId },
        data: {
          companyName: input.companyName,
          website: input.website,
          industry: input.industry,
        },
      });
    }

    return getMe(userId);
  });
};

interface ListUsersQuery extends PaginationQuery {
  role?: Role;
}

const listUsers = async (query: ListUsersQuery) => {
  const { skip, take, page, limit, orderBy } = parsePagination(query);

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(query.role ? { role: query.role } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, meta: buildMeta(page, limit, total) };
};

const getUserById = async (targetUserId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { companyProfile: { include: { plan: true } }, candidateProfile: true },
  });

  if (!user || user.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const { password: _password, ...safeUser } = user;
  return safeUser;
};

const updateUserStatus = async (targetUserId: string, isActive: boolean) => {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user || user.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user.role === 'ADMIN') {
    throw new AppError(httpStatus.FORBIDDEN, 'Cannot change status of an admin account');
  }

  return prisma.user.update({
    where: { id: targetUserId },
    data: { isActive },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
};

const softDeleteUser = async (targetUserId: string) => {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user || user.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user.role === 'ADMIN') {
    throw new AppError(httpStatus.FORBIDDEN, 'Cannot delete an admin account');
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: { deletedAt: new Date(), isActive: false },
  });
};

export const UserService = {
  getMe,
  updateMe,
  listUsers,
  getUserById,
  updateUserStatus,
  softDeleteUser,
};
