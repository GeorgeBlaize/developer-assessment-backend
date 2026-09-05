import { Router } from 'express';
import { AuthRoutes } from '@/modules/auth/auth.routes';
import { UserRoutes } from '@/modules/user/user.routes';
import { PlanRoutes } from '@/modules/plan/plan.routes';
import { PaymentRoutes } from '@/modules/payment/payment.routes';
import { AssessmentRoutes } from '@/modules/assessment/assessment.routes';
import { MyInvitationRoutes } from '@/modules/invitation/myInvitation.routes';
import { AttemptRoutes } from '@/modules/attempt/attempt.routes';
import { AnalyticsRoutes } from '@/modules/analytics/analytics.routes';
import { AdminRoutes } from '@/modules/admin/admin.routes';

const router = Router();

const moduleRoutes = [
  { path: '/auth', route: AuthRoutes },
  { path: '/users', route: UserRoutes },
  { path: '/plans', route: PlanRoutes },
  { path: '/payments', route: PaymentRoutes },
  { path: '/assessments', route: AssessmentRoutes },
  { path: '/invitations', route: MyInvitationRoutes },
  { path: '/attempts', route: AttemptRoutes },
  { path: '/companies', route: AnalyticsRoutes },
  { path: '/admin', route: AdminRoutes },
];

moduleRoutes.forEach(({ path, route }) => router.use(path, route));

export const routes = router;
