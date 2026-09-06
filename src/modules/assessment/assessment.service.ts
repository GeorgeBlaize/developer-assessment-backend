import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { AppError } from '../../errors/AppError';
import { parsePagination, buildMeta, PaginationQuery } from '../../utils/queryBuilder';

const getOwnedCompanyProfile = async (userId: string) => {
  const companyProfile = await prisma.companyProfile.findUnique({
    where: { userId },
    include: { plan: true },
  });
  if (!companyProfile) {
    throw new AppError(httpStatus.FORBIDDEN, 'Only company accounts can manage assessments');
  }
  return companyProfile;
};

interface CreateAssessmentInput {
  title: string;
  description: string;
  durationMinutes: number;
  passingScore?: number;
  startWindow?: Date;
  endWindow?: Date;
}

const createAssessment = async (userId: string, input: CreateAssessmentInput) => {
  const companyProfile = await getOwnedCompanyProfile(userId);

  return prisma.assessment.create({
    data: {
      companyId: companyProfile.id,
      title: input.title,
      description: input.description,
      durationMinutes: input.durationMinutes,
      passingScore: input.passingScore ?? 0,
      startWindow: input.startWindow,
      endWindow: input.endWindow,
    },
  });
};

interface ListAssessmentsQuery extends PaginationQuery {
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

const listMyAssessments = async (userId: string, query: ListAssessmentsQuery) => {
  const companyProfile = await getOwnedCompanyProfile(userId);
  const { skip, take, page, limit, orderBy } = parsePagination(query);

  const where: Prisma.AssessmentWhereInput = {
    companyId: companyProfile.id,
    deletedAt: null,
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? { title: { contains: query.search, mode: 'insensitive' } }
      : {}),
  };

  const [assessments, total] = await Promise.all([
    prisma.assessment.findMany({
      where,
      skip,
      take,
      orderBy,
      include: { _count: { select: { problems: true, invitations: true } } },
    }),
    prisma.assessment.count({ where }),
  ]);

  return { assessments, meta: buildMeta(page, limit, total) };
};

const getAssessmentForCompany = async (userId: string, role: string, assessmentId: string) => {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      problems: { orderBy: { order: 'asc' }, include: { options: true } },
      company: true,
      _count: { select: { invitations: true, attempts: true } },
    },
  });

  if (!assessment || assessment.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, 'Assessment not found');
  }

  if (role === 'COMPANY' && assessment.company.userId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You do not own this assessment');
  }

  return assessment;
};

const updateAssessment = async (
  userId: string,
  assessmentId: string,
  data: Prisma.AssessmentUpdateInput,
) => {
  const assessment = await getAssessmentForCompany(userId, 'COMPANY', assessmentId);

  if (assessment.status !== 'DRAFT') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Only draft assessments can be edited. Archive and duplicate instead.',
    );
  }

  return prisma.assessment.update({ where: { id: assessmentId }, data });
};

const publishAssessment = async (userId: string, assessmentId: string) => {
  const assessment = await getAssessmentForCompany(userId, 'COMPANY', assessmentId);

  if (assessment.status === 'PUBLISHED') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Assessment is already published');
  }
  if (assessment.problems.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Cannot publish an assessment with no problems');
  }

  const companyProfile = await prisma.companyProfile.findUnique({
    where: { id: assessment.companyId },
    include: { plan: true },
  });

  const activeCount = await prisma.assessment.count({
    where: { companyId: assessment.companyId, status: 'PUBLISHED', deletedAt: null },
  });

  if (companyProfile?.plan && activeCount >= companyProfile.plan.maxActiveAssessments) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your ${companyProfile.plan.name} plan allows a maximum of ${companyProfile.plan.maxActiveAssessments} active assessments. Upgrade your plan to publish more.`,
    );
  }

  const totalMarks = assessment.problems.reduce((sum, p) => sum + p.marks, 0);

  return prisma.assessment.update({
    where: { id: assessmentId },
    data: { status: 'PUBLISHED', totalMarks },
  });
};

const archiveAssessment = async (userId: string, assessmentId: string) => {
  await getAssessmentForCompany(userId, 'COMPANY', assessmentId);
  return prisma.assessment.update({
    where: { id: assessmentId },
    data: { status: 'ARCHIVED' },
  });
};

const softDeleteAssessment = async (userId: string, assessmentId: string) => {
  const assessment = await getAssessmentForCompany(userId, 'COMPANY', assessmentId);
  if (assessment.status === 'PUBLISHED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Archive a published assessment before deleting it',
    );
  }
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { deletedAt: new Date() },
  });
};

export const AssessmentService = {
  createAssessment,
  listMyAssessments,
  getAssessmentForCompany,
  updateAssessment,
  publishAssessment,
  archiveAssessment,
  softDeleteAssessment,
};
