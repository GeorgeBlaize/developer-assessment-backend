import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { recordAuditLog } from '../../utils/auditLog';
import { UserService } from './user.service';

const getMe = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getMe(req.user!.userId);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Profile fetched successfully', data: result });
});

const updateMe = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateMe(req.user!.userId, req.user!.role, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Profile updated successfully', data: result });
});

const listUsers = catchAsync(async (req: Request, res: Response) => {
  const { users, meta } = await UserService.listUsers(req.query as never);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Users fetched successfully', data: users, meta });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getUserById(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'User fetched successfully', data: result });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateUserStatus(req.params.id, req.body.isActive);
  await recordAuditLog({
    actorId: req.user!.userId,
    action: 'UPDATE_USER_STATUS',
    entityType: 'User',
    entityId: req.params.id,
    metadata: { isActive: req.body.isActive },
    ipAddress: req.ip,
  });
  sendResponse(res, { statusCode: httpStatus.OK, message: 'User status updated successfully', data: result });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  await UserService.softDeleteUser(req.params.id);
  await recordAuditLog({
    actorId: req.user!.userId,
    action: 'DELETE_USER',
    entityType: 'User',
    entityId: req.params.id,
    ipAddress: req.ip,
  });
  sendResponse(res, { statusCode: httpStatus.OK, message: 'User deleted successfully', data: null });
});

export const UserController = { getMe, updateMe, listUsers, getUserById, updateUserStatus, deleteUser };
