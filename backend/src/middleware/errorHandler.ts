import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export interface CustomError extends Error {
  status?: number;
  code?: string;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error({
    error: err,
    status,
    message,
    path: req.path,
    method: req.method,
  });

  res.status(status).json({
    error: {
      message,
      status,
      code: err.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    },
  });
};

export class ApiError extends Error implements CustomError {
  status: number;
  code: string;

  constructor(message: string, status = 500, code = 'ERROR') {
    super(message);
    this.status = status;
    this.code = code;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
