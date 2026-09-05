import { ZodError } from 'zod';

interface GenericErrorItem {
  path: string;
  message: string;
}

export const handleZodError = (err: ZodError) => {
  const errors: GenericErrorItem[] = err.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

  return {
    statusCode: 400,
    message: 'Validation error',
    errors,
  };
};
