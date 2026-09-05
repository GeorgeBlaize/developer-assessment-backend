import { z } from 'zod';

export const submitAnswerValidation = z.object({
  body: z
    .object({
      problemId: z.string({ required_error: 'problemId is required' }).uuid('Invalid problemId'),
      answerText: z.string().optional(),
      selectedOptionId: z.string().uuid().optional(),
    })
    .refine((data) => data.answerText !== undefined || data.selectedOptionId !== undefined, {
      message: 'Provide either answerText or selectedOptionId',
      path: ['answerText'],
    }),
});
