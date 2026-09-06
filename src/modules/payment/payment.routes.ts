import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validateRequest';
import { subscribeValidation } from './payment.validation';
import { PaymentController } from './payment.controller';

const router = Router();

router.post('/subscribe', authenticate('COMPANY'), validateRequest(subscribeValidation), PaymentController.subscribe);
router.get('/', authenticate('COMPANY'), PaymentController.listMyPayments);

// SSLCommerz server-to-server / browser-redirect callbacks (unauthenticated by design).
router.post('/success', PaymentController.success);
router.post('/fail', PaymentController.fail);
router.post('/cancel', PaymentController.cancel);
router.post('/ipn', PaymentController.ipn);

export const PaymentRoutes = router;
