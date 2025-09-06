import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
export interface ApiError extends Error {
    statusCode?: number;
    code?: string;
    details?: any;
}
export declare class AppError extends Error implements ApiError {
    statusCode: number;
    code: string;
    details?: any;
    constructor(message: string, statusCode?: number, code?: string, details?: any);
}
export declare const createError: (message: string, statusCode?: number, code?: string, details?: any) => AppError;
export declare const handleZodError: (error: ZodError) => AppError;
export declare const handlePrismaError: (error: Prisma.PrismaClientKnownRequestError) => AppError;
export declare const handleJWTError: (error: any) => AppError;
export declare const errorHandler: (error: Error | ApiError, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
