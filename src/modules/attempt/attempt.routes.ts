import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { validateRequest } from '@/middlewares/validateRequest';
import { submitAnswerValidation } from './attempt.validation';
import { AttemptController } from './attempt.controller';

const router = Router();

router.get('/', authenticate('CANDIDATE'), AttemptController.listMyAttempts);
router.get('/:id', authenticate('CANDIDATE'), AttemptController.getAttempt);
router.post('/:id/submit', authenticate('CANDIDATE'), validateRequest(submitAnswerValidation), AttemptController.submitAnswer);
router.post('/:id/finish', authenticate('CANDIDATE'), AttemptController.finishAttempt);

export const AttemptRoutes = router;
