import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { validateRequest } from '@/middlewares/validateRequest';
import { updateMeValidation, updateUserStatusValidation } from './user.validation';
import { UserController } from './user.controller';

const router = Router();

router.get('/me', authenticate(), UserController.getMe);
router.patch('/me', authenticate(), validateRequest(updateMeValidation), UserController.updateMe);

router.get('/', authenticate('ADMIN'), UserController.listUsers);
router.get('/:id', authenticate('ADMIN'), UserController.getUserById);
router.patch(
  '/:id/status',
  authenticate('ADMIN'),
  validateRequest(updateUserStatusValidation),
  UserController.updateUserStatus,
);
router.delete('/:id', authenticate('ADMIN'), UserController.deleteUser);

export const UserRoutes = router;
