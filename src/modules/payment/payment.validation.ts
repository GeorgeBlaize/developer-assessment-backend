import { z } from 'zod';

export const subscribeValidation = z.object({
  body: z.object({
    planId: z.string({ required_error: 'planId is required' }).uuid('Invalid planId'),
  }),
});
