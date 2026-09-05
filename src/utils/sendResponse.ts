import { Response } from 'express';

interface Meta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

interface SuccessPayload<T> {
  statusCode: number;
  message: string;
  data?: T;
  meta?: Meta;
}

export const sendResponse = <T>(res: Response, payload: SuccessPayload<T>) => {
  res.status(payload.statusCode).json({
    success: true,
    message: payload.message,
    meta: payload.meta,
    data: payload.data ?? null,
  });
};
