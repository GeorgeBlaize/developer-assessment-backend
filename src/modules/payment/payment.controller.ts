import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '@/utils/catchAsync';
import { sendResponse } from '@/utils/sendResponse';
import { recordAuditLog } from '@/utils/auditLog';
import { PaymentService } from './payment.service';

const subscribe = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.subscribe(req.user!.userId, req.body.planId);
  await recordAuditLog({
    actorId: req.user!.userId,
    action: 'SUBSCRIBE_INITIATE',
    entityType: 'Payment',
    metadata: { planId: req.body.planId },
    ipAddress: req.ip,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: result.freePlan
      ? 'Subscribed to the free plan successfully'
      : 'Payment session created. Redirect the user to gatewayPageURL to complete payment.',
    data: result,
  });
});

const success = catchAsync(async (req: Request, res: Response) => {
  const { tran_id: tranId, val_id: valId } = { ...req.body, ...req.query };
  const payment = await PaymentService.handleGatewayCallback(tranId, valId, 'success');
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Payment successful. Subscription activated.', data: payment });
});

const fail = catchAsync(async (req: Request, res: Response) => {
  const { tran_id: tranId } = { ...req.body, ...req.query };
  const payment = await PaymentService.handleGatewayCallback(tranId, undefined, 'fail');
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Payment failed.', data: payment });
});

const cancel = catchAsync(async (req: Request, res: Response) => {
  const { tran_id: tranId } = { ...req.body, ...req.query };
  const payment = await PaymentService.handleGatewayCallback(tranId, undefined, 'cancel');
  sendResponse(res, { statusCode: httpStatus.OK, message: 'Payment cancelled.', data: payment });
});

const ipn = catchAsync(async (req: Request, res: Response) => {
  const { tran_id: tranId, val_id: valId, status } = { ...req.body, ...req.query };
  const outcome = status === 'VALID' || status === 'VALIDATED' ? 'success' : 'fail';
  await PaymentService.handleGatewayCallback(tranId, valId, outcome);
  sendResponse(res, { statusCode: httpStatus.OK, message: 'IPN processed', data: null });
});

const listMyPayments = catchAsync(async (req: Request, res: Response) => {
  const { payments, meta } = await PaymentService.listMyPayments(req.user!.userId, req.query as never);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Payment history fetched successfully',
    data: payments,
    meta,
  });
});

export const PaymentController = { subscribe, success, fail, cancel, ipn, listMyPayments };
