import { z } from 'zod';

export const createInvitationValidation = z.object({
  body: z.object({
    emails: z
      .array(z.string().email('Invalid email address'))
      .min(1, 'At least one candidate email is required'),
    expiresInDays: z.number().int().positive().max(90).optional(),
  }),
});

export const respondInvitationValidation = z.object({
  body: z.object({
    action: z.enum(['ACCEPT', 'DECLINE']),
  }),
});
