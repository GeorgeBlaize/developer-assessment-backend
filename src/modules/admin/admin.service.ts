import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { parsePagination, buildMeta, PaginationQuery } from '../../utils/queryBuilder';

interface ListAuditLogsQuery extends PaginationQuery {
  entityType?: string;
  action?: string;
}

const listAuditLogs = async (query: ListAuditLogsQuery) => {
  const { skip, take, page, limit, orderBy } = parsePagination(query, 'createdAt');

  const where: Prisma.AuditLogWhereInput = {
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.action ? { action: query.action } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy,
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, meta: buildMeta(page, limit, total) };
};

const getPlatformStats = async () => {
  const [totalUsers, totalCompanies, totalCandidates, totalAssessments, publishedAssessments, totalPayments, revenue] =
    await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { role: 'COMPANY', deletedAt: null } }),
      prisma.user.count({ where: { role: 'CANDIDATE', deletedAt: null } }),
      prisma.assessment.count({ where: { deletedAt: null } }),
      prisma.assessment.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
      prisma.payment.count({ where: { status: 'PAID' } }),
      prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    ]);

  return {
    totalUsers,
    totalCompanies,
    totalCandidates,
    totalAssessments,
    publishedAssessments,
    totalPayments,
    totalRevenue: revenue._sum.amount ?? 0,
  };
};

export const AdminService = { listAuditLogs, getPlatformStats };
