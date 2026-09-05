import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { AppError } from '@/errors/AppError';

const listPlans = async () => {
  return prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } });
};

const createPlan = async (data: Prisma.PlanCreateInput) => {
  const existing = await prisma.plan.findUnique({ where: { name: data.name } });
  if (existing) {
    throw new AppError(httpStatus.CONFLICT, `A plan named ${data.name} already exists`);
  }
  return prisma.plan.create({ data });
};

const updatePlan = async (id: string, data: Prisma.PlanUpdateInput) => {
  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) {
    throw new AppError(httpStatus.NOT_FOUND, 'Plan not found');
  }
  return prisma.plan.update({ where: { id }, data });
};

export const PlanService = { listPlans, createPlan, updatePlan };
