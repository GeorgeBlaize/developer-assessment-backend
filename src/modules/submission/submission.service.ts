import httpStatus from 'http-status';
import { prisma } from '../../db/prisma';
import { AppError } from '../../errors/AppError';
import { AttemptService } from '../attempt/attempt.service';

const assertOwnedAssessment = async (userId: string, role: string, assessmentId: string) => {
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
  return assessment;
};

const listSubmissionsForAssessment = async (
  userId: string,
  role: string,
  assessmentId: string,
  status?: string,
) => {
  await assertOwnedAssessment(userId, role, assessmentId);

  return prisma.submission.findMany({
    where: {
      deletedAt: null,
      status: status as never,
      problem: { assessmentId },
    },
    include: {
      problem: { select: { id: true, title: true, type: true, marks: true, correctAnswerText: true } },
      attempt: {
        include: { candidate: { include: { user: { select: { name: true, email: true } } } } },
      },
      selectedOption: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

const gradeSubmission = async (
  userId: string,
  submissionId: string,
  awardedMarks: number,
  feedback?: string,
) => {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { problem: { include: { assessment: { include: { company: true } } } } },
  });

  if (!submission || submission.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, 'Submission not found');
  }
  if (submission.problem.assessment.company.userId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You do not own this assessment');
  }
  if (submission.problem.type === 'MCQ') {
    throw new AppError(httpStatus.BAD_REQUEST, 'MCQ submissions are graded automatically');
  }
  if (awardedMarks > submission.problem.marks) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `awardedMarks cannot exceed the problem's total marks (${submission.problem.marks})`,
    );
  }

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      awardedMarks,
      feedback,
      status: 'MANUALLY_GRADED',
      gradedById: userId,
      gradedAt: new Date(),
    },
  });

  await AttemptService.recomputeAttemptScore(submission.attemptId);

  return updated;
};

export const SubmissionService = { listSubmissionsForAssessment, gradeSubmission };
