import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { AdminService } from './admin.service';
import { AttemptService } from '../attempt/attempt.service';

const listAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const { logs, meta } = await AdminService.listAuditLogs(req.query as never);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Audit logs fetched successfully', data: logs, meta });
});

const getPlatformStats = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminService.getPlatformStats();
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Platform stats fetched successfully', data: result });
});

const sweepExpiredAttempts = catchAsync(async (_req: Request, res: Response) => {
  const result = await AttemptService.sweepExpiredAttempts();
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Expired attempts swept successfully', data: result });
});

export const AdminController = { listAuditLogs, getPlatformStats, sweepExpiredAttempts };
