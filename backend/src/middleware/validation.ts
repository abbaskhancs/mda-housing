import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { handleZodError } from './errorHandler';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const apiError = handleZodError(error);
        return res.status(apiError.statusCode).json({
          error: apiError.message,
          code: apiError.code,
          details: apiError.details
        });
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const apiError = handleZodError(error);
        return res.status(apiError.statusCode).json({
          error: apiError.message,
          code: apiError.code,
          details: apiError.details
        });
      }
      next(error);
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const apiError = handleZodError(error);
        return res.status(apiError.statusCode).json({
          error: apiError.message,
          code: apiError.code,
          details: apiError.details
        });
      }
      next(error);
    }
  };
};
