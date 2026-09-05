import { z } from 'zod';

export const createPlanValidation = z.object({
  body: z.object({
    name: z.enum(['FREE', 'BASIC', 'PRO']),
    price: z.number().min(0),
    durationDays: z.number().int().positive(),
    maxActiveAssessments: z.number().int().positive(),
    maxInvitesPerAssessment: z.number().int().positive(),
    features: z.array(z.string()).optional(),
  }),
});

export const updatePlanValidation = z.object({
  body: z.object({
    price: z.number().min(0).optional(),
    durationDays: z.number().int().positive().optional(),
    maxActiveAssessments: z.number().int().positive().optional(),
    maxInvitesPerAssessment: z.number().int().positive().optional(),
    features: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  }),
});
