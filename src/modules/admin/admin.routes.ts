import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { AdminController } from './admin.controller';

const router = Router();

router.get('/audit-logs', authenticate('ADMIN'), AdminController.listAuditLogs);
router.get('/stats', authenticate('ADMIN'), AdminController.getPlatformStats);

export const AdminRoutes = router;
