import { randomBytes } from 'crypto';
import httpStatus from 'http-status';
import { prisma } from '@/db/prisma';
import { AppError } from '@/errors/AppError';

const getOwnedPublishedAssessment = async (userId: string, assessmentId: string) => {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { company: { include: { plan: true } }, _count: { select: { invitations: true } } },
  });

  if (!assessment || assessment.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, 'Assessment not found');
  }
  if (assessment.company.userId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You do not own this assessment');
  }
  if (assessment.status !== 'PUBLISHED') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Only published assessments can invite candidates');
  }

  return assessment;
};

const inviteCandidates = async (
  userId: string,
  assessmentId: string,
  emails: string[],
  expiresInDays = 7,
) => {
  const assessment = await getOwnedPublishedAssessment(userId, assessmentId);

  const plan = assessment.company.plan;
  if (plan) {
    const remaining = plan.maxInvitesPerAssessment - assessment._count.invitations;
    if (emails.length > remaining) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        `Your ${plan.name} plan allows ${plan.maxInvitesPerAssessment} invitations per assessment. You can invite ${Math.max(remaining, 0)} more.`,
      );
    }
  }

  const uniqueEmails = [...new Set(emails.map((e) => e.toLowerCase()))];

  const candidateUsers = await prisma.user.findMany({
    where: { email: { in: uniqueEmails }, role: 'CANDIDATE', deletedAt: null },
    include: { candidateProfile: true },
  });

  const foundEmails = new Set(candidateUsers.map((u) => u.email));
  const notFound = uniqueEmails.filter((e) => !foundEmails.has(e));

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const results = [];
  for (const user of candidateUsers) {
    if (!user.candidateProfile) continue;
    const existing = await prisma.invitation.findUnique({
      where: {
        assessmentId_candidateId: {
          assessmentId,
          candidateId: user.candidateProfile.id,
        },
      },
    });
    if (existing) {
      results.push(existing);
      continue;
    }
    const invitation = await prisma.invitation.create({
      data: {
        assessmentId,
        candidateId: user.candidateProfile.id,
        email: user.email,
        token: randomBytes(24).toString('hex'),
        expiresAt,
      },
    });
    results.push(invitation);
  }

  return { invited: results, notFound };
};

const listInvitationsForAssessment = async (userId: string, assessmentId: string) => {
  await getOwnedPublishedAssessmentOrAny(userId, assessmentId);
  return prisma.invitation.findMany({
    where: { assessmentId, deletedAt: null },
    include: { candidate: { include: { user: { select: { name: true, email: true } } } }, attempt: true },
    orderBy: { invitedAt: 'desc' },
  });
};

// Allows viewing invitations regardless of assessment status (unlike inviting, which requires PUBLISHED).
const getOwnedPublishedAssessmentOrAny = async (userId: string, assessmentId: string) => {
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
  return assessment;
};

const listMyInvitations = async (userId: string) => {
  const candidateProfile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!candidateProfile) {
    throw new AppError(httpStatus.FORBIDDEN, 'Only candidate accounts have invitations');
  }

  return prisma.invitation.findMany({
    where: { candidateId: candidateProfile.id, deletedAt: null },
    include: {
      assessment: { select: { id: true, title: true, durationMinutes: true, totalMarks: true, status: true } },
      attempt: true,
    },
    orderBy: { invitedAt: 'desc' },
  });
};

const respondToInvitation = async (
  userId: string,
  invitationId: string,
  action: 'ACCEPT' | 'DECLINE',
) => {
  const candidateProfile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!candidateProfile) {
    throw new AppError(httpStatus.FORBIDDEN, 'Only candidate accounts can respond to invitations');
  }

  const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
  if (!invitation || invitation.deletedAt || invitation.candidateId !== candidateProfile.id) {
    throw new AppError(httpStatus.NOT_FOUND, 'Invitation not found');
  }
  if (invitation.status !== 'PENDING') {
    throw new AppError(httpStatus.BAD_REQUEST, `Invitation has already been ${invitation.status.toLowerCase()}`);
  }
  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({ where: { id: invitationId }, data: { status: 'EXPIRED' } });
    throw new AppError(httpStatus.BAD_REQUEST, 'This invitation has expired');
  }

  return prisma.invitation.update({
    where: { id: invitationId },
    data: { status: action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED' },
  });
};

export const InvitationService = {
  inviteCandidates,
  listInvitationsForAssessment,
  listMyInvitations,
  respondToInvitation,
};
