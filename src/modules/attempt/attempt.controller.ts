import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { recordAuditLog } from '../../utils/auditLog';
import { AttemptService } from './attempt.service';

const startAttempt = catchAsync(async (req: Request, res: Response) => {
  const result = await AttemptService.startAttempt(req.user!.userId, req.params.id);
  await recordAuditLog({
    actorId: req.user!.userId,
    action: 'START_ATTEMPT',
    entityType: 'Attempt',
    entityId: result.id,
    ipAddress: req.ip,
  });
  sendResponse(res, { statusCode: httpStatus.CREATED, message: 'Assessment attempt started. Good luck!', data: result });
});

const getAttempt = catchAsync(async (req: Request, res: Response) => {
  const result = await AttemptService.getAttemptForCandidate(req.user!.userId, req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Attempt fetched successfully', data: result });
});

const submitAnswer = catchAsync(async (req: Request, res: Response) => {
  const result = await AttemptService.submitAnswer(req.user!.userId, req.params.id, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Answer submitted successfully', data: result });
});

const finishAttempt = catchAsync(async (req: Request, res: Response) => {
  const result = await AttemptService.finishAttempt(req.user!.userId, req.params.id);
  await recordAuditLog({
    actorId: req.user!.userId,
    action: 'FINISH_ATTEMPT',
    entityType: 'Attempt',
    entityId: req.params.id,
    ipAddress: req.ip,
  });
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Assessment submitted successfully', data: result });
});

const listMyAttempts = catchAsync(async (req: Request, res: Response) => {
  const result = await AttemptService.listMyAttempts(req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Attempts fetched successfully', data: result });
});

const listAttemptsForAssessment = catchAsync(async (req: Request, res: Response) => {
  const result = await AttemptService.listAttemptsForAssessment(req.user!.userId, req.user!.role, req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Assessment results fetched successfully', data: result });
});

export const AttemptController = {
  startAttempt,
  getAttempt,
  submitAnswer,
  finishAttempt,
  listMyAttempts,
  listAttemptsForAssessment,
};
