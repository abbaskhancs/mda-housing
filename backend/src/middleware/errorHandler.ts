import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../config/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class AppError extends Error implements ApiError {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = (message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: any): AppError => {
  return new AppError(message, statusCode, code, details);
};

export const handleZodError = (error: ZodError) => {
  const details = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }));

  return createError(
    'Validation failed',
    400,
    'VALIDATION_ERROR',
    details
  );
};

export const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError) => {
  switch (error.code) {
    case 'P2002':
      const field = error.meta?.target as string[] | undefined;
      return createError(
        `Duplicate entry for ${field ? field.join(', ') : 'field'}`,
        409,
        'DUPLICATE_ENTRY',
        { field: field?.[0] }
      );
    
    case 'P2025':
      return createError(
        'Record not found',
        404,
        'RECORD_NOT_FOUND'
      );
    
    case 'P2003':
      return createError(
        'Foreign key constraint failed',
        400,
        'FOREIGN_KEY_CONSTRAINT'
      );
    
    case 'P2014':
      return createError(
        'Invalid relation operation',
        400,
        'INVALID_RELATION'
      );
    
    default:
      return createError(
        'Database operation failed',
        500,
        'DATABASE_ERROR',
        { code: error.code }
      );
  }
};

export const handleJWTError = (error: any) => {
  if (error.name === 'JsonWebTokenError') {
    return createError('Invalid token', 401, 'INVALID_TOKEN');
  }
  
  if (error.name === 'TokenExpiredError') {
    return createError('Token expired', 401, 'TOKEN_EXPIRED');
  }
  
  return createError('Authentication failed', 401, 'AUTH_ERROR');
};

export const errorHandler = (
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let apiError: ApiError;

  // Log the error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Handle different types of errors
  if (error instanceof ZodError) {
    apiError = handleZodError(error);
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    apiError = handlePrismaError(error);
  } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    apiError = createError('Database operation failed', 500, 'DATABASE_ERROR');
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    apiError = createError('Invalid data provided', 400, 'VALIDATION_ERROR');
  } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    apiError = handleJWTError(error);
  } else if (error instanceof AppError) {
    apiError = error;
  } else {
    // Generic error
    apiError = createError(
      process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      500,
      'INTERNAL_ERROR'
    );
  }

  // Send error response
  res.status(apiError.statusCode || 500).json({
    error: apiError.message,
    code: apiError.code,
    ...(apiError.details && { details: apiError.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
