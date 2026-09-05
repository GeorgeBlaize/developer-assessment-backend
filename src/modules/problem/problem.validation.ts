import { z } from 'zod';

const mcqOptionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean().optional(),
});

const testCaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
  hidden: z.boolean().optional(),
});

export const createProblemValidation = z.object({
  body: z
    .object({
      type: z.enum(['CODING', 'MCQ', 'WRITTEN']),
      title: z.string({ required_error: 'Title is required' }).min(3).max(200),
      description: z.string({ required_error: 'Description is required' }).min(5),
      marks: z.number().int().positive().optional(),
      order: z.number().int().min(0).optional(),
      languageHint: z.string().optional(),
      starterCode: z.string().optional(),
      testCases: z.array(testCaseSchema).optional(),
      correctAnswerText: z.string().optional(),
      options: z.array(mcqOptionSchema).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.type === 'MCQ') {
        if (!data.options || data.options.length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'MCQ problems require at least 2 options',
            path: ['options'],
          });
        } else if (!data.options.some((o) => o.isCorrect)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'MCQ problems require exactly one correct option',
            path: ['options'],
          });
        }
      }
    }),
});

export const updateProblemValidation = z.object({
  body: z.object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().min(5).optional(),
    marks: z.number().int().positive().optional(),
    order: z.number().int().min(0).optional(),
    languageHint: z.string().optional(),
    starterCode: z.string().optional(),
    testCases: z.array(testCaseSchema).optional(),
    correctAnswerText: z.string().optional(),
    options: z.array(mcqOptionSchema).optional(),
  }),
});
