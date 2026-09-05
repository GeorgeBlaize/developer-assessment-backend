import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { validateRequest } from '@/middlewares/validateRequest';
import { createPlanValidation, updatePlanValidation } from './plan.validation';
import { PlanController } from './plan.controller';

const router = Router();

router.get('/', PlanController.listPlans);
router.post('/', authenticate('ADMIN'), validateRequest(createPlanValidation), PlanController.createPlan);
router.patch(
  '/:id',
  authenticate('ADMIN'),
  validateRequest(updatePlanValidation),
  PlanController.updatePlan,
);

export const PlanRoutes = router;
