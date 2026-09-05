import { z } from 'zod';

export const createAssessmentValidation = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }).min(3).max(200),
    description: z.string({ required_error: 'Description is required' }).min(10),
    durationMinutes: z.number({ required_error: 'durationMinutes is required' }).int().positive(),
    passingScore: z.number().int().min(0).optional(),
    startWindow: z.coerce.date().optional(),
    endWindow: z.coerce.date().optional(),
  }),
});

export const updateAssessmentValidation = z.object({
  body: z.object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().min(10).optional(),
    durationMinutes: z.number().int().positive().optional(),
    passingScore: z.number().int().min(0).optional(),
    startWindow: z.coerce.date().optional(),
    endWindow: z.coerce.date().optional(),
  }),
});

export const listAssessmentsValidation = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  }),
});
