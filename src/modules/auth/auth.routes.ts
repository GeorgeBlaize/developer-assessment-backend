import { Router } from 'express';
import { validateRequest } from '@/middlewares/validateRequest';
import { authenticate } from '@/middlewares/auth';
import { authRateLimiter } from '@/middlewares/rateLimiter';
import {
  changePasswordValidation,
  googleLoginValidation,
  loginValidation,
  refreshTokenValidation,
  registerValidation,
} from './auth.validation';
import { AuthController } from './auth.controller';

const router = Router();

router.post('/register', authRateLimiter, validateRequest(registerValidation), AuthController.register);
router.post('/login', authRateLimiter, validateRequest(loginValidation), AuthController.login);
router.post(
  '/google',
  authRateLimiter,
  validateRequest(googleLoginValidation),
  AuthController.googleLogin,
);
router.post(
  '/refresh-token',
  validateRequest(refreshTokenValidation),
  AuthController.refreshToken,
);
router.post('/logout', validateRequest(refreshTokenValidation), AuthController.logout);
router.patch(
  '/change-password',
  authenticate(),
  validateRequest(changePasswordValidation),
  AuthController.changePassword,
);

export const AuthRoutes = router;
