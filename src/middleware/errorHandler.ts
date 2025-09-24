import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      success: false,
      error: {
        message,
        stack: err.stack,
        statusCode,
      },
    });
  } else {
    if (err.isOperational) {
      res.status(statusCode).json({
        success: false,
        error: {
          message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          message: 'Something went wrong!',
        },
      });
    }
  }
};