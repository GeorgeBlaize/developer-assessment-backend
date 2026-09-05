import { z } from 'zod';

export const updateMeValidation = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().optional(),
    resumeUrl: z.string().url().optional(),
    skills: z.array(z.string()).optional(),
    companyName: z.string().min(2).max(150).optional(),
    website: z.string().url().optional(),
    industry: z.string().optional(),
  }),
});

export const updateUserStatusValidation = z.object({
  body: z.object({
    isActive: z.boolean({ required_error: 'isActive is required' }),
  }),
});

export const listUsersValidation = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    role: z.enum(['ADMIN', 'COMPANY', 'CANDIDATE']).optional(),
  }),
});
