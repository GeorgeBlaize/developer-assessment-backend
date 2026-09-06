import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validateRequest';
import { gradeSubmissionValidation } from './submission.validation';
import { SubmissionController } from './submission.controller';

const router = Router({ mergeParams: true });

router.get('/', authenticate('COMPANY', 'ADMIN'), SubmissionController.listSubmissionsForAssessment);
router.patch(
  '/:submissionId/grade',
  authenticate('COMPANY'),
  validateRequest(gradeSubmissionValidation),
  SubmissionController.gradeSubmission,
);

export const SubmissionRoutes = router;
