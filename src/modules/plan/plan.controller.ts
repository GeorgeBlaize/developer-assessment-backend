import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { PlanService } from './plan.service';

const listPlans = catchAsync(async (_req: Request, res: Response) => {
  const result = await PlanService.listPlans();
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Plans fetched successfully', data: result });
});

const createPlan = catchAsync(async (req: Request, res: Response) => {
  const result = await PlanService.createPlan(req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, message: 'Plan created successfully', data: result });
});

const updatePlan = catchAsync(async (req: Request, res: Response) => {
  const result = await PlanService.updatePlan(req.params.id, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Plan updated successfully', data: result });
});

export const PlanController = { listPlans, createPlan, updatePlan };
