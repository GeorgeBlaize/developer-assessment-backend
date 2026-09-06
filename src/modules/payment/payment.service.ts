import { randomUUID } from 'crypto';
import httpStatus from 'http-status';
import { prisma } from '../../db/prisma';
import { AppError } from '../../errors/AppError';
import { initiatePayment, validatePayment } from '../../utils/sslcommerz';
import { parsePagination, buildMeta, PaginationQuery } from '../../utils/queryBuilder';

const subscribe = async (userId: string, planId: string) => {
  const companyProfile = await prisma.companyProfile.findUnique({ where: { userId } });
  if (!companyProfile) {
    throw new AppError(httpStatus.FORBIDDEN, 'Only company accounts can subscribe to a plan');
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) {
    throw new AppError(httpStatus.NOT_FOUND, 'Plan not found or inactive');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const tranId = `SUB-${randomUUID()}`;

  const payment = await prisma.payment.create({
    data: {
      companyId: companyProfile.id,
      planId: plan.id,
      amount: plan.price,
      currency: plan.currency,
      status: 'PENDING',
      tranId,
    },
  });

  if (Number(plan.price) === 0) {
    // Free plan: activate immediately without contacting the gateway.
    await activateSubscription(payment.id);
    return { freePlan: true, payment };
  }

  const gatewayResponse = await initiatePayment({
    tranId,
    amount: Number(plan.price),
    currency: plan.currency,
    customerName: user!.name,
    customerEmail: user!.email,
  });

  if (gatewayResponse.status !== 'SUCCESS' || !gatewayResponse.GatewayPageURL) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      gatewayResponse.failedreason || 'Failed to initiate payment with SSLCommerz',
    );
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { gatewayResponse: gatewayResponse as never },
  });

  return { freePlan: false, gatewayPageURL: gatewayResponse.GatewayPageURL, tranId };
};

const activateSubscription = async (paymentId: string) => {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'PAID', validatedAt: new Date() },
      include: { plan: true },
    });

    const startAt = new Date();
    const endsAt = new Date(startAt);
    endsAt.setDate(endsAt.getDate() + payment.plan.durationDays);

    await tx.companyProfile.update({
      where: { id: payment.companyId },
      data: {
        planId: payment.planId,
        subscriptionStatus: 'ACTIVE',
        subscriptionStartAt: startAt,
        subscriptionEndsAt: endsAt,
      },
    });

    return payment;
  });
};

const handleGatewayCallback = async (
  tranId: string,
  valId: string | undefined,
  outcome: 'success' | 'fail' | 'cancel',
) => {
  const payment = await prisma.payment.findUnique({ where: { tranId } });
  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Payment record not found');
  }

  if (payment.status === 'PAID') {
    return payment;
  }

  if (outcome !== 'success') {
    return prisma.payment.update({
      where: { id: payment.id },
      data: { status: outcome === 'cancel' ? 'CANCELLED' : 'FAILED' },
    });
  }

  if (!valId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Missing val_id from SSLCommerz callback');
  }

  const validation = await validatePayment(valId);

  if (
    (validation.status !== 'VALID' && validation.status !== 'VALIDATED') ||
    validation.tran_id !== tranId ||
    Number(validation.amount) !== Number(payment.amount)
  ) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment validation failed');
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { gatewayResponse: validation as never },
  });

  return activateSubscription(payment.id);
};

const listMyPayments = async (userId: string, query: PaginationQuery) => {
  const companyProfile = await prisma.companyProfile.findUnique({ where: { userId } });
  if (!companyProfile) {
    throw new AppError(httpStatus.FORBIDDEN, 'Only company accounts have payment history');
  }

  const { skip, take, page, limit, orderBy } = parsePagination(query);

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { companyId: companyProfile.id },
      include: { plan: true },
      skip,
      take,
      orderBy,
    }),
    prisma.payment.count({ where: { companyId: companyProfile.id } }),
  ]);

  return { payments, meta: buildMeta(page, limit, total) };
};

export const PaymentService = {
  subscribe,
  handleGatewayCallback,
  listMyPayments,
};
