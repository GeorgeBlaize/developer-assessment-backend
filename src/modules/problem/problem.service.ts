import httpStatus from 'http-status';
import { ProblemType } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { AppError } from '../../errors/AppError';

const assertOwnedDraftAssessment = async (userId: string, assessmentId: string) => {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { company: true },
  });

  if (!assessment || assessment.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, 'Assessment not found');
  }
  if (assessment.company.userId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You do not own this assessment');
  }
  if (assessment.status !== 'DRAFT') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Problems can only be modified while the assessment is a draft');
  }

  return assessment;
};

interface McqOptionInput {
  text: string;
  isCorrect?: boolean;
}

interface CreateProblemInput {
  type: ProblemType;
  title: string;
  description: string;
  marks?: number;
  order?: number;
  languageHint?: string;
  starterCode?: string;
  testCases?: unknown;
  correctAnswerText?: string;
  options?: McqOptionInput[];
}

const createProblem = async (userId: string, assessmentId: string, input: CreateProblemInput) => {
  await assertOwnedDraftAssessment(userId, assessmentId);

  const order = input.order ?? (await prisma.problem.count({ where: { assessmentId } }));

  return prisma.problem.create({
    data: {
      assessmentId,
      type: input.type,
      title: input.title,
      description: input.description,
      marks: input.marks ?? 10,
      order,
      languageHint: input.languageHint,
      starterCode: input.starterCode,
      testCases: input.testCases as never,
      correctAnswerText: input.correctAnswerText,
      options:
        input.type === 'MCQ' && input.options
          ? {
              create: input.options.map((opt, idx) => ({
                text: opt.text,
                isCorrect: Boolean(opt.isCorrect),
                order: idx,
              })),
            }
          : undefined,
    },
    include: { options: true },
  });
};

const listProblems = async (assessmentId: string) => {
  return prisma.problem.findMany({
    where: { assessmentId, deletedAt: null },
    orderBy: { order: 'asc' },
    include: { options: true },
  });
};

const updateProblem = async (
  userId: string,
  assessmentId: string,
  problemId: string,
  input: Partial<CreateProblemInput>,
) => {
  await assertOwnedDraftAssessment(userId, assessmentId);

  const problem = await prisma.problem.findFirst({ where: { id: problemId, assessmentId } });
  if (!problem || problem.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, 'Problem not found');
  }

  return prisma.$transaction(async (tx) => {
    if (input.options) {
      await tx.mcqOption.deleteMany({ where: { problemId } });
      await tx.mcqOption.createMany({
        data: input.options.map((opt, idx) => ({
          problemId,
          text: opt.text,
          isCorrect: Boolean(opt.isCorrect),
          order: idx,
        })),
      });
    }

    return tx.problem.update({
      where: { id: problemId },
      data: {
        title: input.title,
        description: input.description,
        marks: input.marks,
        order: input.order,
        languageHint: input.languageHint,
        starterCode: input.starterCode,
        testCases: input.testCases as never,
        correctAnswerText: input.correctAnswerText,
      },
      include: { options: true },
    });
  });
};

const deleteProblem = async (userId: string, assessmentId: string, problemId: string) => {
  await assertOwnedDraftAssessment(userId, assessmentId);

  const problem = await prisma.problem.findFirst({ where: { id: problemId, assessmentId } });
  if (!problem || problem.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, 'Problem not found');
  }

  await prisma.problem.update({ where: { id: problemId }, data: { deletedAt: new Date() } });
};

export const ProblemService = { createProblem, listProblems, updateProblem, deleteProblem };
