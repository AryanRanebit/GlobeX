import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Prisma error shape (without importing Prisma to avoid client issues)
interface PrismaError extends Error {
  code?: string;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error({ message: err.message, stack: err.stack, url: req.url, method: req.method });

  if (err instanceof ZodError) {
    res.status(400).json({ success: false, message: 'Validation failed', issues: err.issues });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  const prismaErr = err as PrismaError;
  if (prismaErr.code) {
    switch (prismaErr.code) {
      case 'P2002': res.status(409).json({ success: false, message: 'Record already exists' }); return;
      case 'P2025': res.status(404).json({ success: false, message: 'Record not found' }); return;
      case 'P2003': res.status(400).json({ success: false, message: 'Foreign key constraint failed' }); return;
    }
  }

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
};
