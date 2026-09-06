import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { ProblemService } from './problem.service';

const createProblem = catchAsync(async (req: Request, res: Response) => {
  const result = await ProblemService.createProblem(req.user!.userId, req.params.assessmentId, req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, message: 'Problem added successfully', data: result });
});

const listProblems = catchAsync(async (req: Request, res: Response) => {
  const result = await ProblemService.listProblems(req.params.assessmentId);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Problems fetched successfully', data: result });
});

const updateProblem = catchAsync(async (req: Request, res: Response) => {
  const result = await ProblemService.updateProblem(
    req.user!.userId,
    req.params.assessmentId,
    req.params.problemId,
    req.body,
  );
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Problem updated successfully', data: result });
});

const deleteProblem = catchAsync(async (req: Request, res: Response) => {
  await ProblemService.deleteProblem(req.user!.userId, req.params.assessmentId, req.params.problemId);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Problem deleted successfully', data: null });
});

export const ProblemController = { createProblem, listProblems, updateProblem, deleteProblem };
