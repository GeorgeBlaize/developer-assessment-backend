import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { recordAuditLog } from '../../utils/auditLog';
import { AuthService } from './auth.service';

const register = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.register(req.body);
  await recordAuditLog({
    actorId: result.user.id,
    action: 'REGISTER',
    entityType: 'User',
    entityId: result.user.id,
    ipAddress: req.ip,
  });
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Account created successfully',
    data: result,
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password);
  await recordAuditLog({
    actorId: result.user.id,
    action: 'LOGIN',
    entityType: 'User',
    entityId: result.user.id,
    ipAddress: req.ip,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Logged in successfully',
    data: result,
  });
});

const googleLogin = catchAsync(async (req: Request, res: Response) => {
  const { idToken, role } = req.body;
  const result = await AuthService.googleLogin(idToken, role);
  await recordAuditLog({
    actorId: result.user.id,
    action: 'LOGIN_GOOGLE',
    entityType: 'User',
    entityId: result.user.id,
    ipAddress: req.ip,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Logged in with Google successfully',
    data: result,
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body;
  const result = await AuthService.refreshAuthToken(token);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Access token refreshed successfully',
    data: result,
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body;
  await AuthService.logout(token);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Logged out successfully',
    data: null,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  await AuthService.changePassword(req.user!.userId, oldPassword, newPassword);
  await recordAuditLog({
    actorId: req.user!.userId,
    action: 'CHANGE_PASSWORD',
    entityType: 'User',
    entityId: req.user!.userId,
    ipAddress: req.ip,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Password changed successfully',
    data: null,
  });
});

export const AuthController = {
  register,
  login,
  googleLogin,
  refreshToken,
  logout,
  changePassword,
};
