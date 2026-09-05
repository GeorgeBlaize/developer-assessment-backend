import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { validateRequest } from '@/middlewares/validateRequest';
import {
  createAssessmentValidation,
  updateAssessmentValidation,
} from './assessment.validation';
import { AssessmentController } from './assessment.controller';
import { ProblemRoutes } from '../problem/problem.routes';
import { InvitationRoutes } from '../invitation/invitation.routes';
import { SubmissionRoutes } from '../submission/submission.routes';
import { AnalyticsController } from '../analytics/analytics.controller';

const router = Router();

router.post(
  '/',
  authenticate('COMPANY'),
  validateRequest(createAssessmentValidation),
  AssessmentController.createAssessment,
);
router.get('/', authenticate('COMPANY'), AssessmentController.listMyAssessments);
router.get('/:id', authenticate('COMPANY', 'ADMIN'), AssessmentController.getAssessment);
router.patch(
  '/:id',
  authenticate('COMPANY'),
  validateRequest(updateAssessmentValidation),
  AssessmentController.updateAssessment,
);
router.patch('/:id/publish', authenticate('COMPANY'), AssessmentController.publishAssessment);
router.patch('/:id/archive', authenticate('COMPANY'), AssessmentController.archiveAssessment);
router.delete('/:id', authenticate('COMPANY'), AssessmentController.deleteAssessment);
router.get('/:id/analytics', authenticate('COMPANY', 'ADMIN'), AnalyticsController.getAssessmentAnalytics);

router.use('/:assessmentId/problems', ProblemRoutes);
router.use('/:assessmentId/invitations', InvitationRoutes);
router.use('/:assessmentId/submissions', SubmissionRoutes);

export const AssessmentRoutes = router;
