import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validateRequest';
import { respondInvitationValidation } from './invitation.validation';
import { InvitationController } from './invitation.controller';
import { AttemptController } from '../attempt/attempt.controller';

const router = Router();

router.get('/me', authenticate('CANDIDATE'), InvitationController.listMyInvitations);
router.patch(
  '/:id/respond',
  authenticate('CANDIDATE'),
  validateRequest(respondInvitationValidation),
  InvitationController.respondToInvitation,
);
router.post('/:id/start', authenticate('CANDIDATE'), AttemptController.startAttempt);

export const MyInvitationRoutes = router;
