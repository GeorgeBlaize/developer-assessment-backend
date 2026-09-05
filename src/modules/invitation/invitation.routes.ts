import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { validateRequest } from '@/middlewares/validateRequest';
import { createInvitationValidation } from './invitation.validation';
import { InvitationController } from './invitation.controller';

const router = Router({ mergeParams: true });

router.post(
  '/',
  authenticate('COMPANY'),
  validateRequest(createInvitationValidation),
  InvitationController.inviteCandidates,
);
router.get('/', authenticate('COMPANY', 'ADMIN'), InvitationController.listInvitationsForAssessment);

export const InvitationRoutes = router;
