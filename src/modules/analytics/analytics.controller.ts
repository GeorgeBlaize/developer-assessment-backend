import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '@/utils/catchAsync';
import { sendResponse } from '@/utils/sendResponse';
import { AnalyticsService } from './analytics.service';

const getAssessmentAnalytics = catchAsync(async (req: Request, res: Response) => {
  const result = await AnalyticsService.getAssessmentAnalytics(req.user!.userId, req.user!.role, req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Analytics fetched successfully', data: result });
});

const getCompanyDashboard = catchAsync(async (req: Request, res: Response) => {
  const result = await AnalyticsService.getCompanyDashboard(req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Dashboard fetched successfully', data: result });
});

export const AnalyticsController = { getAssessmentAnalytics, getCompanyDashboard };
