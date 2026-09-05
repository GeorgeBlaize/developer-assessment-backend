import { z } from 'zod';

export const gradeSubmissionValidation = z.object({
  body: z.object({
    awardedMarks: z.number({ required_error: 'awardedMarks is required' }).int().min(0),
    feedback: z.string().max(2000).optional(),
  }),
});
