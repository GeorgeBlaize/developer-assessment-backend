import httpStatus from 'http-status';
import { Attempt } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { AppError } from '@/errors/AppError';

const recomputeAttemptScore = async (attemptId: string) => {
  const submissions = await prisma.submission.findMany({ where: { attemptId } });
  const allGraded = submissions.every((s) => s.status !== 'PENDING');
  const totalScore = submissions.reduce((sum, s) => sum + (s.awardedMarks ?? 0), 0);

  if (!allGraded) {
    await prisma.attempt.update({ where: { id: attemptId }, data: { totalScore } });
    return;
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: { assessment: true },
  });
  if (!attempt) return;

  await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      totalScore,
      isPassed: totalScore >= attempt.assessment.passingScore,
      status: 'EVALUATED',
    },
  });
};

const startAttempt = async (userId: string, invitationId: string) => {
  const candidateProfile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!candidateProfile) {
    throw new AppError(httpStatus.FORBIDDEN, 'Only candidate accounts can start an attempt');
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { assessment: true, attempt: true },
  });

  if (!invitation || invitation.deletedAt || invitation.candidateId !== candidateProfile.id) {
    throw new AppError(httpStatus.NOT_FOUND, 'Invitation not found');
  }
  if (invitation.status !== 'ACCEPTED') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Accept the invitation before starting the assessment');
  }
  if (invitation.attempt) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You have already started this assessment');
  }
  if (invitation.assessment.status !== 'PUBLISHED') {
    throw new AppError(httpStatus.BAD_REQUEST, 'This assessment is not currently available');
  }

  const now = new Date();
  if (invitation.assessment.startWindow && now < invitation.assessment.startWindow) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This assessment has not opened yet');
  }
  if (invitation.assessment.endWindow && now > invitation.assessment.endWindow) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This assessment window has closed');
  }

  const expiresAt = new Date(now.getTime() + invitation.assessment.durationMinutes * 60 * 1000);

  return prisma.attempt.create({
    data: {
      invitationId,
      candidateId: candidateProfile.id,
      assessmentId: invitation.assessmentId,
      status: 'IN_PROGRESS',
      startedAt: now,
      expiresAt,
    },
  });
};

const ensureActiveAttempt = async (attempt: Attempt) => {
  if (attempt.status !== 'IN_PROGRESS') {
    throw new AppError(httpStatus.BAD_REQUEST, `This attempt is already ${attempt.status.toLowerCase()}`);
  }
  if (attempt.expiresAt && attempt.expiresAt < new Date()) {
    await prisma.attempt.update({
      where: { id: attempt.id },
      data: { status: 'EXPIRED', submittedAt: new Date() },
    });
    await recomputeAttemptScore(attempt.id);
    throw new AppError(httpStatus.BAD_REQUEST, 'Time is up. This attempt has expired.');
  }
};

const getAttemptForCandidate = async (userId: string, attemptId: string) => {
  const candidateProfile = await prisma.candidateProfile.findUnique({ where: { userId } });
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      assessment: { include: { problems: { orderBy: { order: 'asc' }, include: { options: true } } } },
      submissions: true,
    },
  });

  if (!attempt || attempt.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, 'Attempt not found');
  }
  if (!candidateProfile || attempt.candidateId !== candidateProfile.id) {
    throw new AppError(httpStatus.FORBIDDEN, 'You do not own this attempt');
  }

  // Never leak correct-answer flags or grading rubric to the candidate.
  const sanitizedProblems = attempt.assessment.problems.map((p) => ({
    ...p,
    correctAnswerText: undefined,
    options: p.options.map((o) => ({ id: o.id, text: o.text, order: o.order })),
  }));

  return { ...attempt, assessment: { ...attempt.assessment, problems: sanitizedProblems } };
};

const submitAnswer = async (
  userId: string,
  attemptId: string,
  input: { problemId: string; answerText?: string; selectedOptionId?: string },
) => {
  const candidateProfile = await prisma.candidateProfile.findUnique({ where: { userId } });
  const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } });

  if (!attempt || attempt.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, 'Attempt not found');
  }
  if (!candidateProfile || attempt.candidateId !== candidateProfile.id) {
    throw new AppError(httpStatus.FORBIDDEN, 'You do not own this attempt');
  }
  await ensureActiveAttempt(attempt);

  const problem = await prisma.problem.findFirst({
    where: { id: input.problemId, assessmentId: attempt.assessmentId },
    include: { options: true },
  });
  if (!problem) {
    throw new AppError(httpStatus.NOT_FOUND, 'Problem does not belong to this assessment');
  }

  let isCorrect: boolean | undefined;
  let awardedMarks: number | undefined;
  let status: 'PENDING' | 'AUTO_GRADED' = 'PENDING';

  if (problem.type === 'MCQ') {
    if (!input.selectedOptionId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'selectedOptionId is required for MCQ problems');
    }
    const option = problem.options.find((o) => o.id === input.selectedOptionId);
    if (!option) {
      throw new AppError(httpStatus.BAD_REQUEST, 'selectedOptionId does not belong to this problem');
    }
    isCorrect = option.isCorrect;
    awardedMarks = option.isCorrect ? problem.marks : 0;
    status = 'AUTO_GRADED';
  }

  const submission = await prisma.submission.upsert({
    where: { attemptId_problemId: { attemptId, problemId: input.problemId } },
    create: {
      attemptId,
      problemId: input.problemId,
      answerText: input.answerText,
      selectedOptionId: input.selectedOptionId,
      isCorrect,
      awardedMarks,
      status,
    },
    update: {
      answerText: input.answerText,
      selectedOptionId: input.selectedOptionId,
      isCorrect,
      awardedMarks,
      status,
    },
  });

  await recomputeAttemptScore(attemptId);

  return submission;
};

const finishAttempt = async (userId: string, attemptId: string) => {
  const candidateProfile = await prisma.candidateProfile.findUnique({ where: { userId } });
  const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } });

  if (!attempt || attempt.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, 'Attempt not found');
  }
  if (!candidateProfile || attempt.candidateId !== candidateProfile.id) {
    throw new AppError(httpStatus.FORBIDDEN, 'You do not own this attempt');
  }
  await ensureActiveAttempt(attempt);

  await prisma.attempt.update({
    where: { id: attemptId },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  });

  await recomputeAttemptScore(attemptId);

  return prisma.attempt.findUnique({ where: { id: attemptId } });
};

const listMyAttempts = async (userId: string) => {
  const candidateProfile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!candidateProfile) {
    throw new AppError(httpStatus.FORBIDDEN, 'Only candidate accounts have attempts');
  }
  return prisma.attempt.findMany({
    where: { candidateId: candidateProfile.id, deletedAt: null },
    include: { assessment: { select: { id: true, title: true, totalMarks: true, passingScore: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

export const AttemptService = {
  startAttempt,
  getAttemptForCandidate,
  submitAnswer,
  finishAttempt,
  listMyAttempts,
  recomputeAttemptScore,
};
