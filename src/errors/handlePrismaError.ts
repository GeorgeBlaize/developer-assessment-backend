import { Prisma } from '@prisma/client';

interface GenericErrorItem {
  path: string;
  message: string;
}

export const handlePrismaError = (
  err: Prisma.PrismaClientKnownRequestError,
) => {
  let statusCode = 400;
  let message = 'Database error';
  const errors: GenericErrorItem[] = [];

  switch (err.code) {
    case 'P2002': {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') || 'field';
      statusCode = 409;
      message = `A record with this ${target} already exists`;
      errors.push({ path: target, message: `${target} must be unique` });
      break;
    }
    case 'P2025': {
      statusCode = 404;
      message = 'Requested record was not found';
      errors.push({ path: '', message: (err.meta?.cause as string) || message });
      break;
    }
    case 'P2003': {
      statusCode = 400;
      message = 'Invalid reference to a related record';
      errors.push({ path: (err.meta?.field_name as string) || '', message });
      break;
    }
    default: {
      message = err.message;
    }
  }

  return { statusCode, message, errors };
};
