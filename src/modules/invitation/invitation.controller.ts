import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { recordAuditLog } from '../../utils/auditLog';
import { InvitationService } from './invitation.service';

const inviteCandidates = catchAsync(async (req: Request, res: Response) => {
  const result = await InvitationService.inviteCandidates(
    req.user!.userId,
    req.params.assessmentId,
    req.body.emails,
    req.body.expiresInDays,
  );
  await recordAuditLog({
    actorId: req.user!.userId,
    action: 'INVITE_CANDIDATES',
    entityType: 'Assessment',
    entityId: req.params.assessmentId,
    metadata: { emails: req.body.emails },
    ipAddress: req.ip,
  });
  sendResponse(res, { statusCode: httpStatus.CREATED, message: 'Invitations processed successfully', data: result });
});

const listInvitationsForAssessment = catchAsync(async (req: Request, res: Response) => {
  const result = await InvitationService.listInvitationsForAssessment(req.user!.userId, req.params.assessmentId);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Invitations fetched successfully', data: result });
});

const listMyInvitations = catchAsync(async (req: Request, res: Response) => {
  const result = await InvitationService.listMyInvitations(req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Your invitations fetched successfully', data: result });
});

const respondToInvitation = catchAsync(async (req: Request, res: Response) => {
  const result = await InvitationService.respondToInvitation(req.user!.userId, req.params.id, req.body.action);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Invitation response recorded successfully', data: result });
});

export const InvitationController = {
  inviteCandidates,
  listInvitationsForAssessment,
  listMyInvitations,
  respondToInvitation,
};
