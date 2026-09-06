import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { AdminController } from './admin.controller';

const router = Router();

router.get('/audit-logs', authenticate('ADMIN'), AdminController.listAuditLogs);
router.get('/stats', authenticate('ADMIN'), AdminController.getPlatformStats);
router.post('/attempts/sweep-expired', authenticate('ADMIN'), AdminController.sweepExpiredAttempts);

export const AdminRoutes = router;
