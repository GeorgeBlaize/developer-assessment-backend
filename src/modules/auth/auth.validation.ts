import { z } from 'zod';

export const registerValidation = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }).min(2).max(100),
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters'),
    role: z.enum(['COMPANY', 'CANDIDATE'], {
      required_error: 'Role must be COMPANY or CANDIDATE',
    }),
    companyName: z.string().min(2).max(150).optional(),
    phone: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (data.role === 'COMPANY' && !data.companyName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'companyName is required when registering as COMPANY',
        path: ['companyName'],
      });
    }
  }),
});

export const loginValidation = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
    password: z.string({ required_error: 'Password is required' }),
  }),
});

export const googleLoginValidation = z.object({
  body: z.object({
    idToken: z.string({ required_error: 'Google idToken is required' }),
    role: z.enum(['COMPANY', 'CANDIDATE']).optional(),
  }),
});

export const refreshTokenValidation = z.object({
  body: z.object({
    refreshToken: z.string({ required_error: 'refreshToken is required' }),
  }),
});

export const changePasswordValidation = z.object({
  body: z.object({
    oldPassword: z.string({ required_error: 'oldPassword is required' }),
    newPassword: z.string({ required_error: 'newPassword is required' }).min(6),
  }),
});
