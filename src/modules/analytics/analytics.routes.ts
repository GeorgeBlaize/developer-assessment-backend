import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { AnalyticsController } from './analytics.controller';

const router = Router();

router.get('/me/dashboard', authenticate('COMPANY'), AnalyticsController.getCompanyDashboard);

export const AnalyticsRoutes = router;
