import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '@/utils/catchAsync';
import { sendResponse } from '@/utils/sendResponse';
import { recordAuditLog } from '@/utils/auditLog';
import { SubmissionService } from './submission.service';

const listSubmissionsForAssessment = catchAsync(async (req: Request, res: Response) => {
  const result = await SubmissionService.listSubmissionsForAssessment(
    req.user!.userId,
    req.user!.role,
    req.params.assessmentId,
    req.query.status as string | undefined,
  );
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Submissions fetched successfully', data: result });
});

const gradeSubmission = catchAsync(async (req: Request, res: Response) => {
  const result = await SubmissionService.gradeSubmission(
    req.user!.userId,
    req.params.submissionId,
    req.body.awardedMarks,
    req.body.feedback,
  );
  await recordAuditLog({
    actorId: req.user!.userId,
    action: 'GRADE_SUBMISSION',
    entityType: 'Submission',
    entityId: req.params.submissionId,
    metadata: { awardedMarks: req.body.awardedMarks },
    ipAddress: req.ip,
  });
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Submission graded successfully', data: result });
});

export const SubmissionController = { listSubmissionsForAssessment, gradeSubmission };
