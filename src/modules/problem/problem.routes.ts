import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { validateRequest } from '@/middlewares/validateRequest';
import { createProblemValidation, updateProblemValidation } from './problem.validation';
import { ProblemController } from './problem.controller';

const router = Router({ mergeParams: true });

router.post('/', authenticate('COMPANY'), validateRequest(createProblemValidation), ProblemController.createProblem);
router.get('/', authenticate('COMPANY', 'ADMIN'), ProblemController.listProblems);
router.patch(
  '/:problemId',
  authenticate('COMPANY'),
  validateRequest(updateProblemValidation),
  ProblemController.updateProblem,
);
router.delete('/:problemId', authenticate('COMPANY'), ProblemController.deleteProblem);

export const ProblemRoutes = router;
