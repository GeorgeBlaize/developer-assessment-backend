import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { recordAuditLog } from '../../utils/auditLog';
import { AssessmentService } from './assessment.service';

const createAssessment = catchAsync(async (req: Request, res: Response) => {
  const result = await AssessmentService.createAssessment(req.user!.userId, req.body);
  await recordAuditLog({
    actorId: req.user!.userId,
    action: 'CREATE_ASSESSMENT',
    entityType: 'Assessment',
    entityId: result.id,
    ipAddress: req.ip,
  });
  sendResponse(res, { statusCode: httpStatus.CREATED, message: 'Assessment created successfully', data: result });
});

const listMyAssessments = catchAsync(async (req: Request, res: Response) => {
  const { assessments, meta } = await AssessmentService.listMyAssessments(req.user!.userId, req.query as never);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Assessments fetched successfully', data: assessments, meta });
});

const getAssessment = catchAsync(async (req: Request, res: Response) => {
  const result = await AssessmentService.getAssessmentForCompany(req.user!.userId, req.user!.role, req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Assessment fetched successfully', data: result });
});

const updateAssessment = catchAsync(async (req: Request, res: Response) => {
  const result = await AssessmentService.updateAssessment(req.user!.userId, req.params.id, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Assessment updated successfully', data: result });
});

const publishAssessment = catchAsync(async (req: Request, res: Response) => {
  const result = await AssessmentService.publishAssessment(req.user!.userId, req.params.id);
  await recordAuditLog({
    actorId: req.user!.userId,
    action: 'PUBLISH_ASSESSMENT',
    entityType: 'Assessment',
    entityId: req.params.id,
    ipAddress: req.ip,
  });
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Assessment published successfully', data: result });
});

const archiveAssessment = catchAsync(async (req: Request, res: Response) => {
  const result = await AssessmentService.archiveAssessment(req.user!.userId, req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Assessment archived successfully', data: result });
});

const deleteAssessment = catchAsync(async (req: Request, res: Response) => {
  await AssessmentService.softDeleteAssessment(req.user!.userId, req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Assessment deleted successfully', data: null });
});

export const AssessmentController = {
  createAssessment,
  listMyAssessments,
  getAssessment,
  updateAssessment,
  publishAssessment,
  archiveAssessment,
  deleteAssessment,
};
