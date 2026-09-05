import httpStatus from 'http-status';
import { prisma } from '@/db/prisma';
import { AppError } from '@/errors/AppError';

const getAssessmentAnalytics = async (userId: string, role: string, assessmentId: string) => {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { company: true },
  });
  if (!assessment || assessment.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, 'Assessment not found');
  }
  if (role === 'COMPANY' && assessment.company.userId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You do not own this assessment');
  }

  const [invitationStats, attempts] = await Promise.all([
    prisma.invitation.groupBy({
      by: ['status'],
      where: { assessmentId },
      _count: { _all: true },
    }),
    prisma.attempt.findMany({
      where: { assessmentId, deletedAt: null },
      select: { status: true, totalScore: true, isPassed: true },
    }),
  ]);

  const evaluated = attempts.filter((a) => a.status === 'EVALUATED');
  const averageScore = evaluated.length
    ? evaluated.reduce((sum, a) => sum + (a.totalScore ?? 0), 0) / evaluated.length
    : 0;
  const passCount = evaluated.filter((a) => a.isPassed).length;

  return {
    totalMarks: assessment.totalMarks,
    passingScore: assessment.passingScore,
    invitations: invitationStats.reduce(
      (acc, row) => ({ ...acc, [row.status]: row._count._all }),
      {} as Record<string, number>,
    ),
    attempts: {
      total: attempts.length,
      evaluated: evaluated.length,
      averageScore: Math.round(averageScore * 100) / 100,
      passCount,
      passRate: evaluated.length ? Math.round((passCount / evaluated.length) * 10000) / 100 : 0,
    },
  };
};

const getCompanyDashboard = async (userId: string) => {
  const companyProfile = await prisma.companyProfile.findUnique({
    where: { userId },
    include: { plan: true },
  });
  if (!companyProfile) {
    throw new AppError(httpStatus.FORBIDDEN, 'Only company accounts have a dashboard');
  }

  const [totalAssessments, publishedAssessments, totalInvitations, totalAttempts] = await Promise.all([
    prisma.assessment.count({ where: { companyId: companyProfile.id, deletedAt: null } }),
    prisma.assessment.count({ where: { companyId: companyProfile.id, status: 'PUBLISHED', deletedAt: null } }),
    prisma.invitation.count({ where: { assessment: { companyId: companyProfile.id } } }),
    prisma.attempt.count({ where: { assessment: { companyId: companyProfile.id } } }),
  ]);

  return {
    plan: companyProfile.plan,
    subscriptionStatus: companyProfile.subscriptionStatus,
    subscriptionEndsAt: companyProfile.subscriptionEndsAt,
    totalAssessments,
    publishedAssessments,
    totalInvitations,
    totalAttempts,
  };
};

export const AnalyticsService = { getAssessmentAnalytics, getCompanyDashboard };
